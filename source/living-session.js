/* Concurrent cognition coordinator. No local policy and no fabricated production responses.
   A cohort reads isolated perceptions; all results are arbitrated together, not by network arrival.
   Existing authorized activities continue during inference, up to a bounded time-lead. */
(function(root,factory){const node=typeof module==='object'&&module.exports;const S=factory(node?require('./civilization.js'):root.OriginLife,node?require('./core.js'):root.OriginCore,node?require('./providers.js'):root.OriginProviders);if(node)module.exports=S;else root.LivingSession=S;})(globalThis,function(L,C,P){
'use strict';
class Session{
 #key='';#token='';#epoch=0;#controllers=new Set();#activeCalls=0;#waiters=[];
 constructor(hooks={}){
  this.hooks=hooks;this.world=L.genesis();this.log=[];this.serial=0;this.attempts=0;this.plannerAttempts=0;this.cost=0;this.costKnown=false;this.totalTokens=0;this.connected=false;this.running=false;this.busy=false;this.cohort=0;this.pendingSince=null;this.state='locked';this.error='';this.phase='Connect TypeSafe to bring the world to life.';this.bridgeInfo=null;this.clockHeld=false;this.lastWall=0;this.timer=null;this.oneWave=false;this.lastCheckpoint=-1;this.published=0;
  this.config={provider:'typesafe',model:'jev-latest',transport:'bridge',cap:100,planner:'none',plannerModel:'',plannerCap:12,parallelCalls:4,rate:2,gate:0,leadMinutes:5};
  this.sessionId=globalThis.crypto?.randomUUID?.()||'life-'+Date.now();this.record('genesis',{text:'Concurrent living world; all voluntary actions require valid Jev decisions.',scenario:this.world.scenario,version:L.VERSION});
 }
 emit(){this.hooks.change?.(this);}
 record(type,data={}){const e={id:'R'+String(++this.serial).padStart(7,'0'),at:new Date().toISOString(),time:this.world.simTime,type,...data};this.log.push(e);this.emit();return e;}
 get status(){return this.state;}
 scrub(value){let s=typeof value==='string'?value:JSON.stringify(value);for(const k of [this.#key,this.#token].filter(Boolean))s=s.split(k).join('[REDACTED]');return s;}
 async bootstrap(){if(typeof location!=='undefined'&&location.protocol==='file:'){this.config.transport='direct';return null;}const r=await fetch('/api/bootstrap',{cache:'no-store'});if(!r.ok)throw Error('Local server unavailable.');const data=await r.json();this.#token=data.token;this.bridgeInfo={...data,token:undefined};if(!this.config.plannerModel)this.config.plannerModel=data.plannerModel||'';return this.bridgeInfo;}
 connect(key,config={}){
  if(this.busy)throw Error('Pause and allow cancelled requests to settle before reconnecting.');const c={...this.config,...config};P.validateModel(c.provider,c.model);
  if(!['bridge','direct'].includes(c.transport)||!['none','cloud','agy','openai','claude','codex'].includes(c.planner))throw Error('Unknown transport or planner.');
  if(c.transport==='bridge'&&!this.#token&&!this.hooks.exchange)throw Error('Launch the included local server, then reload this page.');
  key=P.keyFor(c.provider,key);const serverKey=this.bridgeInfo?.[c.provider==='typesafe'?'hasTypeSafeKey':'hasOpenRouterKey'];if(!key&&!(c.transport==='bridge'&&serverKey)&&!this.hooks.exchange)throw Error('Enter the matching API key or configure it in .env.');
  for(const [k,min,max]of [['cap',this.attempts+1,100000],['plannerCap',1,10000],['parallelCalls',1,8]]){c[k]=Number(c[k]);if(!Number.isInteger(c[k])||c[k]<min||c[k]>max)throw Error(k+' must be '+min+' to '+max+'.');}
  if(c.planner!=='none'&&c.transport!=='bridge')throw Error('Planner modes require the local server.');c.gate=Number(c.gate)||0;c.rate=Math.max(.2,Math.min(120,Number(c.rate)||2));this.config=c;this.#key=key;this.connected=true;this.error='';this.state='ready';this.phase='Connected settings; model access is verified by the next successful response.';this.record('connection',{provider:c.provider,model:c.model,transport:c.transport,planner:c.planner,cap:c.cap,parallelCalls:c.parallelCalls});
 }
 async accessCheck(key=''){
  const p=P.get(this.config.provider);if(!p.modelsEndpoint)throw Error('Account model-list check is available for TypeSafe native.');key=P.keyFor('typesafe',key||this.#key);const bridge=this.config.transport==='bridge';
  const r=await fetch(bridge?'/api/jev-models':p.modelsEndpoint,{method:bridge?'POST':'GET',headers:{...(bridge?{'Content-Type':'application/json','X-Origin-Token':this.#token,'X-Jev-Provider':'typesafe'}:{}),...(key?{Authorization:'Bearer '+key}:{})},...(bridge?{body:'{}'}:{}),cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(P.describeError('typesafe',r.status,data,r.headers.get('retry-after')));this.record('account_check',{httpStatus:r.status,response:JSON.parse(this.scrub(JSON.stringify(data).split(key||'\u0000').join('[REDACTED]'))),notice:'No world action and no inference.'});return data;
 }
 async slot(signal){if(signal.aborted)throw Error('Cancelled.');if(this.#activeCalls<this.config.parallelCalls){this.#activeCalls++;return;}
  await new Promise((resolve,reject)=>{const item={resolve,reject,signal};const cancel=()=>{const i=this.#waiters.indexOf(item);if(i>=0)this.#waiters.splice(i,1);reject(Error('Cancelled while queued.'));};item.cancel=cancel;signal.addEventListener('abort',cancel,{once:true});this.#waiters.push(item);});
 }
 release(){this.#activeCalls--;while(this.#waiters.length){const next=this.#waiters.shift();next.signal.removeEventListener('abort',next.cancel);if(next.signal.aborted){next.reject(Error('Cancelled.'));continue;}this.#activeCalls++;next.resolve();break;}}
 async ask(request,subject,phase,context){
  const ctr=context.controller,signal=ctr.signal;await this.slot(signal);let timer,row;
  try{
   if(signal.aborted||context.epoch!==this.#epoch)throw Error('Cancelled before dispatch.');if(this.attempts>=this.config.cap)throw Error('Jev request budget exhausted. Raise the limit explicitly.');
   this.attempts++;row=this.record('request',{requestNumber:this.attempts,subject,phase,cohort:context.cohort,endpoint:P.get(this.config.provider).endpoint,request:L.clone(request),status:'pending',applied:false});const start=performance.now();
   timer=setTimeout(()=>ctr.abort(Error('Jev request timed out after 40 seconds.')),40000);
   let body,code;
   if(this.hooks.exchange){body=await this.hooks.exchange(request,{subject,phase,signal});code=200;if(this.hooks.fixture)row.testFixture=true;else row.transport='authoritative-server';}
   else {
    const bridge=this.config.transport==='bridge';const r=await fetch(bridge?'/api/jev':P.get(this.config.provider).endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(this.#key?{Authorization:'Bearer '+this.#key}:{}),...(bridge?{'X-Origin-Token':this.#token,'X-Jev-Provider':this.config.provider}:{})},body:JSON.stringify(request),signal,redirect:'error',credentials:bridge?'same-origin':'omit',referrerPolicy:'no-referrer',cache:'no-store'});
    code=r.status;const text=await r.text();if(text.length>2000000)throw Error('Provider response exceeds 2 MB.');try{body=JSON.parse(this.scrub(text));}catch{row.raw=this.scrub(text.slice(0,2000));throw Error('Provider returned non-JSON data.');}row.httpStatus=code;row.response=body;row.providerRequestId=r.headers.get('x-request-id')||null;
    if(!r.ok)throw Error(P.describeError(this.config.provider,r.status,body,r.headers.get('retry-after')));
   }
   row.latencyMs=Math.round(performance.now()-start);row.httpStatus=code;row.response=JSON.parse(this.scrub(body));const answers=C.validResponse(body,request);
   row.usage=body.usage||null;if(Number.isFinite(body.usage?.cost)){this.cost+=body.usage.cost;this.costKnown=true;}this.totalTokens+=body.usage?.input_tokens||0;
   for(const answer of Object.values(answers))if(answer.confidence<this.config.gate)throw Error('Confidence below the approved threshold. No substitute action.');
   if(signal.aborted||context.epoch!==this.#epoch)throw Error('Late response discarded after pause.');row.status='valid';row.model=body.model;this.emit();return {answers,receipt:row.id};
  }catch(e){if(row){if(e.httpStatus)row.httpStatus=e.httpStatus;if(e.providerResponse)row.response=JSON.parse(this.scrub(e.providerResponse));row.status=signal.aborted?'cancelled':'rejected';row.error=this.scrub(signal.reason?.message||e.message);this.emit();}throw Error(this.scrub(signal.reason?.message||e.message));}
  finally{clearTimeout(timer);this.release();}
 }
 async proposal(a,context){
  // Planner calls share the concurrency budget; a larger population must not flood the bridge.
  if(this.plannerAttempts>=this.config.plannerCap)throw Error('Planner request budget exhausted.');await this.slot(context.controller.signal);
  if(this.plannerAttempts>=this.config.plannerCap){this.release();throw Error('Planner request budget exhausted.');}
  this.plannerAttempts++;
  const request={mode:this.config.planner,model:this.config.plannerModel,subject:L.perception(this.world,a),options:L.options(this.world,a).map(o=>({id:o.id,label:o.label,detail:o.label+'; '+o.duration+' minutes.'}))};
  const row=this.record('planner',{subject:a.id,cohort:context.cohort,request,status:'pending',applied:false});const ctr=context.controller;let timer;
  try{timer=setTimeout(()=>ctr.abort(Error('Planner timed out.')),135000);const r=this.hooks.propose?await this.hooks.propose(request,{signal:ctr.signal}):await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json','X-Origin-Token':this.#token},body:JSON.stringify(request),signal:ctr.signal});const data=await r.json();row.response=JSON.parse(this.scrub(data));if(!r.ok)throw Error(data.error||'Planner rejected request.');if(context.epoch!==this.#epoch||ctr.signal.aborted)throw Error('Late proposal discarded.');row.status='valid';return {...data.proposal,receipt:row.id,formedAt:a.completed,unverified:true};}
  catch(e){row.status='rejected';row.error=this.scrub(e.message);throw e;}finally{clearTimeout(timer);this.release();}
 }
 async decide(id,context){
  let a=L.byId(this.world,id);if(!a?.alive||a.activity)return null;const receipts=[];
  // Learning is its own commit. An inference failure never rolls back the meal or experiment.
  if(a.knowledgeQueue.length){const candidate=L.clone(a.knowledgeQueue[0]);const r=await this.ask({model:this.config.model,state:{subject:L.perception(this.world,a),observation:candidate},questions:{inference:C.choiceQuestion('Does this individual\'s recorded observation support the proposed relation? No invented results. Unsupported trials cannot award knowledge.',{supported:'The observed result supports this relation.',uncertain:'More experience is needed.',unsupported:'The observation does not support it.'})}},id,'Review an observed result',context);if(context.epoch===this.#epoch){L.infer(this.world,candidate,r.answers.inference.choice,r.receipt);this.applied([r.receipt],'learning');this.publish();}}
  a=L.byId(this.world,id);if(!a?.alive||a.activity)return null;
  const snapshot=L.clone(this.world),self=L.byId(snapshot,id);L.agency.ensure(self);
  if(L.agency.intentProgress(self).renew){const req=L.agency.intentRequest(snapshot,self,this.config.model);req.state.subject=L.perception(snapshot,self);const goal=await this.ask(req,id,'Choose grounded intention',context);receipts.push(goal.receipt);L.agency.reviewIntent(self,goal.answers.intent.choice,goal.receipt,snapshot);}
  if(this.config.planner!=='none'&&(!self.proposal||self.completed-self.proposal.formedAt>=3)){const proposal=await this.proposal(self,context);self.proposal=proposal;receipts.push(proposal.receipt);}
  let menu=L.options(snapshot,self);
  if(menu.length>64){const categories=[...new Set(menu.map(L.category))];const group=await this.ask({model:this.config.model,state:{subject:L.perception(snapshot,self),feasible_categories:Object.fromEntries(categories.map(k=>[k,menu.filter(o=>L.category(o)===k).map(o=>o.label).slice(0,12)]))},questions:{domain:C.choiceQuestion('Choose an activity domain for this individual. High reserves mean satisfied needs. Consider personal projects, real interruptions, social opportunities and unexplored material work. No fixed curriculum.',Object.fromEntries(categories.map(k=>[k,L.categories[k]||k])))}},id,'Choose activity domain',context);receipts.push(group.receipt);const chosen=group.answers.domain.choice,urgent=L.agency.needReport(self).urgent;menu=menu.filter(o=>L.category(o)===chosen||(urgent.includes('satiety')&&['eat','meal','dine','retrieve','gather_node'].includes(o.kind)&&(o.resource===undefined||o.resource==='food'))||(urgent.includes('hydration')&&['drink','drink_node','drink_carried'].includes(o.kind))||(urgent.includes('energy')&&['rest','sleep','furniture_rest','furniture_sleep'].includes(o.kind))||(urgent.includes('bladder')&&['relieve','furniture_relieve'].includes(o.kind)));
   // The domain itself was selected by Jev. Needed body actions remain selectable, never forced.
  }
  const request=L.request(snapshot,self,this.config.model,menu);delete request.questions.intent;
  const r=await this.ask(request,id,'Choose next activity',context);receipts.push(r.receipt);const option=L.options(snapshot,self).find(o=>o.id===r.answers.action.choice);if(!option)throw Error('Unavailable action.');
  const d={expression:r.answers.expression.choice};
  if(self.proposal?.utterance&&option.target===self.proposal.utterance.to&&self.known.language&&['chat','joke','tell_story','court','comfort'].includes(option.kind)){d.dialogue=self.proposal.utterance.text;d.dialogueReceipt=self.proposal.receipt;}
  if(option.kind==='program'){const rr=await this.ask({model:this.config.model,state:{subject:L.perception(snapshot,self)},questions:{operator:C.choiceQuestion('Choose a bounded arithmetic operation for a real VM test. This does not run shell commands.',{add:'Add two numeric operands.',multiply:'Multiply two numeric operands.'}),operand:C.choiceQuestion('Choose the second numeric operand.',{two:'2',three:'3',five:'5',eight:'8'})}},id,'Choose bounded program',context);d.program=[['push',2],['push',{two:2,three:3,five:5,eight:8}[rr.answers.operand.choice]],[rr.answers.operator.choice]];receipts.push(rr.receipt);}

  if(option.kind==='signal'){
   const s=await this.ask({model:this.config.model,state:{subject:L.perception(snapshot,self)},questions:{token:C.choiceQuestion('Choose a short sound, using only this subject\'s learned associations.',{ka:'ka',mu:'mu',ha:'ha',ta:'ta',uh:'uh'}),gesture:C.choiceQuestion('Choose a visible accompanying gesture.',{point_food:'Point toward food.',point_water:'Point toward water.',touch_chest:'Touch own chest.',open_hand:'Extend an open hand.',still:'No gesture.'}),meaning:C.choiceQuestion('What does this individual intend to indicate?',{food:'Food.',water:'Water.',self:'This body.',together:'Being together.',warmth:'Warmth.'})}},id,'Form a signal',context);d.token=s.answers.token.choice;d.meaning=s.answers.meaning.choice;d.gesture=s.answers.gesture.choice;receipts.push(s.receipt);
  }
  if(option.target)d.response='pending'; // Only approach is authorized now. Receiver decides on actual arrival.
  if(option.animal){const prey=snapshot.animals.find(d=>d.id===option.animal);const rr=await this.ask({model:this.config.model,state:{animal:prey,observation:{approachingPerson:self.id}},questions:{response:C.choiceQuestion('Select this prey\'s observable response to an approach.',{flee:'Run away.',evade:'Evade the approach.',freeze:'Stay still.'})}},prey.id,'Animal response',context);receipts.push(rr.receipt);d.prey=rr.answers.response.choice;}
  return {actor:id,option,d,intent:self.intent?.id||null,intentState:L.clone(self.intent),agencyState:{reviewDue:self.agency.reviewDue,reviewCount:self.agency.reviewCount},receipts,proposal:self.proposal||null,snapshotTime:snapshot.simTime};
 }

 async respond(activityId,context){
  const act=this.world.activities[activityId];if(!act?.awaitingResponse)return null;
  const a=L.byId(this.world,act.actor),other=L.byId(this.world,act.option.target);
  if(!other?.alive||L.dist(a,other)>4){L.cancel(this.world,act.id,'Receiver moved outside contact before the encounter.');this.publish();return null;}
  const incoming={from:a.id,observable_action:act.kind,token:act.decision.token||null,visible_gesture:act.decision.gesture||null};
  const q={response:C.choiceQuestion('Respond only for this receiver to a present invitation. You can accept or decline. Acceptance may interrupt your current activity. Check interruption_context, remaining work, unfinished tasks, urgent body reserves and repeated encounters. It is valid to decline so you can eat, drink, rest or finish an experiment; a past acceptance is not ongoing consent. Respect age-appropriate care, play, adult-only affection and family choices. The sender private meaning is not supplied.',{accept:'Accept this present invitation and its interruption cost, only if worthwhile for this individual now.',decline:'Decline; preserve the current activity or attend to own needs. No relationship or compulsory behavior is implied.'}),reaction:C.choiceQuestion('Choose an outward reaction to this present interaction.',{neutral:'Neutral.',amused:'Amused.',pleased:'Pleased.',uncomfortable:'Uncomfortable.'})};
  if(incoming.token)q.interpretation=C.choiceQuestion('Interpret the observed token using only your own learned associations. The intended meaning is withheld.',{food:'Food.',water:'Water.',self:'The signaling body.',together:'Being together.',warmth:'Warmth.',unknown:'No grounded interpretation.'});
  if(act.decision.dialogue){incoming.spoken=act.decision.dialogue;incoming.speechSource='Model proposal authorized as part of the speaker action';}
  const snapshotActivity=other.activity||null;
  const rr=await this.ask({model:this.config.model,state:{subject:L.perception(this.world,other),incoming},questions:q},other.id,'Independent response at encounter',context);
  return {encounter:act.id,actor:a.id,receiver:other.id,d:{response:rr.answers.response.choice,reaction:rr.answers.reaction.choice,interpretation:rr.answers.interpretation?.choice,interrupt:rr.answers.response.choice==='accept',targetActivity:snapshotActivity},receipts:[rr.receipt]};
 }
 applied(receipts,activity){for(const id of receipts){const row=this.log.find(r=>r.id===id);if(row){row.applied=true;row.activity=activity;}}}
 async planCohort(){
  if(this.busy||!this.connected||!this.running)return false;const encounters=Object.values(this.world.activities).filter(a=>a.awaitingResponse);const invited=new Set(encounters.map(a=>a.option.target));const candidates=this.world.entities.filter(a=>(!this.oneWave||!this.waveLaunched)&&a.alive&&!a.activity&&!invited.has(a.id)&&!a.cognition.stalled&&!a.cognition.errors).sort((a,b)=>(a.completed-b.completed)||a.id.localeCompare(b.id)).slice(0,this.world.settings.cognitionLimit||10);if(!candidates.length&&!encounters.length)return false;const count=encounters.length+candidates.reduce((n,a)=>n+1+(L.agency.intentProgress(a).renew?1:0)+(L.options(this.world,a).length>64?1:0)+(a.knowledgeQueue.length?1:0),0);
  if(this.attempts+count>this.config.cap){this.pause('Budget too small for '+count+' required decision requests before this cohort can start. Increase Request budget explicitly.','budget');return false;}
  this.busy=true;this.pendingSince=this.world.simTime;const epoch=this.#epoch,cohort=++this.cohort;this.state='planning';this.phase='Independent decisions for '+candidates.length+' people; authorized activities may continue.';
  for(const a of candidates){a.cognition.pending=true;a.thoughtState='Awaiting Jev';}
  const tasks=[...encounters.map(a=>({encounter:a.id})),...candidates.map(a=>({actor:a.id}))];const ctrs=tasks.map(()=>new AbortController());ctrs.forEach(c=>this.#controllers.add(c));this.emit();
  try{
   const results=await Promise.allSettled(tasks.map((t,i)=>t.encounter?this.respond(t.encounter,{epoch,cohort,controller:ctrs[i]}):this.decide(t.actor,{epoch,cohort,controller:ctrs[i]})));
   if(epoch!==this.#epoch)return false;
   const failed=results.find(r=>r.status==='rejected');if(failed){this.error=failed.reason.message;this.pause(this.error,/budget/.test(this.error)?'budget':'error');return false;}
   const proposals=results.map(r=>r.value).filter(Boolean);proposals.sort((a,b)=>a.actor.localeCompare(b.actor));if(proposals.length){const shift=(cohort-1)%proposals.length;proposals.push(...proposals.splice(0,shift));}
   const assigned=new Set();for(const p of proposals){
    if(p.encounter){try{const act=L.resolveEncounter(this.world,p.encounter,p.d,p.receipts);act.participants.forEach(id=>assigned.add(id));this.applied(p.receipts,act.id);}catch(e){this.record('conflict',{subject:p.actor,receipts:p.receipts,text:e.message});if(this.world.activities[p.encounter])L.cancel(this.world,p.encounter,'Encounter needs reassessment: '+e.message);}continue;}
    const a=L.byId(this.world,p.actor);if(!a||a.activity||assigned.has(a.id)){this.record('stale_decision',{subject:p.actor,receipts:p.receipts,text:'Already engaged by a concurrent accepted interaction. Choice not applied.'});continue;}
    try{
     const target=p.option.target?L.byId(this.world,p.option.target):null;
     // Consent only authorizes interrupting the activity the receiver actually observed.
     if(target&&p.d.response!=='pending'&&target.activity!==(p.d.targetActivity||null))throw Error('Counterparty activity changed after consent; reassessment required.');
     if(target&&p.d.response!=='pending'&&assigned.has(target.id))throw Error('Counterparty already assigned in this cohort.');
     const act=L.begin(this.world,a.id,p.option,p.d,p.receipts);a.proposal=p.proposal;a.intent=L.clone(p.intentState);Object.assign(L.agency.ensure(a),p.agencyState);a.cognition.conflicts=0;act.participants.forEach(id=>assigned.add(id));this.applied(p.receipts,act.id);
    }catch(e){a.cognition.conflicts=(a.cognition.conflicts||0)+1;a.cognition.errors=a.cognition.conflicts>=3?1:0;this.record('conflict',{subject:a.id,receipts:p.receipts,text:e.message,worldUnchangedForChoice:true});}
   }
   this.waveLaunched=true;this.publish();this.state='running';this.phase='Lives in parallel / '+Object.keys(this.world.activities).length+' active activities.';return true;
  }finally{ctrs.forEach(c=>this.#controllers.delete(c));for(const a of candidates){const live=L.byId(this.world,a.id);if(live)live.cognition.pending=false;}this.busy=false;this.pendingSince=null;this.emit();}
 }
 publish(){while(this.published<this.world.chronicle.length){const e=this.world.chronicle[this.published++];this.record('world_event',{event:L.clone(e)});}this.hooks.frame?.(this.world);}
 start(oneWave=false){if(!this.connected)throw Error('Connect TypeSafe before running.');if(this.running)return;if(this.busy)throw Error('Cancellation is still settling; resume after requests stop.');if(this.hooks.canRun&&!this.hooks.canRun())throw Error('The world renderer must be ready.');this.running=true;this.oneWave=oneWave;this.waveLaunched=false;this.state='running';this.error='';this.lastWall=performance.now();if(!this.timer)this.timer=setInterval(()=>this.pump(),50);this.planCohort();this.emit();}
 pump(delta){
  if(!this.running)return;const now=performance.now(),seconds=delta===undefined?Math.min(.2,(now-this.lastWall)/1000):delta;this.lastWall=now;
  this.clockHeld=this.pendingSince!==null&&this.world.simTime-this.pendingSince>=this.config.leadMinutes;
  const blocked=this.world.entities.some(a=>a.alive&&(a.cognition.stalled||(!a.activity&&a.cognition.errors)));
  if(blocked&&!this.busy){const who=this.world.entities.find(a=>a.alive&&(a.cognition.stalled||a.cognition.errors));this.pause((who?.observerName||'A person')+' needs review: '+(who?.agency?.stopReason||'Repeated conflicts or a model error.')+' Inspect Life audit before approving another run.','review');return;}
  if(!this.clockHeld){let remain=Math.max(0,seconds*this.config.rate);while(remain>0&&Object.keys(this.world.activities).length){const approved=this.hooks.remainingTime?.()??Infinity;if(approved<=0){this.pause('Approved run window reached. Explicit authorization required.','budget');break;}const step=Math.min(.25,remain,approved);L.advance(this.world,step);remain-=step;}this.publish();}
  if(this.running&&!this.busy){if(this.oneWave){if(!Object.keys(this.world.activities).length)this.pause('One concurrent wave completed.');else if(Object.values(this.world.activities).some(a=>a.awaitingResponse))this.planCohort();}else this.planCohort();}
  if(this.clockHeld){this.phase='Waiting for independent AI responses. Shared time held at the latency safety boundary.';this.emit();}
  if(this.world.tick!==this.lastCheckpoint&&this.world.tick>0&&this.world.tick%8===0&&!this.busy){this.lastCheckpoint=this.world.tick;this.checkpoint().catch(e=>this.record('checkpoint_error',{text:e.message}));}
 }
 pause(reason='Paused by observer.',state='paused'){this.running=false;this.#epoch++;for(const c of this.#controllers)c.abort(Error(reason));if(this.timer){clearInterval(this.timer);this.timer=null;}this.state=this.connected?state:'locked';this.phase=reason;this.record('pause',{text:reason,activeActivitiesRetained:Object.keys(this.world.activities).length});}
 disconnect(){this.pause('Disconnected. No further simulation time.');this.connected=false;this.#key='';this.state='locked';this.emit();}
 review(){for(const a of this.world.entities){a.cognition.errors=0;a.cognition.conflicts=0;a.cognition.stalled=false;L.agency.review(a);}this.record('review',{text:'Observer reviewed the stop and explicitly authorized reassessment; no action was selected locally.'});this.error='';this.start();}
 budget(cap,plannerCap){cap=Number(cap);plannerCap=Number(plannerCap);if(!Number.isInteger(cap)||cap<this.attempts||cap>100000||!Number.isInteger(plannerCap)||plannerCap<this.plannerAttempts||plannerCap>10000)throw Error('Limits cannot be below usage, above 100000 Jev calls or 10000 planner calls.');this.config.cap=cap;this.config.plannerCap=plannerCap;this.record('budget',{cap,plannerCap,text:'Explicit observer authorization; no automatic resume.'});}
 reset(scenario){if(this.busy)throw Error('Wait for cancelled requests before replacing the world.');this.pause('New scenario selected.');this.world=L.genesis(scenario);this.published=0;this.record('new_world',{scenario,notice:'Seeded conditions are not discoveries. Request counts were not reset.'});this.publish();this.hooks.reset?.(this.world);}
 export(){return {format:'origin-living-v5',version:L.VERSION,session:this.sessionId,exportedAt:new Date().toISOString(),world:L.clone(this.world),log:L.clone(this.log),attempts:this.attempts,plannerAttempts:this.plannerAttempts,notice:'Local audit, not a provider-signed attestation. No credentials. No claim of sentience.'};}
 restore(data){if(this.busy)throw Error('Pause and allow cancelled requests to settle.');if(!['origin-living-v5','origin-experiment-v4','origin-experiment-v3'].includes(data?.format))throw Error('Unknown save format.');const w=data.format==='origin-living-v5'?L.ensure(L.clone(L.validate(data.world))):L.migrate(data.world);this.pause('Restoring the supplied world; no auto-run.');this.world=w;for(const a of w.entities)a.cognition.pending=false;this.attempts=Math.max(this.attempts,Number(data.attempts)||0);this.plannerAttempts=Math.max(this.plannerAttempts,Number(data.plannerAttempts)||0);this.log=L.clone(data.log||[]);this.serial=Math.max(this.serial,...this.log.map(r=>Number(String(r.id).replace(/\D/g,''))||0));this.published=w.chronicle.length;this.record('restore',{text:'Restored saved state and authorized activities. Imported receipts are unverified. No new spending limit approved.'});this.hooks.reset?.(w);this.emit();}
 async checkpoint(){if(!this.#token)return;const r=await fetch('/api/checkpoint',{method:'POST',headers:{'Content-Type':'application/json','X-Origin-Token':this.#token},body:JSON.stringify({snapshot:this.export()})});const d=await r.json();if(!r.ok)throw Error(d.error||'Checkpoint failed.');return d;}
 async loadCheckpoint(path='/api/checkpoint'){const r=await fetch(path,{headers:{'X-Origin-Token':this.#token},cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'No saved world.');this.restore(d);}
}
return Session;
});
