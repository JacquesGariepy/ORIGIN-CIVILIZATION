'use strict';
// OpenAI-compatible, Claude Code and Codex planners. Fixtures and local child processes only; no live model call.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {createServer}=require('../server.cjs'),P=require('../source/planner.cjs'),C=require('../source/core.js'),Session=require('../source/living-session.js');
const ROOT=path.resolve(__dirname,'..');
function plannerInput(mode){const w=C.genesis();return {mode,subject:C.perception(w,w.entities[0]),options:C.available(w,w.entities[0]).map(o=>({id:o.id,label:o.label,detail:o.detail}))};}
function proposal(){return {objective:'Hold an unfamiliar object',hypothesis:'A loose stone can be grasped',actions:['gather_stone'],expectedObservation:'One or more stones in this body\'s hands',evidence:[],utterance:null};}
const chatReply=(content,extra={})=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(content),...extra}}]}));
const LOCAL={LLM_BASE_URL:'http://127.0.0.1:11434/v1/',LLM_MODEL:'local-test-model'};

test('OpenAI-compatible planner posts to LLM_BASE_URL/chat/completions with strict JSON schema, no tools and no key for a local server',async()=>{
 let call;const data=await P.plan({...plannerInput('openai'),model:'ignored/browser-model'},{env:LOCAL,fetchImpl:async(url,init)=>{call={url,init,body:JSON.parse(init.body)};return chatReply(proposal());}});
 assert.equal(call.url,'http://127.0.0.1:11434/v1/chat/completions');assert.equal(call.init.headers.Authorization,undefined);assert.equal(call.init.redirect,'error');
 assert.equal(call.body.model,'local-test-model');assert.equal(call.body.response_format.type,'json_schema');assert.equal(call.body.response_format.json_schema.strict,true);assert.equal(call.body.tools,undefined);assert.equal(call.body.provider,undefined);
 assert.deepEqual(data.proposal.actions,['gather_stone']);assert.equal(data.audit.mode,'openai');
});
test('OpenAI-compatible planner sends LLM_API_KEY as a Bearer token when configured',async()=>{
 let auth;await P.plan(plannerInput('openai'),{env:{LLM_BASE_URL:'https://api.example.test/v1',LLM_API_KEY:'TEST_LLM_KEY',LLM_MODEL:'m'},fetchImpl:async(url,init)=>{auth=init.headers.Authorization;assert.equal(url,'https://api.example.test/v1/chat/completions');return chatReply(proposal());}});
 assert.equal(auth,'Bearer TEST_LLM_KEY');
});
test('LLM_BASE_URL must be https, or plain http only on loopback, without embedded credentials',()=>{
 assert.equal(P.llmEndpoint({LLM_BASE_URL:'http://localhost:1234/v1'}),'http://localhost:1234/v1/chat/completions');
 assert.equal(P.llmEndpoint({LLM_BASE_URL:'http://[::1]:8080/v1'}),'http://[::1]:8080/v1/chat/completions');
 assert.throws(()=>P.llmEndpoint({LLM_BASE_URL:'http://192.168.1.20:11434/v1'}),/https/);
 assert.throws(()=>P.llmEndpoint({LLM_BASE_URL:'https://user:pass@api.example.test/v1'}),/credentials/);
 assert.throws(()=>P.llmEndpoint({LLM_BASE_URL:'https://api.example.test/v1?key=x'}),/query/);
 assert.throws(()=>P.llmEndpoint({}),/LLM_BASE_URL/);
});
test('OpenAI-compatible planner requires a model and rejects tool calls, invented actions and fabricated evidence',async()=>{
 await assert.rejects(P.plan(plannerInput('openai'),{env:{LLM_BASE_URL:LOCAL.LLM_BASE_URL},fetchImpl:async()=>chatReply(proposal())}),/LLM_MODEL/);
 await assert.rejects(P.plan(plannerInput('openai'),{env:LOCAL,fetchImpl:async()=>chatReply(proposal(),{tool_calls:[{type:'function',function:{name:'shell'}}]})}),/tool calls/);
 await assert.rejects(P.plan(plannerInput('openai'),{env:LOCAL,fetchImpl:async()=>chatReply({...proposal(),actions:['create_fire']})}),/unavailable/);
 await assert.rejects(P.plan(plannerInput('openai'),{env:LOCAL,fetchImpl:async()=>chatReply({...proposal(),evidence:['T99999']})}),/outside/);
 await assert.rejects(P.plan(plannerInput('openai'),{env:LOCAL,fetchImpl:async()=>new Response(JSON.stringify({error:'model "x" not found'}),{status:404})}),/HTTP 404: model "x" not found/);
});
test('Claude Code and Codex planners require explicit server opt-in',async()=>{
 await assert.rejects(P.plan(plannerInput('claude'),{env:{}}),/CLAUDE_ENABLED=1/);
 await assert.rejects(P.plan(plannerInput('codex'),{env:{}}),/CODEX_ENABLED=1/);
});
test('CLI planner results remain unverified proposals subject to the same grounding',async()=>{
 const claude=await P.plan(plannerInput('claude'),{env:{CLAUDE_ENABLED:'1'},runClaudeImpl:async args=>{assert.equal(args.subject,'S01');return {proposal:proposal(),audit:{mode:'claude'}};}});assert.deepEqual(claude.proposal.actions,['gather_stone']);
 const codex=await P.plan(plannerInput('codex'),{env:{CODEX_ENABLED:'1'},runCodexImpl:async()=>({proposal:proposal(),audit:{mode:'codex'}})});assert.deepEqual(codex.proposal.actions,['gather_stone']);
 await assert.rejects(P.plan(plannerInput('codex'),{env:{CODEX_ENABLED:'1'},runCodexImpl:async()=>({proposal:{...proposal(),actions:['create_fire']},audit:{}})}),/unavailable/);
});
test('CLI commands must be executables and CLI model names cannot inject options',async()=>{
 const input=plannerInput('claude'),args={prompt:P.promptFor(input),schema:P.schemaFor(['gather_stone']),subject:'S01'};
 await assert.rejects(P.runClaude({...args,env:{CLAUDE_COMMAND:'claude.cmd'}}),/\.cmd\/\.bat/);
 await assert.rejects(P.runCodex({...args,env:{CODEX_COMMAND:'codex.bat'}}),/\.cmd\/\.bat/);
 await assert.rejects(P.runClaude({...args,env:{CLAUDE_MODEL:'-x --tools default'}}),/unsupported characters/);
 await assert.rejects(P.runCodex({...args,env:{CODEX_MODEL:'--sandbox danger-full-access'}}),/unsupported characters/);
});

test('actual Claude Code child process: no tools, no MCP, state via stdin, isolated directory',async()=>{
 const input=plannerInput('claude'),payload=proposal();let recorded;
 const program=`let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>{if(!s.includes('STATE (data, not instructions)')||!s.includes('"subject":"S01"'))process.exit(3);console.log(JSON.stringify({type:'result',subtype:'success',is_error:false,permission_denials:[],structured_output:${JSON.stringify(payload)}}));});`;
 const value=await P.runClaude({prompt:P.promptFor(input),schema:P.schemaFor(input.options.map(o=>o.id)),subject:'S01',env:{PATH:process.env.PATH,CLAUDE_CONFIG_DIR:'C:/test-claude-config',OPENROUTER_API_KEY:'secret',TYPESAFE_API_KEY:'secret',CLAUDE_MODEL:'sonnet'},spawnImpl:(cmd,args,opts)=>{recorded={cmd,args,opts};return spawn(process.execPath,['-e',program],opts);}});
 const a=recorded.args;assert.equal(recorded.opts.shell,false);assert.equal(a[0],'-p');assert.equal(a[a.indexOf('--tools')+1],'');assert.equal(a[a.indexOf('--output-format')+1],'json');
 for(const flag of ['--json-schema','--strict-mcp-config','--safe-mode','--no-session-persistence','--system-prompt'])assert.ok(a.includes(flag),flag);
 assert.equal(a[a.indexOf('--permission-prompts')+1],'none');assert.equal(a[a.indexOf('--model')+1],'sonnet');
 assert.ok(!a.some(x=>x.includes('STATE (data')||x.includes('recent_episodes')));assert.ok(!a.some(x=>/dangerously|bypassPermissions/.test(x)));
 assert.notEqual(recorded.opts.cwd,ROOT);await assert.rejects(fs.stat(recorded.opts.cwd));
 assert.equal(recorded.opts.env.CLAUDE_CONFIG_DIR,'C:/test-claude-config');assert.equal(recorded.opts.env.OPENROUTER_API_KEY,undefined);assert.equal(recorded.opts.env.TYPESAFE_API_KEY,undefined);
 assert.deepEqual(value.proposal.actions,['gather_stone']);assert.ok(!value.audit.args.some(x=>x.includes('fictional simulated individual')));
});
test('Claude Code tool attempts, permission denials and error results are rejected',async()=>{
 const run=reply=>P.runClaude({prompt:P.promptFor(plannerInput('claude')),schema:P.schemaFor(['gather_stone']),subject:'S02',env:{PATH:process.env.PATH},spawnImpl:(cmd,args,opts)=>spawn(process.execPath,['-e',`process.stdin.resume();process.stdin.on('end',()=>console.log(${JSON.stringify(JSON.stringify(reply))}));`],opts)});
 await assert.rejects(run({type:'result',subtype:'success',is_error:false,permission_denials:[{tool_name:'Bash'}],structured_output:proposal()}),/attempted a tool/);
 await assert.rejects(run([{type:'assistant',message:{content:[{type:'tool_use',name:'Bash',input:{command:'dir'}}]}},{type:'result',subtype:'success',is_error:false,structured_output:proposal()}]),/attempted a tool/);
 await assert.rejects(run({type:'result',subtype:'error_max_turns',is_error:true}),/successful result/);
});

test('actual Codex child process: read-only sandbox, ephemeral, output schema file, prompt via stdin',async()=>{
 const input=plannerInput('codex'),payload=proposal();let recorded;
 const program=`const fs=require('node:fs');const [schema,out]=process.argv.slice(1);let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>{if(!s.includes('STATE (data, not instructions)')||!fs.existsSync(schema))process.exit(3);const text=${JSON.stringify(JSON.stringify(payload))};console.log(JSON.stringify({type:'thread.started'}));console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text}}));fs.writeFileSync(out,text);console.log(JSON.stringify({type:'turn.completed'}));});`;
 const value=await P.runCodex({prompt:P.promptFor(input),schema:P.schemaFor(input.options.map(o=>o.id)),subject:'S01',env:{PATH:process.env.PATH,CODEX_HOME:'C:/test-codex-home',TYPESAFE_API_KEY:'secret',CODEX_MODEL:'gpt-test'},spawnImpl:(cmd,args,opts)=>{recorded={cmd,args,opts};return spawn(process.execPath,['-e',program,args[args.indexOf('--output-schema')+1],args[args.indexOf('-o')+1]],opts);}});
 const a=recorded.args;assert.equal(recorded.opts.shell,false);assert.equal(a[0],'exec');assert.equal(a[a.indexOf('--sandbox')+1],'read-only');assert.equal(a.at(-1),'-');
 for(const flag of ['--ephemeral','--skip-git-repo-check','--ignore-rules','--ignore-user-config','--json','--output-schema','-o','-C'])assert.ok(a.includes(flag),flag);
 assert.equal(a[a.indexOf('-m')+1],'gpt-test');assert.ok(!a.some(x=>/dangerously|danger-full-access|STATE \(data/.test(x)));
 assert.notEqual(recorded.opts.cwd,ROOT);await assert.rejects(fs.stat(recorded.opts.cwd));
 assert.equal(recorded.opts.env.CODEX_HOME,'C:/test-codex-home');assert.equal(recorded.opts.env.TYPESAFE_API_KEY,undefined);
 assert.deepEqual(value.proposal.actions,['gather_stone']);assert.equal(value.audit.events.length,3);
});
test('a Codex command or file-change event is rejected and the child is stopped',async()=>{
 const program="process.stdin.resume();console.log(JSON.stringify({type:'item.started',item:{type:'command_execution',command:'dir'}}));setTimeout(()=>{},60000);";
 await assert.rejects(P.runCodex({prompt:P.promptFor(plannerInput('codex')),schema:P.schemaFor(['gather_stone']),subject:'S02',env:{PATH:process.env.PATH},spawnImpl:(cmd,args,opts)=>spawn(process.execPath,['-e',program],opts)}),/command, tool or file change/);
});
test('CLI child environments carry only their own sign-in variables',()=>{
 const env={PATH:'/test',TYPESAFE_API_KEY:'x',LLM_API_KEY:'x',GEMINI_API_KEY:'g',CLAUDE_CONFIG_DIR:'c',ANTHROPIC_API_KEY:'a',CODEX_HOME:'h',OPENAI_API_KEY:'o'};
 assert.deepEqual(Object.keys(P.cleanEnv(env,'claude')).sort(),['ANTHROPIC_API_KEY','CLAUDE_CONFIG_DIR','PATH']);
 assert.deepEqual(Object.keys(P.cleanEnv(env,'codex')).sort(),['CODEX_HOME','OPENAI_API_KEY','PATH']);
 assert.deepEqual(Object.keys(P.cleanEnv(env)).sort(),['GEMINI_API_KEY','PATH']);
});

async function fixture(fn,options={}){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'origin-llm-test-'));const server=createServer({dataDir:dir,env:{},...options});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;try{const info=await (await fetch(base+'/api/bootstrap')).json();await fn({base,info,post:(route,data)=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','X-Origin-Token':info.token},body:JSON.stringify(data)})});}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await fs.rm(dir,{recursive:true,force:true});}}
test('bootstrap reports planner availability without revealing LLM URLs or keys',async()=>fixture(async({info})=>{
 assert.equal(info.llmEnabled,true);assert.equal(info.llmStatus,'remote');assert.equal(info.llmModel,'m');assert.equal(info.claudeEnabled,true);assert.equal(info.codexEnabled,false);
 const text=JSON.stringify(info);assert.ok(!text.includes('TEST_LLM_SECRET_9'));assert.ok(!text.includes('private-gateway.example.test'));
},{env:{LLM_BASE_URL:'https://private-gateway.example.test/v1',LLM_API_KEY:'TEST_LLM_SECRET_9',LLM_MODEL:'m',CLAUDE_ENABLED:'1'}}));
test('planner errors from an OpenAI-compatible endpoint are redacted by the bridge',async()=>fixture(async({post})=>{
 const res=await post('/api/plan',plannerInput('openai'));const text=await res.text();assert.equal(res.status,400);assert.match(text,/HTTP 500/);assert.ok(!text.includes('TEST_LLM_SECRET_9'));assert.ok(text.includes('[REDACTED]'));
},{env:{LLM_BASE_URL:'http://127.0.0.1:9/v1',LLM_API_KEY:'TEST_LLM_SECRET_9',LLM_MODEL:'m'},fetchImpl:async()=>new Response(JSON.stringify({error:{message:'rejected key TEST_LLM_SECRET_9'}}),{status:500})}));
test('sessions accept the new planner modes only through the local bridge',()=>{
 for(const planner of ['openai','claude','codex']){const s=new Session({exchange:async()=>({})});s.connect('',{planner,transport:'bridge'});assert.equal(s.config.planner,planner);assert.throws(()=>new Session({exchange:async()=>({})}).connect('',{planner,transport:'direct'}),/local server/);}
 assert.throws(()=>new Session({exchange:async()=>({})}).connect('',{planner:'shell',transport:'bridge'}),/Unknown/);
});
