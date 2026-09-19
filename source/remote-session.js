/* Browser projection of the authoritative Node world. It never selects or executes behavior. */
(function(){'use strict';const L=window.OriginLife,P=window.OriginProviders;
class RemoteSession{
 constructor(hooks={}){this.hooks=hooks;this.world=L.genesis();this.log=[];this.config={provider:'typesafe',model:'jev-latest',transport:'bridge',cap:100,planner:'none',plannerModel:'',plannerCap:100,parallelCalls:4,rate:2};this.connected=false;this.running=false;this.busy=false;this.state='locked';this.phase='Connecting to the authoritative local world...';this.error='';this.attempts=0;this.plannerAttempts=0;this.cost=0;this.costKnown=false;this.token='';this.isRemote=true;this.allowDetached=false;this.runMinutes=1440;this.lastIdentity=null;this.ledgerCount=0;this.polling=false;}
 get status(){return this.state;}
 async api(url,init={}){const r=await fetch(url,{...init,headers:{'Content-Type':'application/json','X-Origin-Token':this.token,...init.headers},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Local world request failed.');return d;}
 apply(d){const reset=d.identity!==this.lastIdentity;this.lastIdentity=d.identity;for(const k of ['connected','running','busy','state','phase','error','config','attempts','plannerAttempts','cost','costKnown','world','log','allowDetached','untilSimTime','ledgerCount','totalTokens','diagnostics','budgetStop'])if(k in d){if(k==='log'&&this.fullLogLoaded){const m=new Map(this.log.map(r=>[r.id,r]));for(const r of d.log)m.set(r.id,r);this.log=[...m.values()];}else this[k]=d[k];}if(reset)this.hooks.reset?.(this.world);else this.hooks.frame?.(this.world);this.hooks.change?.(this);}
 async bootstrap(){const r=await fetch('/api/bootstrap',{cache:'no-store'});if(!r.ok)throw Error('Launch START-WINDOWS.cmd or START-MAC-LINUX.sh first.');const b=await r.json();this.token=b.token;this.bridgeInfo={...b,token:undefined};const d=await this.api('/api/world');this.apply(d);if(!this.timer)this.timer=setInterval(()=>this.poll(),650);return this.bridgeInfo;}
 async poll(){if(this.polling||!this.token||document.hidden)return;this.polling=true;try{this.apply(await this.api('/api/world'));}catch(e){this.error=e.message;this.state='offline';this.phase='Connection lost. Server may still be active if detached execution was approved.';this.hooks.change?.(this);}finally{this.polling=false;}}
 async command(action,data={}){const d=await this.api('/api/world/control',{method:'POST',body:JSON.stringify({action,...data})});this.apply(d);return d;}
 async connect(key,config={}){return this.command('connect',{key,config:{...this.config,...config,transport:'bridge'}});}
 async start(oneWave=false){return this.command('start',{oneWave,allowDetached:this.allowDetached,maxMinutes:this.runMinutes});}
 async pause(){return this.command('pause');}
 async disconnect(){return this.command('disconnect');}
 async review(){return this.command('review');}
 async budget(cap,plannerCap){return this.command('budget',{cap:Number(cap),plannerCap:Number(plannerCap)});}
 async reset(scenario){return this.command('scenario',{scenario});}
 async restore(snapshot){return this.command('restore',{snapshot});}
 async checkpoint(){return this.command('save');}
 async loadCheckpoint(path='/api/checkpoint'){if(path==='/api/recovery'){const d=await this.api(path);return this.restore(d);}const d=await this.api('/api/world/export');return this.restore(d);}
 async fullExport(){return this.api('/api/world/export');}
 export(){return {format:'origin-living-v5',world:L.clone(this.world),log:L.clone(this.log),attempts:this.attempts,plannerAttempts:this.plannerAttempts,notice:'Browser projection. Full export is available via the server Export action.'};}
 async aiFeed(since=0,limit=200){return this.api('/api/world/ai?since='+encodeURIComponent(since)+'&limit='+encodeURIComponent(limit));}
 async aiRow(id){return (await this.api('/api/world/ai/row?id='+encodeURIComponent(id))).row;}
 async fullLedger(){const d=await this.api('/api/world/ledger');this.log=d.log;this.fullLogLoaded=true;return this.log;}
 async accessCheck(key=''){const r=await fetch('/api/jev-models',{method:'POST',headers:{'Content-Type':'application/json','X-Origin-Token':this.token,'X-Jev-Provider':'typesafe',...(key?{Authorization:'Bearer '+key}:{})},body:'{}'});const d=await r.json();if(!r.ok)throw Error(P.describeError('typesafe',r.status,d,r.headers.get('retry-after')));return d;}
 record(type,data={}){if(type==='time_scale')return this.command('rate',{rate:data.minutesPerSecond});return null;}
}
window.RemoteSession=RemoteSession;
})();
