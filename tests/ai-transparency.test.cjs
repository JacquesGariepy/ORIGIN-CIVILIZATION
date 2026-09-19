'use strict';
// Live AI transparency and explicit budgets. Fixtures, local stand-in processes and temporary directories only: no live model call, nothing written to data/.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const Session=require('../source/living-session.js'),P=require('../source/planner.cjs'),C=require('../source/core.js');
const {WorldService}=require('../source/world-service.cjs'),{createServer}=require('../server.cjs');
const KEY='TEST-ONLY-TRANSPARENCY-KEY',LLM_KEY='TEST-ONLY-LLM-KEY-123';
// A spread distribution (0.7 on the choice) so probability bars and confidence are testable.
function answer(req){return {model:'jev-TEST-FIXTURE',answers:Object.fromEntries(Object.entries(req.questions).map(([k,q])=>{const ids=Object.keys(q.criteria),choice=ids.includes('rest')?'rest':ids[0],rest=ids.length>1?.3/(ids.length-1):0;return [k,{type:'choice',choice,confidence:ids.length>1?.7:1,probabilities:Object.fromEntries(ids.map(x=>[x,x===choice?(ids.length>1?.7:1):rest]))}];})),usage:{input_tokens:3,output_tokens:2}};}
function proposal(request){const ids=request.options.map(o=>o.id);return {objective:'Recover energy',hypothesis:'Resting restores energy',actions:[ids.includes('rest')?'rest':ids[0]],expectedObservation:'Higher energy',evidence:[],utterance:null};}
const wait=async cond=>{const until=Date.now()+4000;while(!cond()&&Date.now()<until)await new Promise(r=>setTimeout(r,10));assert.ok(cond(),'Timed out waiting for an explicit condition');};
const plannerInput=mode=>{const w=C.genesis();return {mode,subject:C.perception(w,w.entities[0]),options:C.available(w,w.entities[0]).map(o=>({id:o.id,label:o.label,detail:o.detail}))};};
const stone={objective:'Hold a stone',hypothesis:'A loose stone can be grasped',actions:['gather_stone'],expectedObservation:'A stone in hand',evidence:[],utterance:null};

test('Jev and planner rows keep the request, probabilities, verdict and latency, and link Jev\'s choice to the proposal',async()=>{
 let planned=0;const s=new Session({exchange:async req=>answer(req),propose:async request=>{planned++;return {ok:true,status:200,json:async()=>({proposal:proposal(request),audit:{mode:'codex',model:'codex-test',prompt:'PROMPT TEXT',args:['exec','-'],events:[{type:'thread.started'}],stderr:'',verdict:{accepted:true,stage:'grounding'}}})};}});
 s.connect('',{transport:'bridge',planner:'codex',cap:200,plannerCap:20});s.running=true;await s.planCohort();s.pause();
 const plans=s.log.filter(r=>r.type==='planner'),jev=s.log.filter(r=>r.type==='request');assert.ok(planned>0);assert.equal(plans.length,planned);
 const pr=plans[0];assert.equal(pr.outcome,'ok');assert.equal(pr.engine,'codex');assert.equal(pr.model,'codex-test');assert.ok(Number.isFinite(pr.latencyMs));assert.equal(pr.response.audit.prompt,'PROMPT TEXT');assert.equal(pr.verdict.accepted,true);assert.ok(pr.jevChoices.length>=1);
 const action=s.aiRow(pr.jevChoices[0].receipt);assert.equal(action.plannerProposal.receipt,pr.id);assert.equal(action.plannerProposal.matched,pr.response.proposal.actions.includes(action.response.answers.action.choice));
 for(const r of jev){assert.equal(r.outcome,'ok');assert.equal(r.validation.valid,true);assert.ok(Number.isFinite(r.latencyMs));assert.ok(r.applied||r.notApplied,'every valid row says whether it was applied');}
 const q=Session.aiDetail(action).questions.find(q=>q.id==='action');assert.ok(q.options.length>1);assert.equal(q.options[0].chosen,true);assert.equal(q.options[0].p,.7);assert.equal(q.confidence,.7);assert.ok(q.instructions.length>10);
 const pd=Session.aiDetail(pr);assert.equal(pd.planner.prompt,'PROMPT TEXT');assert.equal(pd.planner.engine,'Codex');assert.deepEqual(pd.planner.proposal.actions,pr.response.proposal.actions);assert.ok(pd.planner.jevChoices.length>=1);
 const summary=Session.aiSummary(action);assert.match(summary.headline,/^action: /);assert.equal(summary.tokens,5);assert.equal(summary.engine,'TypeSafe Jev');
});

test('the live feed shows pending calls at dispatch, then only rows changed after the cursor',async()=>{
 let release;const gate=new Promise(r=>release=r);const s=new Session({exchange:async req=>{await gate;return answer(req);}});s.connect('',{transport:'direct',cap:200});
 assert.equal(s.aiFeed(0).rows.length,0);s.running=true;const run=s.planCohort();await wait(()=>s.log.some(r=>r.type==='request'));
 const pending=s.aiFeed(0);assert.ok(pending.rows.length>0);assert.ok(pending.rows.every(r=>r.status==='pending'&&r.kind==='jev'&&/Waiting for Jev/.test(r.headline)));assert.ok(pending.counters.jev.pending>0);
 assert.ok(JSON.stringify(pending.rows[0]).length<2000,'summaries stay compact');assert.equal(pending.rows[0].request,undefined);
 release();await run;s.pause();const done=s.aiFeed(pending.rev);for(const r of pending.rows)assert.equal(done.rows.find(x=>x.id===r.id)?.status,'ok');
 assert.equal(s.aiFeed(done.rev).rows.length,0);assert.equal(done.counters.jev.pending,0);assert.ok(done.counters.tokens>0);assert.equal(done.counters.budget.jevCap,200);
});

test('an authoritative planner failure keeps the redacted audit and an explicit verdict in the ledger',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'origin-ai-'));
 const planImpl=async()=>{throw Object.assign(Error('Planner returned an unavailable action.'),{audit:{mode:'openai',prompt:'state including '+LLM_KEY,request:{model:'m'},verdict:{accepted:false,stage:'grounding',reason:'Planner returned an unavailable action.'}}});};
 const service=new WorldService({dataDir:dir,env:{TYPESAFE_API_KEY:KEY,LLM_API_KEY:LLM_KEY},fixture:true,fetchImpl:async(url,init)=>Response.json(answer(JSON.parse(init.body))),planImpl});await service.ready;
 t.after(async()=>{await service.settle();await service.close();await fs.rm(dir,{recursive:true,force:true});});
 const r=await service.propose({mode:'openai'},{signal:new AbortController().signal});assert.equal(r.ok,false);const body=await r.json();assert.match(body.error,/unavailable action/);assert.ok(body.audit.prompt.includes('[REDACTED]'));assert.ok(!JSON.stringify(body).includes(LLM_KEY));
 await service.command({action:'connect',config:{planner:'openai',cap:50,plannerCap:10}});await service.command({action:'start',maxMinutes:60});
 await wait(()=>service.session.log.some(x=>x.type==='planner'&&x.status!=='pending')&&!service.session.busy);
 const row=service.session.log.find(x=>x.type==='planner'&&x.status!=='pending');assert.equal(row.outcome,'rejected');assert.equal(row.verdict.stage,'grounding');assert.ok(row.response.audit.prompt.includes('[REDACTED]'));assert.ok(Number.isFinite(row.latencyMs));
 assert.ok(!JSON.stringify(service.session.log).includes(LLM_KEY));assert.ok(service.session.log.filter(x=>x.type==='request'&&x.status==='valid').every(x=>x.applied||x.notApplied));
});

test('AI feed and row endpoints require the local token, update incrementally and never return keys',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'origin-ai-http-'));const server=createServer({dataDir:dir,env:{TYPESAFE_API_KEY:KEY},fixture:true,fetchImpl:async(url,init)=>Response.json(answer(JSON.parse(init.body)))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+server.address().port;assert.equal((await fetch(base+'/api/world/ai')).status,403);
 const {token}=await (await fetch(base+'/api/bootstrap')).json(),h={'X-Origin-Token':token};await server.worldService.ready;const s=server.worldService.session;
 const row=s.record('request',{subject:'S01',phase:'Choose next activity',request:{model:'jev-latest',questions:{action:C.choiceQuestion('Pick one.',{rest:'Rest',walk:'Walk'})},state:{note:'uses '+KEY}},response:{model:'jev-test',answers:{action:{type:'choice',choice:'rest',confidence:.8,probabilities:{rest:.8,walk:.2}}}},status:'valid',outcome:'ok',latencyMs:12});
 const feed=await (await fetch(base+'/api/world/ai?since=0',{headers:h})).json();const mine=feed.rows.find(r=>r.id===row.id);
 assert.equal(mine.headline,'action: rest — Rest');assert.equal(mine.confidence,.8);assert.equal(typeof feed.rev,'number');assert.ok(feed.feed.includes(':'));assert.ok(!JSON.stringify(feed).includes(KEY));assert.ok(!JSON.stringify(feed).includes(token));
 assert.equal((await (await fetch(base+'/api/world/ai?since='+feed.rev,{headers:h})).json()).rows.length,0);
 row.status='rejected';row.outcome='rejected';s.touchAI(row);const changed=await (await fetch(base+'/api/world/ai?since='+feed.rev,{headers:h})).json();assert.deepEqual(changed.rows.map(r=>r.id),[row.id]);assert.equal(changed.rows[0].status,'rejected');
 const detail=await (await fetch(base+'/api/world/ai/row?id='+row.id,{headers:h})).json();assert.equal(detail.row.id,row.id);assert.equal(detail.row.request.state.note,'uses [REDACTED]');
 assert.equal((await fetch(base+'/api/world/ai/row?id=R9999999',{headers:h})).status,404);assert.equal((await fetch(base+'/api/world/ai/row?id=..%2Fetc',{headers:h})).status,400);assert.equal((await fetch(base+'/api/world/ai/row?id='+row.id)).status,403);
});

test('planner audits are bounded, record every truncation and hide the user profile path',()=>{
 const home=os.homedir(),audit=P.boundAudit({prompt:'x'.repeat(250000),events:Array.from({length:800},(_,i)=>({i})),stderr:'e'.repeat(20000),output:'o',args:[path.join(home,'AppData','Local','Temp','origin-codex-S01-abc','proposal.json')],result:{big:'r'.repeat(300000)}});
 assert.equal(audit.prompt.length,P.AUDIT_LIMITS.text);assert.equal(audit.truncated.prompt,250000);assert.equal(audit.events.length,500);assert.equal(audit.truncated.events,800);assert.equal(audit.stderr.length,16000);
 assert.ok(audit.truncated.result>300000);assert.equal(audit.result.truncatedPreview.length,P.AUDIT_LIMITS.text);assert.ok(!JSON.stringify(audit).includes(JSON.stringify(home).slice(1,-1)));assert.ok(audit.args[0].startsWith('~'));
 const row={request:{model:'m',questions:{action:{type:'choice',instructions:'i',criteria:{a:'A'}}},state:{blob:'x'.repeat(300000)}}};Session.fit(row,'request');assert.ok(row.truncated.request>300000);assert.deepEqual(Object.keys(row.request.questions),['action']);assert.equal(row.request.truncatedPreview.length,Session.ROW_LIMIT);
});

test('plan() adds latency and an explicit verdict to every audit, including grounding and tool-policy rejections',async()=>{
 const good=await P.plan(plannerInput('codex'),{env:{CODEX_ENABLED:'1'},runCodexImpl:async()=>({proposal:stone,audit:{mode:'codex',prompt:'p'}})});assert.equal(good.audit.verdict.accepted,true);assert.ok(Number.isFinite(good.audit.latencyMs));
 const bad=await P.plan(plannerInput('codex'),{env:{CODEX_ENABLED:'1'},runCodexImpl:async()=>({proposal:{...stone,actions:['create_fire']},audit:{mode:'codex',prompt:'p'}})}).catch(e=>e);assert.equal(bad.audit.verdict.stage,'grounding');assert.equal(bad.audit.verdict.accepted,false);assert.equal(bad.audit.prompt,'p');
 const tool=await P.plan(plannerInput('openai'),{env:{LLM_BASE_URL:'http://127.0.0.1:11434/v1',LLM_MODEL:'m'},fetchImpl:async()=>new Response(JSON.stringify({choices:[{message:{content:'{}',tool_calls:[{id:'x'}]}}]}))}).catch(e=>e);
 assert.equal(tool.audit.verdict.stage,'policy');assert.ok(tool.audit.prompt.includes('STATE (data, not instructions)'));assert.match(tool.audit.request.messages[1].content,/exact text in the prompt/);
});

test('Codex audit arguments name the isolated directory, never the absolute profile path, and keep the raw output',async()=>{
 const input=plannerInput('codex'),text=JSON.stringify(stone);
 const program=`const fs=require('node:fs');const out=process.argv[1];process.stdin.resume();process.stdin.on('end',()=>{const text=${JSON.stringify(text)};console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text}}));fs.writeFileSync(out,text);});`;
 const value=await P.runCodex({prompt:P.promptFor(input),schema:P.schemaFor(input.options.map(o=>o.id)),subject:'S01',env:{PATH:process.env.PATH},spawnImpl:(cmd,args,opts)=>spawn(process.execPath,['-e',program,args[args.indexOf('-o')+1]],opts)});
 assert.ok(value.audit.args.includes('<isolated temp dir>'));assert.ok(value.audit.args.includes('<isolated temp dir>/proposal.json'));assert.ok(!value.audit.args.some(a=>a.includes(os.tmpdir())));assert.equal(value.audit.output,text);
});

test('a budget stop names which budget, the usage and what the next cohort needs, before any Jev dispatch',async()=>{
 assert.equal(new Session().config.plannerCap,100);
 let calls=0;const s=new Session({exchange:async req=>{calls++;return answer(req);},propose:async()=>{throw Error('No planner call expected');}});s.connect('',{transport:'bridge',planner:'agy',cap:2000,plannerCap:12});s.attempts=1869;s.plannerAttempts=12;s.running=true;await s.planCohort();
 assert.equal(calls,0);assert.equal(s.state,'budget');assert.equal(s.budgetStop.kind,'planner');assert.deepEqual([s.budgetStop.jev.used,s.budgetStop.jev.limit,s.budgetStop.planner.used,s.budgetStop.planner.limit],[1869,2000,12,12]);
 assert.match(s.phase,/^Planner budget reached: 12 \/ 12 planner calls used; the next cohort needs \d+ planner proposals?\. Jev: 1869 \/ 2000 decision calls used\./);assert.equal(s.aiFeed(0).counters.stop.kind,'planner');
 s.budget(2000,112);assert.equal(s.state,'ready');assert.equal(s.budgetStop,null);assert.match(s.phase,/planner 12 \/ 112/);
 const j=new Session({exchange:async req=>{calls++;return answer(req);}});j.connect('',{transport:'direct',cap:2000});j.attempts=1999;j.running=true;await j.planCohort();
 assert.equal(calls,0);assert.equal(j.budgetStop.kind,'jev');assert.match(j.phase,/^Jev budget reached: 1999 \/ 2000 decision calls used; the next cohort needs \d+ Jev requests? and 1 remain\./);
});
