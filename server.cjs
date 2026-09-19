#!/usr/bin/env node
'use strict';
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const L=require('./source/civilization.js');
const {WorldService}=require('./source/world-service.cjs');
const TerrainLoader=require('./source/terrain-loader.cjs');
const C=require('./source/core.js'),Planner=require('./source/planner.cjs'),P=require('./source/providers.js');
const ROOT=__dirname;
async function loadEnv(file){
 let text;try{text=await fs.readFile(file,'utf8');}catch(e){if(e.code==='ENOENT')return;throw e;}
 for(const line of text.split(/\r?\n/)){const m=line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);if(!m||process.env[m[1]]!==undefined)continue;let v=m[2];if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[m[1]]=v;}
}
function redact(value,secrets){let text=typeof value==='string'?value:JSON.stringify(value);for(const key of secrets.filter(Boolean))text=text.split(key).join('[REDACTED]');return text;}
function safeSnapshot(x){
 if(!x||!['origin-experiment-v3','origin-experiment-v4','origin-living-v5'].includes(x.format)||!Array.isArray(x.log))throw Error('Invalid checkpoint.');if(x.format==='origin-living-v5')L.validate(x.world);else C.validateWorld(x.world);
 if(JSON.stringify(x).length>64*1024*1024)throw Error('Checkpoint exceeds 64 MB; export and archive the full ledger.');return x;
}
function createServer({fixture=false,env=process.env,fetchImpl=global.fetch,planImpl=Planner.plan,dataDir=path.join(ROOT,'data'),recoveryPath=path.join(ROOT,'recovery','supplied-v6.snapshot.json')}={}){
 const worldService=new WorldService({fixture,env,fetchImpl,planImpl,dataDir});
 const token=crypto.randomBytes(32).toString('hex');let jevAttempts=0,plannerAttempts=0,connectionChecks=0,inFlight=0,saveQueue=Promise.resolve();
 const jevCap=integer(env.SERVER_JEV_CAP,2000,1,10000),plannerCap=integer(env.SERVER_PLANNER_CAP,100,1,1000);
 const secrets=[env.OPENROUTER_API_KEY,env.TYPESAFE_API_KEY,env.PLANNER_API_KEY,env.GEMINI_API_KEY,env.GOOGLE_API_KEY,token];
 const send=(res,status,data)=>{if(res.destroyed)return;const text=redact(data,secrets);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(text);};
 const server=http.createServer(async(req,res)=>{
  const host=req.headers.host||'',actualPort=server.address()?.port,allowed=['127.0.0.1:'+actualPort,'localhost:'+actualPort];
  res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  // Never listen on public interfaces; also defend against DNS rebinding and cross-site calls.
  if(!allowed.includes(host)){send(res,403,{error:'Invalid Host header. Use the loopback address printed by the server.'});return;}
  const origin=req.headers.origin;if(origin&&!allowed.some(h=>origin==='http://'+h)){send(res,403,{error:'Cross-origin access denied.'});return;}
  if(req.headers['sec-fetch-site']==='cross-site'){send(res,403,{error:'Cross-site access denied.'});return;}
  let url;try{url=new URL(req.url,'http://'+host);}catch{send(res,400,{error:'Invalid URL.'});return;}
  if(req.method==='GET'&&url.pathname==='/api/bootstrap'){
   // Token is intentionally returned only here, with no CORS and same-origin checks.
   const bootstrap={token,version:L.VERSION,defaultProvider:'typesafe',defaultModel:'jev-latest',connectionChecks,hasJevKey:!!(env.OPENROUTER_API_KEY||env.TYPESAFE_API_KEY),hasOpenRouterKey:!!env.OPENROUTER_API_KEY,hasTypeSafeKey:!!env.TYPESAFE_API_KEY,agyEnabled:env.AGY_ENABLED==='1',cloudEnabled:!!(env.PLANNER_API_KEY||env.OPENROUTER_API_KEY),plannerModel:env.PLANNER_MODEL||'',jevAttempts,plannerAttempts,checkpoint:await fs.stat(path.join(dataDir,'latest.json')).then(()=>true,()=>false),suppliedRecovery:await fs.stat(recoveryPath).then(()=>true,()=>false)};
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(bootstrap));return;
  }
  if(url.pathname.startsWith('/api/')){
   if(req.headers['x-origin-token']!==token){send(res,403,{error:'Invalid local-session token. Reload the page after restarting the server.'});return;}
   if(url.pathname.startsWith('/api/world')){
    try {await worldService.ready;
     if(req.method==='GET'&&url.pathname==='/api/world'){send(res,200,worldService.state());return;}
     if(req.method==='GET'&&url.pathname==='/api/world/export'){send(res,200,JSON.parse(worldService.clean(worldService.session.export())));return;}
     if(req.method==='GET'&&url.pathname==='/api/world/ledger'){send(res,200,{log:JSON.parse(worldService.clean(worldService.session.log))});return;}
     if(req.method==='POST'&&url.pathname==='/api/world/control'){const body=await readJSON(req,70*1024*1024);send(res,200,await worldService.command(body));return;}
     if(req.method==='POST'&&url.pathname==='/api/world/terrain'){const body=await readJSON(req,3000);const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);try{const dem=await TerrainLoader.load(body.lat,body.lon,{fetchImpl,signal:controller.signal});send(res,200,{dem});}finally{clearTimeout(timeout);}return;}
     send(res,404,{error:'Unknown world route.'});
    }catch(e){send(res,400,{error:worldService.clean(e.message)});}return;
   }
   if(req.method==='GET'&&url.pathname==='/api/recovery'){
    try{const data=safeSnapshot(JSON.parse(await fs.readFile(recoveryPath,'utf8')));send(res,200,data);}catch(e){send(res,e.code==='ENOENT'?404:400,{error:e.code==='ENOENT'?'No supplied recovery file in this package.':e.message});}return;
   }
   if(req.method==='GET'&&url.pathname==='/api/checkpoint'){
    try{send(res,200,JSON.parse(await fs.readFile(path.join(dataDir,'latest.json'),'utf8')));}catch(e){send(res,e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'No local checkpoint yet.':e.message});}return;
   }
   if(req.method!=='POST'){send(res,405,{error:'Method not allowed.'});return;}
   const controller=new AbortController();const close=()=>{if(!res.writableEnded)controller.abort(Error('Browser request disconnected.'));};res.on('close',close);
   let timer;const requestSecrets=[...secrets];try{
    const body=await readJSON(req,url.pathname==='/api/checkpoint'?34*1024*1024:200000);
    if(url.pathname==='/api/checkpoint'){
     const snapshot=safeSnapshot(body.snapshot);const text=redact(snapshot,secrets);
     const task=saveQueue.catch(()=>{}).then(async()=>{await fs.mkdir(dataDir,{recursive:true,mode:0o700});const temp=path.join(dataDir,'latest.tmp');await fs.writeFile(temp,text,{mode:0o600});await fs.rename(temp,path.join(dataDir,'latest.json'));});saveQueue=task;await task;send(res,200,{saved:true,turn:snapshot.world.tick});return;
    }
    if(!['/api/jev','/api/jev-models','/api/plan'].includes(url.pathname)){send(res,404,{error:'Unknown API route.'});return;}
    if(inFlight>=integer(env.SERVER_CONCURRENCY,8,1,16)){send(res,429,{error:'Local concurrency limit reached. Reduce parallel calls or use one tab.'});return;}
    inFlight++;
    try{
     timer=setTimeout(()=>controller.abort(Error('Local upstream request timed out.')),url.pathname==='/api/plan'?130000:40000);
     if(url.pathname==='/api/jev'||url.pathname==='/api/jev-models'){
      const check=url.pathname==='/api/jev-models',provider=req.headers['x-jev-provider']||'typesafe',contract=P.get(provider);
      if(check&&provider!=='typesafe')throw Error('The account-check route is TypeSafe native only.');
      if(check&&connectionChecks>=20){const e=Error('Server account-check limit reached (20). No model-list request was sent.');e.statusCode=429;throw e;}
      if(!check){if(jevAttempts>=jevCap)throw Error('Server Jev request cap reached. Restart only after reviewing spend.');P.validateModel(provider,body.model);if(body.state===undefined||!body.questions||typeof body.questions!=='object'||Array.isArray(body.questions)||!Object.keys(body.questions).length)throw Error('Invalid Jev System One request.');}
      const auth=req.headers.authorization;if(auth&&!auth.startsWith('Bearer '))throw Error('Use Bearer authentication.');
      const key=P.keyFor(provider,auth?auth.slice(7):env[contract.envKey]);
      if(!key){const e=Error('No '+contract.label+' key configured. Set '+contract.envKey+' in .env, restart, or enter the matching key in the page.');e.statusCode=401;throw e;}
      requestSecrets.push(key);
      const endpoint=check?contract.modelsEndpoint:contract.endpoint;
      if(check)connectionChecks++;else jevAttempts++;
      const response=await fetchImpl(endpoint,{method:check?'GET':'POST',headers:{...(check?{}:{'Content-Type':'application/json'}),Authorization:'Bearer '+key},...(!check?{body:JSON.stringify(body)}:{}),signal:controller.signal,redirect:'error',cache:'no-store'});
      const raw=await response.text();if(raw.length>2000000)throw Error('TypeSafe/Jev response exceeds 2 MB.');
      const cleaned=redact(raw,requestSecrets);let parsed;try{parsed=JSON.parse(cleaned);}catch{throw Error(contract.label+' returned non-JSON content (HTTP '+response.status+').');}
      const id=response.headers.get('x-request-id')||response.headers.get('x-openrouter-request-id');if(id)res.setHeader('x-request-id',redact(id,requestSecrets));
      const retry=response.headers.get('retry-after');if(retry)res.setHeader('retry-after',redact(retry,requestSecrets));
      res.setHeader('x-origin-provider',provider);send(res,response.status,parsed);
     }else{
      Planner.validateInput(body);if(plannerAttempts>=plannerCap)throw Error('Server planner request cap reached.');plannerAttempts++;
      const result=await planImpl(body,{signal:controller.signal,env,fetchImpl});send(res,200,result);
     }
    }finally{inFlight--;}
   }catch(e){send(res,controller.signal.aborted?499:(e.statusCode||400),{error:redact(controller.signal.reason?.message||e.message,requestSecrets),...(e.audit?{audit:JSON.parse(redact(e.audit,requestSecrets))}:{})});}
   finally{clearTimeout(timer);res.removeListener('close',close);}
   return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){send(res,405,{error:'Method not allowed.'});return;}
  const staticFiles={'/':'ORIGIN.html','/ORIGIN.html':'ORIGIN.html','/index.html':'ORIGIN.html','/assets/three.min.js':'assets/three.min.js','/assets/THREE-LICENSE.txt':'assets/THREE-LICENSE.txt','/docs/START-HERE.md':'docs/START-HERE.md','/docs/TYPESAFE-SETUP.md':'docs/TYPESAFE-SETUP.md'};
  staticFiles['/assets/earth-land.geojson']='assets/earth-land.geojson';
 const file=staticFiles[url.pathname];if(!file){res.writeHead(404);res.end('Not found');return;}
  try{const content=await fs.readFile(path.join(ROOT,file));res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content);}catch{res.writeHead(404);res.end('File not present. See node install-assets.cjs for the optional local Three.js cache.');}
 });
 server.worldService=worldService;const nativeClose=server.close.bind(server);server.close=function(callback){nativeClose(error=>{worldService.close().then(()=>callback?.(error),e=>callback?.(e));});return server;};
 return server;
}
function integer(v,fallback,min,max){const n=Number(v);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback;}
async function readJSON(req,max){if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))throw Error('Expected application/json.');let bytes=0,parts=[];for await(const part of req){bytes+=part.length;if(bytes>max)throw Error('Request body exceeds the allowed size.');parts.push(part);}return JSON.parse(Buffer.concat(parts).toString('utf8'));}
async function main(){
 if(Number(process.versions.node.split('.')[0])<22)throw Error('Node.js 22 or later is required.');
 await loadEnv(path.join(ROOT,'.env'));const port=integer(process.env.PORT,4317,1024,65535),server=createServer();
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
 server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port '+port+' is busy. Close the other ORIGIN server or change PORT in .env.':e.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>{const url='http://127.0.0.1:'+port;console.log('\nORIGIN / CIVILIZATION v6.0 / TypeSafe Native\n'+url+'\n\nDefault provider: TypeSafe native / jev-latest.\nSet TYPESAFE_API_KEY in .env or enter it in the page. No OpenRouter key required.\nNo model calls happen before you explicitly test access or run in the page.\nKeys stay out of checkpoints. Keep this terminal open.\nOptional AGY: '+(process.env.AGY_ENABLED==='1'?'enabled':'disabled')+'\n');
  if(process.argv.includes('--open')){const {spawn}=require('node:child_process');let child;if(process.platform==='win32')child=spawn('cmd.exe',['/c','start','',url],{windowsHide:true,stdio:'ignore'});else child=spawn(process.platform==='darwin'?'open':'xdg-open',[url],{stdio:'ignore'});child.on('error',()=>{});child.unref();}
 });
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={createServer,loadEnv,safeSnapshot,redact,readJSON};
