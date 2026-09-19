'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const L=require('./civilization.js'),P=require('./providers.js'),Session=require('./living-session.js'),Planner=require('./planner.cjs');
/* One authoritative world. The browser is a view, not the simulation host.
 * No automatic restart of spending. Explicit caps cover every inference attempt. */
class WorldService{
 #keys={};#persist=Promise.resolve();
 constructor({env=process.env,fetchImpl=fetch,planImpl=Planner.plan,dataDir,fixture=false}={}){
  this.env=env;this.fetchImpl=fetchImpl;this.planImpl=planImpl;this.dataDir=dataDir||path.join(__dirname,'..','data');this.identity=crypto.randomUUID();this.lastViewer=Date.now();this.allowDetached=false;this.untilSimTime=null;this.dirty=false;this.fixture=fixture;
  this.session=new Session({fixture,canRun:()=>true,remainingTime:()=>this.untilSimTime===null?Infinity:Math.max(0,this.untilSimTime-this.session.world.simTime),exchange:(req,ctx)=>this.exchange(req,ctx),propose:(req,ctx)=>this.propose(req,ctx),change:()=>{this.dirty=true;}});
  this.session.config.transport='bridge';this.session.phase='Authoritative server ready. No activity without approved Jev access.';
  this.ready=this.load();
  this.timer=setInterval(()=>{if(this.session.running){if(!this.allowDetached&&Date.now()-this.lastViewer>30000)this.session.pause('No connected viewer for 30 seconds; detached spending was not authorized.');if(this.untilSimTime!==null&&this.session.world.simTime>=this.untilSimTime)this.session.pause('Approved simulated-time window reached. Review and explicitly authorize another run.','budget');}if(this.dirty){this.dirty=false;this.save().catch(e=>{this.lastSaveError=e.message;});}},2000);this.timer.unref();
 }
 secrets(){return [this.#keys.typesafe,this.#keys.openrouter,this.env.TYPESAFE_API_KEY,this.env.OPENROUTER_API_KEY,this.env.PLANNER_API_KEY,this.env.LLM_API_KEY,this.env.ANTHROPIC_API_KEY,this.env.OPENAI_API_KEY,this.env.GEMINI_API_KEY,this.env.GOOGLE_API_KEY].filter(Boolean);}
 clean(x){let s=typeof x==='string'?x:JSON.stringify(x);for(const k of this.secrets())s=s.split(k).join('[REDACTED]');return s;}
 async exchange(request,{signal}){
  const provider=this.session.config.provider,contract=P.get(provider),key=P.keyFor(provider,this.#keys[provider]||this.env[contract.envKey]);if(!key)throw Error('No '+contract.label+' credential. Configure .env or Connect TypeSafe.');
  if(this.session.attempts>Number(this.env.SERVER_JEV_CAP||2000))throw Error('Server Jev cap reached. No upstream dispatch.');P.validateModel(provider,request.model);
  const response=await this.fetchImpl(contract.endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(request),signal,redirect:'error',cache:'no-store'});
  const text=await response.text();if(text.length>2e6)throw Error('Provider response too large.');let data;try{data=JSON.parse(this.clean(text));}catch{throw Error('Provider returned non-JSON data.');}if(!response.ok){const e=Error(P.describeError(provider,response.status,data,response.headers?.get?.('retry-after')));e.httpStatus=response.status;e.providerResponse=data;throw e;}return data;
 }
 async propose(request,{signal}){if(this.session.plannerAttempts>Number(this.env.SERVER_PLANNER_CAP||100))throw Error('Server planner cap reached.');
  // A failed planner call keeps its redacted audit (prompt, CLI events, stderr, raw output, verdict) in the ledger row, exactly like the bridge route.
  try{const data=await this.planImpl(request,{signal,env:this.env,fetchImpl:this.fetchImpl});return {ok:true,status:200,json:async()=>JSON.parse(this.clean(data))};}
  catch(e){const body={error:e.message,...(e.audit?{audit:e.audit}:{})};return {ok:false,status:400,json:async()=>JSON.parse(this.clean(body))};}}
 // Live AI transparency: compact summaries after a revision cursor, and one full redacted row on demand.
 aiFeed(since,limit){this.lastViewer=Date.now();const feed=this.session.aiFeed(since,limit);return JSON.parse(this.clean({...feed,feed:this.identity+':'+feed.feed}));}
 aiRow(id){if(!/^R\d{1,12}$/.test(String(id||'')))throw Error('Invalid ledger record id.');const row=this.session.aiRow(id);return row?JSON.parse(this.clean(row)):null;}
 async load(){try{const saved=JSON.parse(await fs.readFile(path.join(this.dataDir,'world-v6.json'),'utf8'));this.session.restore(saved.snapshot);this.session.config={...this.session.config,...saved.config};this.session.connected=false;this.session.state='locked';this.session.running=false;this.session.phase='Recovered server checkpoint. Connect and explicitly approve a new run; spending does not auto-resume.';this.identity=saved.identity||this.identity;}catch(e){if(e.code!=='ENOENT'){this.loadError=e.message;this.session.record('recovery_error',{text:'Checkpoint not loaded: '+e.message});}}}
 async save(){const record={identity:this.identity,snapshot:this.session.export(),config:{...this.session.config},savedAt:new Date().toISOString(),restartPolicy:'Always paused; no credentials persisted.'};const text=this.clean(record);this.#persist=this.#persist.catch(()=>{}).then(async()=>{await fs.mkdir(this.dataDir,{recursive:true,mode:0o700});const tmp=path.join(this.dataDir,'world-v6.tmp');await fs.writeFile(tmp,text,{mode:0o600});await fs.rename(tmp,path.join(this.dataDir,'world-v6.json'));});await this.#persist;return {saved:true};}
 state({full=false,touch=true}={}){if(touch)this.lastViewer=Date.now();const s=this.session;return JSON.parse(this.clean({identity:this.identity,version:L.VERSION,authoritative:true,connected:s.connected,running:s.running,busy:s.busy,state:s.state,status:s.state,error:s.error,phase:s.phase,config:s.config,attempts:s.attempts,plannerAttempts:s.plannerAttempts,budgetStop:s.state==='budget'?s.budgetStop||null:null,cost:s.cost,costKnown:s.costKnown,totalTokens:s.totalTokens,world:s.world,diagnostics:L.agency.audit(s.world),log:full?s.log:s.log.slice(-40),ledgerCount:s.log.length,allowDetached:this.allowDetached,untilSimTime:this.untilSimTime,loadError:this.loadError||null,saveError:this.lastSaveError||null}));}
 async settle(){this.session.pause('Applying an explicit observer configuration.');const start=Date.now();while(this.session.busy&&Date.now()-start<5000)await new Promise(r=>setTimeout(r,15));if(this.session.busy)throw Error('Cancellation is still settling; retry the command.');}
 async command(body){await this.ready;this.lastViewer=Date.now();if(!body||typeof body.action!=='string')throw Error('Missing world command.');const s=this.session,w=s.world;
  switch(body.action){
   case 'connect':{if(s.busy)await this.settle();const cfg={...s.config,...body.config,transport:'bridge'};cfg.parallelCalls=Math.min(Math.max(1,Math.floor(Number(this.env.SERVER_CONCURRENCY)||8)),Math.max(1,Math.floor(Number(cfg.parallelCalls)||3)));P.validateModel(cfg.provider,cfg.model);const key=P.keyFor(cfg.provider,String(body.key||'').trim());if(key)this.#keys[cfg.provider]=key;if(!(this.#keys[cfg.provider]||this.env[P.get(cfg.provider).envKey]))throw Error('No matching provider key configured.');s.connect('',cfg);break;}
   case 'start':{if(!s.connected)throw Error('Connect a Jev provider first.');const limit=Number(body.maxMinutes??1440);if(!Number.isFinite(limit)||limit<1||limit>10080)throw Error('Authorize 1 to 10080 simulated minutes per run.');this.allowDetached=body.allowDetached===true;this.untilSimTime=w.simTime+limit;s.record('run_authorization',{untilSimTime:this.untilSimTime,allowDetached:this.allowDetached,jevCap:s.config.cap,plannerCap:s.config.plannerCap});s.start(body.oneWave===true);break;}
   case 'pause':s.pause('Paused by observer.');break;
   case 'disconnect':s.disconnect();this.#keys={};break;
   case 'review':for(const a of w.entities){a.cognition.errors=0;a.cognition.conflicts=0;a.cognition.stalled=false;L.agency.review(a);}s.error='';s.state='ready';s.record('review',{text:'Observer authorized reassessment; press Run to start. No local action was selected.'});break;
   case 'budget':s.budget(body.cap,body.plannerCap);break;
   case 'rate':{const n=Number(body.rate);if(!Number.isFinite(n)||n<.2||n>120)throw Error('Rate must be .2 to 120 simulated minutes per second.');s.config.rate=n;s.record('time_scale',{rate:n});break;}
   case 'scenario':await this.settle();s.reset(body.scenario);this.identity=crypto.randomUUID();break;
   case 'restore':await this.settle();s.restore(body.snapshot);s.world=L.ensure(s.world);this.identity=crypto.randomUUID();break;
   case 'room':L.draftRoom(w,body.room);s.publish();break;
   case 'blueprint':{const b=L.blueprint(w,body.type,Number(body.x),Number(body.z));b.rotation=[0,90,180,270].includes(Number(body.rotation))?Number(body.rotation):0;s.publish();break;}
   case 'suggest':{const a=L.byId(w,body.subject);if(!a)throw Error('Unknown person.');a.activeSuggestion=String(body.text||'').slice(0,600);s.record('player_suggestion',{subject:a.id,text:a.activeSuggestion,notice:'Proposal only, not an executed command.'});break;}
   case 'appearance':L.appearance(w,body.subject,body.values||{});s.publish();break;
   case 'lifeScale':{const y=Number(body.yearDays),g=Number(body.gestationDays);if(!Number.isFinite(y)||y<1||y>365||!Number.isFinite(g)||g<1||g>280)throw Error('Invalid declared biological time scale.');w.settings.yearDays=y;w.settings.gestationDays=g;s.record('life_scale',{yearDays:y,gestationDays:g,notice:'Game abstraction changed explicitly; scheduled pregnancies retain their existing due times.'});break;}
   case 'geography':if(s.running||s.busy)throw Error('Pause first; finish activities before changing terrain.');L.relocate(w,body.anchor,body.dem||null);this.identity=crypto.randomUUID();s.publish();break;
   case 'save':break;
   default:throw Error('Unsupported command.');
  }
  this.dirty=true;await this.save();return this.state();
 }
 async close(){if(this.closing)return this.closing;clearInterval(this.timer);this.closing=(async()=>{await this.settle();this.session.phase='Server stopping. Activities retained; no inference after shutdown.';await this.save();})();return this.closing;}
}
module.exports={WorldService};
