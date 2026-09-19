/* The only behavioural decision source is the remote Jev Decisions endpoint. */
(function(root,factory){const C=typeof module==='object'&&module.exports?require('./core.js'):root.OriginCore;const P=typeof module==='object'&&module.exports?require('./providers.js'):root.OriginProviders;const S=factory(C,P);if(typeof module==='object'&&module.exports)module.exports=S;else root.OriginSession=S;})(typeof globalThis!=='undefined'?globalThis:this,function(C,P){
'use strict';
const endpoint=Object.fromEntries(Object.entries(P.definitions).map(([id,p])=>[id,p.endpoint]));
class Session{
 #key='';#controller=null;#epoch=0;#enabled=false;#bridgeToken='';
 constructor(hooks={}){this.hooks=hooks;this.world=C.genesis();this.log=[];this.running=false;this.busy=false;this.status='locked';this.phase='No Jev connection';this.error='';this.attempts=0;this.valid=0;this.totalTokens=0;this.usageKnown=false;this.lastRequestAt=0;this.retryNotBefore=0;this.config={provider:'typesafe',model:'jev-latest',cap:100,gap:1600,gate:0,context:'',transport:'direct',planner:'none',plannerModel:'',plannerCap:12,hierarchical:true,stallLimit:3};this.plannerAttempts=0;this.bridgeAvailable=false;this.serverHasKey=false;this.sessionId=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'origin-'+Date.now();this.record('genesis',{text:'Six subjects. Zero learned abilities. No shared language. World locked until Jev responds.',world:C.clone(this.world)});}
 get connected(){return this.#enabled;}
 serverHasKeyFor(provider){return !!this.bridgeInfo?.[provider==='typesafe'?'hasTypeSafeKey':'hasOpenRouterKey'];}
 setBridge(token,info={}){this.#bridgeToken=String(token||'');this.bridgeAvailable=!!token;this.serverHasKey=!!info.hasJevKey;this.bridgeInfo=info;}
 async bridgeCall(path,body,signal){
  if(!this.bridgeAvailable)throw Error('Start the included local server before using the bridge.');
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Origin-Token':this.#bridgeToken},body:JSON.stringify(body),signal,credentials:'same-origin'});
  const data=await response.json();if(!response.ok){const error=Error(data.error||('Bridge HTTP '+response.status));error.audit=data.audit;throw error;}return data;
 }
 async propose(world,subject,tx){
  if(this.plannerAttempts>=this.config.plannerCap)throw Error('Planner request cap reached. Raise it explicitly in settings. No action was substituted.');
  this.phase='Planner proposal / '+subject.id;this.status='planning';this.emit();this.plannerAttempts++;
  const options=C.available(world,subject);const request={mode:this.config.planner,model:this.config.plannerModel,
    subject:C.perception(world,subject),options:options.map(o=>({id:o.id,label:o.label,detail:o.detail})),observerContext:this.config.context};
  const row=this.record('planner',{phase:'Propose a grounded experiment',subject:subject.id,transaction:tx.id,request,status:'pending',committed:false});tx.rows.push(row);
  const began=performance.now();
  try{
   const data=await this.bridgeCall('/api/plan',request,tx.signal);row.response=JSON.parse(this.scrub(data));
   const proposal=data.proposal,valid=new Set(options.map(o=>o.id));
   if(!proposal||typeof proposal.objective!=='string'||!Array.isArray(proposal.actions)||!proposal.actions.length||proposal.actions.length>3||proposal.actions.some(id=>!valid.has(id)))throw Error('Planner proposed an unknown or unavailable action. No action was executed.');
   if(tx.signal.aborted||tx.epoch!==this.#epoch)throw Error('Late planner response discarded.');
   row.status='valid';row.model=data.audit?.model||data.audit?.mode||this.config.planner;row.latencyMs=Math.round(performance.now()-began);
   return {...C.clone(proposal),source:this.config.planner,receipt:row.id,formedAtCompleted:subject.completed,unverified:true};
  }catch(e){row.status=tx.signal.aborted?'cancelled':'rejected';row.error=this.scrub(tx.signal.reason?.message||e.message);row.latencyMs=Math.round(performance.now()-began);if(e.audit)row.response=JSON.parse(this.scrub(e.audit));throw Error(row.error);}
 }
 async savedCheckpoint(){const res=await fetch('/api/checkpoint',{headers:{'X-Origin-Token':this.#bridgeToken},cache:'no-store'});const data=await res.json();if(!res.ok)throw Error(data.error||'No checkpoint.');return data;}
 async checkpoint(){return this.bridgeCall('/api/checkpoint',{snapshot:this.export()});}

 get url(){return this.config.transport==='bridge'?'/api/jev':endpoint[this.config.provider];}
 emit(){this.hooks.change?.(this);}
 record(type,data){const r={id:'L'+String(this.log.length+1).padStart(6,'0'),at:new Date().toISOString(),turn:this.world.tick,type,...data};this.log.push(r);this.emit();return r;}
 connect(key,options={}){
  if(this.busy)throw Error('Pause the current turn before changing the connection.');
  if(typeof key!=='string')key='';
  const c={...this.config,...options};if(!endpoint[c.provider])throw Error('Unknown provider.');
  if(!['direct','bridge'].includes(c.transport)||!['none','agy','cloud'].includes(c.planner))throw Error('Unknown connection mode.');
  if(c.transport==='bridge'&&!this.bridgeAvailable)throw Error('Start START-WINDOWS.cmd or node server.cjs, then open the local page.');
  key=P.keyFor(c.provider,key);
  if(!key&&!(c.transport==='bridge'&&this.serverHasKeyFor(c.provider)))throw Error('Enter your '+P.get(c.provider).label+' API key, or set '+P.get(c.provider).envKey+' in .env and restart the local server.');
  if(c.planner!=='none'&&c.transport!=='bridge')throw Error('Planner modes require the local bridge.');
  c.plannerCap=Math.floor(Number(c.plannerCap));if(!Number.isFinite(c.plannerCap)||c.plannerCap<1||c.plannerCap>500)throw Error('Planner cap must be 1 to 500.');
  c.plannerModel=String(c.plannerModel||'').slice(0,150);c.hierarchical=c.hierarchical!==false;c.stallLimit=3;
  if(options.provider&&options.provider!==this.config.provider&&!Object.prototype.hasOwnProperty.call(options,'model'))c.model=P.get(c.provider).models[0].id;
  P.validateModel(c.provider,c.model);
  c.cap=Math.floor(Number(c.cap));c.gate=Number(c.gate);c.gap=Math.max(1000,Number(c.gap)||1600);
  if(!Number.isFinite(c.cap)||c.cap<this.attempts+1||c.cap>2000)throw Error('The session cap must be greater than requests already attempted ('+this.attempts+') and no greater than 2000.');
  if(!Number.isFinite(c.gate)||c.gate<0||c.gate>1)throw Error('Invalid confidence threshold.');
  c.context=String(c.context||'').slice(0,1000);this.#key=key.trim();this.#enabled=true;this.config=c;this.error='';this.status='ready';this.phase='Key set; not yet verified by Jev';this.record('connection',{text:(key?'Personal '+P.get(c.provider).label+' key set in tab memory.':'Using '+P.get(c.provider).envKey+' on the local server.')+' Not verified by a decision yet.',upstreamEndpoint:endpoint[c.provider],provider:c.provider,model:c.model,cap:c.cap,transport:c.transport,planner:c.planner,plannerModel:c.plannerModel,plannerCap:c.plannerCap,engineVersion:C.VERSION});
 }
 disconnect(){this.pause('Disconnected. No further world changes.');this.#key='';this.#enabled=false;this.status='locked';this.phase='No Jev connection';this.record('connection',{text:'Key removed from memory.'});}
 pause(reason='Paused by observer.'){
  this.running=false;this.#epoch++;this.record('pause',{text:reason,inFlight:this.busy});this.#controller?.abort(new DOMException(reason,'AbortError'));this.status=this.connected?'paused':'locked';this.phase=reason;this.emit();
 }
 async start(){if(this.running||this.busy)return;this.running=true;this.emit();while(this.running){const ok=await this.step();if(!ok)break;}this.running=false;this.emit();}
 async delay(ms,signal){if(ms<=0)return;await new Promise((resolve,reject)=>{const timer=setTimeout(done,ms);function done(){signal.removeEventListener('abort',stop);resolve();}function stop(){clearTimeout(timer);reject(Error('Turn cancelled.'));}signal.addEventListener('abort',stop,{once:true});if(signal.aborted)stop();});}
 scrub(x){const text=typeof x==='string'?x:JSON.stringify(x);return this.#key?text.split(this.#key).join('[REDACTED]'):text;}
 async ask(request,phase,subject,tx){
  if(tx.epoch!==this.#epoch||tx.signal.aborted)throw Error('Turn cancelled.');
  if(!this.connected)throw Error('No Jev key is connected.');
  if(this.attempts>=this.config.cap)throw Error('Session request cap reached. The world is frozen. Increase the cap explicitly to continue.');
  if(this.hooks.canExecute&&!this.hooks.canExecute())throw Error('The page is hidden or the 3D renderer is not ready. The world is frozen.');
  this.phase=phase+' / '+subject;this.status='requesting';this.emit();
  const wait=Math.max(0,this.config.gap-(Date.now()-this.lastRequestAt),this.retryNotBefore-Date.now());
  if(wait>2000){this.phase='Waiting for provider cooldown / '+subject;this.emit();}
  await this.delay(wait,tx.signal);
  this.attempts++;this.lastRequestAt=Date.now();
  const row=this.record('request',{requestNumber:this.attempts,transaction:tx.id,subject,phase,provider:this.config.provider,endpoint:this.url,upstreamEndpoint:endpoint[this.config.provider],request:C.clone(request),status:'pending',committed:false});tx.rows.push(row);
  let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;this.#controller?.abort(new DOMException('Jev request timed out after 35 seconds.','TimeoutError'));},35000);const began=performance.now();
  try{
   const headers={'Content-Type':'application/json'};if(this.#key)headers.Authorization='Bearer '+this.#key;
   if(this.config.transport==='bridge'){headers['X-Origin-Token']=this.#bridgeToken;headers['X-Jev-Provider']=this.config.provider;}
   const response=await fetch(this.url,{method:'POST',headers,body:JSON.stringify(request),signal:tx.signal,credentials:this.config.transport==='bridge'?'same-origin':'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error'});
   row.httpStatus=response.status;row.retryAfter=response.headers.get('retry-after');this.retryNotBefore=P.retryAt(row.retryAfter,response.status);row.providerRequestId=response.headers.get('x-request-id')||response.headers.get('x-openrouter-request-id')||null;
   const text=await response.text();row.latencyMs=Math.round(performance.now()-began);
   if(text.length>2000000)throw Error('Response is unexpectedly large.');
   let body;try{body=JSON.parse(this.scrub(text));}catch(e){row.raw=this.scrub(text).slice(0,12000);throw Error('The endpoint returned non-JSON data (HTTP '+response.status+').');}
   row.response=body;
   if(!response.ok)throw Error(P.describeError(this.config.provider,response.status,body,row.retryAfter));
   const answers=C.validResponse(body,request);row.model=body.model;row.usage=body.usage||null;
   const tokens=body.usage?.input_tokens??body.usage?.prompt_tokens;if(Number.isFinite(tokens)){this.totalTokens+=tokens;this.usageKnown=true;}
   for(const [id,a]of Object.entries(answers)){if(request.questions[id]&&a.confidence<this.config.gate)throw Error('Choice '+id+' confidence '+a.confidence+' is below the configured gate. No fallback and no world change.');}
   if(tx.signal.aborted||tx.epoch!==this.#epoch)throw Error('A late response was discarded after pause.');
   row.status='valid';this.valid++;this.emit();return {answers,receipt:row.id};
  }catch(error){row.status=tx.signal.aborted&&!timedOut?'cancelled':'rejected';row.latencyMs=Math.round(performance.now()-began);row.error=timedOut?'Jev request timed out after 35 seconds. No automatic retry.':this.scrub(tx.signal.reason?.message||error.message||String(error));if(!row.httpStatus&&!tx.signal.aborted&&this.config.transport==='direct')row.error+=' If browser access is blocked by CORS or the network, open START-WINDOWS.cmd and select Local server bridge. No fallback provider is used.';this.emit();throw Error(row.error);}
  finally{clearTimeout(timeout);}
 }
 async testTypeSafeConnection(key,{transport='direct'}={}){
  if(this.busy||this.running)throw Error('Pause before checking account access.');
  if(!['direct','bridge'].includes(transport))throw Error('Unknown transport.');
  key=P.keyFor('typesafe',key);
  if(transport==='bridge'&&!this.bridgeAvailable)throw Error('Start the included local server first.');
  if(!key&&!(transport==='bridge'&&this.serverHasKeyFor('typesafe')))throw Error('Enter your TypeSafe key or set TYPESAFE_API_KEY in .env and restart.');
  const endpoint=P.get('typesafe').modelsEndpoint,url=transport==='bridge'?'/api/jev-models':endpoint;
  const previous={status:this.status,phase:this.phase},ctr=new AbortController(),epoch=this.#epoch;
  this.busy=true;this.#controller=ctr;this.status='checking';this.phase='Checking TypeSafe account access. No decision or world change.';
  const row=this.record('connection_check',{provider:'typesafe',operation:'list_models',endpoint:url,upstreamEndpoint:endpoint,upstreamMethod:'GET',status:'pending',committed:false});
  const scrub=x=>{let text=this.scrub(x);if(key)text=text.split(key).join('[REDACTED]');return text;};
  const started=performance.now(),timer=setTimeout(()=>ctr.abort(new DOMException('TypeSafe account check timed out.','TimeoutError')),20000);
  try{
   const headers={};if(key)headers.Authorization='Bearer '+key;
   if(transport==='bridge'){headers['Content-Type']='application/json';headers['X-Origin-Token']=this.#bridgeToken;headers['X-Jev-Provider']='typesafe';}
   const res=await fetch(url,{method:transport==='bridge'?'POST':'GET',headers,...(transport==='bridge'?{body:'{}'}:{}),signal:ctr.signal,credentials:transport==='bridge'?'same-origin':'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error'});
   row.httpStatus=res.status;row.providerRequestId=res.headers.get('x-request-id')||null;row.retryAfter=res.headers.get('retry-after');
   const text=await res.text();if(text.length>2000000)throw Error('Model-list response exceeds 2 MB.');
   let data;try{data=JSON.parse(scrub(text));}catch{throw Error('TypeSafe model list returned non-JSON (HTTP '+res.status+').');}row.response=data;
   if(!res.ok)throw Error(P.describeError('typesafe',res.status,data,row.retryAfter));
   if(!Array.isArray(data.models)||!data.models.every(m=>typeof m.name==='string'))throw Error('Unexpected TypeSafe model-list response. See the ledger.');
   if(ctr.signal.aborted||epoch!==this.#epoch)throw Error('Account check cancelled.');
   row.status='valid';row.text='TypeSafe model-list access verified; no decision or world change.';return data.models.map(m=>m.name);
  }catch(e){row.status=ctr.signal.aborted?'cancelled':'rejected';row.error=scrub(ctr.signal.reason?.message||e.message);if(!row.httpStatus&&!ctr.signal.aborted&&transport==='direct')row.error+=' Browser network/CORS may be blocking the request. Use the included local server bridge.';throw Error(row.error);}
  finally{clearTimeout(timer);row.latencyMs=Math.round(performance.now()-started);this.busy=false;this.#controller=null;if(!ctr.signal.aborted&&epoch===this.#epoch){this.status=previous.status;this.phase=previous.phase;}this.emit();}
 }
 updateLimits(cap,plannerCap=this.config.plannerCap){
  if(this.busy||this.running)throw Error('Pause before changing request limits.');
  cap=Number(cap);plannerCap=Number(plannerCap);
  if(!Number.isInteger(cap)||cap<=this.attempts||cap>2000)throw Error('Jev limit must exceed '+this.attempts+' attempted requests and be no greater than 2000.');
  if(!Number.isInteger(plannerCap)||plannerCap<this.plannerAttempts||plannerCap<1||plannerCap>500)throw Error('Planner limit must cover previous attempts, be at least 1, and be no greater than 500.');
  const before={cap:this.config.cap,plannerCap:this.config.plannerCap};this.config.cap=cap;this.config.plannerCap=plannerCap;
  this.record('limits_changed',{text:'Observer explicitly approved new request limits. Counters were NOT reset. No call was started.',before,after:{cap,plannerCap},attempts:this.attempts,plannerAttempts:this.plannerAttempts});
  this.error='';this.status=this.connected?'paused':'locked';this.phase='Limits updated. Run or One turn starts new calls explicitly.';this.emit();
 }
 blockForLimit(kind,required=1){
  this.running=false;const planner=kind==='planner',used=planner?this.plannerAttempts:this.attempts,cap=planner?this.config.plannerCap:this.config.cap;
  this.status=planner?'planner_limited':'limited';this.error='';this.phase=(planner?'Planner':'Jev')+' request limit reached or insufficient for the next phase: '+used+' / '+cap+' used; at least '+required+' remaining required. Open Request budget. No automatic increase.';
  const previous=this.log.at(-1);if(previous?.type!=='budget_stop'||previous.kind!==kind||previous.used!==used||previous.cap!==cap||previous.required!==required)this.record('budget_stop',{kind,used,cap,required,text:this.phase});else this.emit();
  return false;
 }
 async step(){
  if(this.busy)return false;
  if(!this.connected){this.status='locked';this.phase='Connect a Jev key to start';this.emit();this.hooks.connectNeeded?.();return false;}
  if(this.hooks.canExecute&&!this.hooks.canExecute()){this.error='3D rendering must be ready and the page visible before any calls are sent.';this.status='blocked';this.running=false;this.emit();return false;}
  const before=this.world,acting=C.actor(before);if(!acting){this.pause('No living subjects remain.');return false;}
  this.busy=true;this.error='';const ctr=new AbortController();this.#controller=ctr;const tx={id:'T'+String(before.tick+1).padStart(5,'0')+'-'+this.attempts,epoch:this.#epoch,signal:ctr.signal,rows:[]};
  let committed=false;
  const ask=async(req,phase,who)=>{const r=await this.ask(req,phase,who,tx);return r;};
  try{
   const model=this.config.model;
   // All planning is staged. An error cannot change the real world or its memories.
   const working=C.clone(before),self=C.byId(working,acting.id);
   const reconsider=!self.intent||C.intentStatus(self).complete||self.completed-self.intent.formedAtCompleted>=3||(self.behavior?.stagnant||0)>=2||C.stagnationReport(self).stalled;
   const minimum=1+(this.config.hierarchical&&reconsider?1:0);
   if(this.config.cap-this.attempts<minimum)return this.blockForLimit('jev',minimum);
   if(this.config.planner!=='none'&&(!self.proposal||self.completed-self.proposal.formedAtCompleted>=3||(self.behavior?.stagnant||0)>=2||C.stagnationReport(self).stalled)){if(this.plannerAttempts>=this.config.plannerCap)return this.blockForLimit('planner');self.proposal=await this.propose(working,self,tx);}
   if(this.config.hierarchical&&reconsider){
    const goal=await ask(C.goalRequest(working,self,model,this.config.context),'Choose intention',self.id);
    self.intent={id:goal.answers.intent.choice,label:C.GOALS[goal.answers.intent.choice],receipt:goal.receipt,formedAtCompleted:self.completed};
   }
   const selected=await ask(C.actionRequest(working,self,model,this.config.context),'Choose action',acting.id);
   const option=C.available(before,acting).find(o=>o.id===selected.answers.action.choice);if(!option)throw Error('The chosen action is no longer available.');
   this.hooks.choice?.(acting,option,selected);
   const d={},receiver=C.byId(before,option.target);
   const encounter=C.clone(before);if(receiver){const mover=C.byId(encounter,acting.id);mover.x=receiver.x-1.1;mover.z=receiver.z+.5;}
   const base={model,state:{subject:receiver?C.perception(encounter,C.byId(encounter,receiver.id)):{}},questions:{}};
   if(option.kind==='signal'){
    const signal=await ask({model,state:{subject:C.perception(before,acting),recipient:receiver.id},questions:{
     referent:C.choiceQuestion('What does this subject intend to draw attention to? Select from bodily or directly perceived referents only.',{food:'Food or bodily hunger.',water:'Water or thirst.',warmth:'Warmth or feeling cold.',danger:'A nearby threat.',self:'This body.',stone:'A held or visible stone.',together:'Approach or do something together.'}),
     token:C.choiceQuestion('Select a simple vocal token. Reuse this subject\'s learned associations when appropriate; before any association, no token has a predefined meaning.',{ka:null,mu:null,ta:null,na:null,ha:null,ku:null,ma:null,uh:null}),
     gesture:C.choiceQuestion('Choose an accompanying visible gesture using the same sensory situation. This question is independent of the token and intended referent questions.',{point_fruit:'Point toward visible fruit or held food.',point_water:'Point toward the water.',touch_chest:'Touch this body\'s chest.',open_hand:'Extend an open hand toward the other body.',point_stone:'Point at a visible stone.',still:'Make no pointing gesture.'})
    }},'Form a signal',acting.id);
    d.referent=signal.answers.referent.choice;d.token=signal.answers.token.choice;d.gesture=signal.answers.gesture.choice;
    // The true referent is deliberately absent here: no telepathy.
    base.state.incoming={from:acting.id,token:d.token,visible_gesture:d.gesture};
    base.questions={attention:C.choiceQuestion('Does this subject attend to the observable signal or ignore it?',{attend:'Attend to the signal.',ignore:'Ignore it and retain prior understanding.'}),
     interpretation:C.choiceQuestion('What, if anything, does this subject infer from the observed token and gesture using ONLY its own associations and senses? Do not assume shared language. The sender\'s private intent is not provided.',{food:'Food or hunger.',water:'Water or thirst.',warmth:'Warmth or cold.',danger:'A threat.',self:'The signalling body.',stone:'A stone.',together:'An invitation to approach.',unknown:'No grounded interpretation yet.'})};
    const response=await ask(base,'Interpret signal',receiver.id);d.attention=response.answers.attention.choice;d.interpretation=response.answers.interpretation.choice;
   }else if(option.kind==='share'||option.kind==='take'){
    base.state.incoming={from:acting.id,observable_action:option.kind==='share'?'Extends a held fruit toward this body.':'Reaches toward this body\'s held fruit.'};
    base.questions.response=C.choiceQuestion('Choose this receiver\'s own response using bodily need and actual prior encounters. No scripted consent.',option.kind==='share'?{accept:'Accept the offered fruit.',decline:'Decline the offer.'}:{yield:'Let the other body take one fruit.',withdraw:'Pull the fruit away.',resist:'Physically resist the reach, with an energy cost.'});
    d.response=(await ask(base,'Counterparty response',receiver.id)).answers.response.choice;
   }else if(option.kind==='teach'){
    base.state.incoming={from:acting.id,visible_demonstration:C.SKILLS[option.skill].act,recorded_result:C.SKILLS[option.skill].cue};
    base.questions.attention=C.choiceQuestion('Does this subject attend to the demonstration? Attending does not automatically confer the ability.',{attend:'Attend and examine what happens.',ignore:'Ignore it; no new learning.'});
    d.attention=(await ask(base,'Attend demonstration',receiver.id)).answers.attention.choice;
   }else if(option.kind==='hunt'){
    const companions=before.entities.filter(e=>e.alive&&e.id!==acting.id&&C.dist(e,acting)<22);
    const plan=await ask({model,state:{subject:C.perception(before,acting)},questions:{companion:C.choiceQuestion('Does this subject attempt this hunt alone or ask one visible neighbour to cooperate? A neighbour can refuse.',{alone:'Approach alone.',...Object.fromEntries(companions.map(e=>[e.id,'Ask '+e.id+' to cooperate.']))})}},'Choose hunting partner',acting.id);
    const companion=plan.answers.companion.choice;
    if(companion!=='alone'){const other=C.byId(before,companion);const response=await ask({model,state:{subject:C.perception(before,other),observable_invitation:'A hunting approach demonstrated by '+acting.id},questions:{response:C.choiceQuestion('Will this individual join the demonstrated hunt? Use only their own needs and experiences.',{join:'Join the approach; spend effort and share a successful yield.',refuse:'Do not join.'})}},'Consent to cooperation',companion);if(response.answers.response.choice==='join')d.partner=companion;}
    const prey=before.animals.find(x=>x.id===option.target);
    const response=await ask({model,state:{animal:{id:prey.id,alert:prey.alert,position:{x:prey.x,z:prey.z}},observation:{approaching_human:acting.id,approaching_bodies:d.partner?[acting.id,d.partner]:[acting.id]}},questions:{response:C.choiceQuestion('Choose the prey animal\'s immediate observable response to the approach. It has no access to the human\'s private thought. No human dialogue.',{flee:'Move away from the approach.',freeze:'Remain still, making the practiced hunter\'s attempt succeed.',evade:'Turn away and evade, leaving the hunter without meat.'})}},'Animal response',prey.id);d.response=response.answers.response.choice;
   }else if(option.kind==='reflect'){
    const last=acting.last;const response=await ask({model,state:{subject:C.perception(before,acting),recalled_event:acting.memory.find(m=>m.event===last?.event)||null},questions:{
     attribution:C.choiceQuestion('Who performed the action described by this actual stored episode? Use the episode, not a general claim of awareness.',{self:'This subject\'s own body.',other:'A different body.',unknown:'Cannot establish the actor.'}),
     outcome:C.choiceQuestion('Which action category is supported by this stored episode?',Object.fromEntries([...new Set(['gather','eat','drink','rest','signal','share','take','experiment','observe','build','hunt','fire','teach','reflect','record','plant','tend','harvest','cook','craft','unknown'])].map(k=>[k,k==='unknown'?'The memory does not establish a category.':k])))
    }},'Check an autobiographical memory',acting.id);d.attribution=response.answers.attribution.choice;d.outcome=response.answers.outcome.choice;
   }
   const draft=C.clone(working);const result=C.rawAction(draft,C.byId(draft,acting.id),option,d);
   const learned=[];
   for(const candidate of result.learning){const inference=await ask(C.learningRequest(draft,candidate,model),'Learn from observed outcome',candidate.who);learned.push(C.applyLearning(draft,candidate,inference.answers.inference.choice,inference.receipt));}
   if(tx.epoch!==this.#epoch||tx.signal.aborted||this.world!==before)throw Error('Stale turn discarded before commit.');
   for(const x of learned)if(x.learned)result.notices.push({text:x.who+' acquired '+C.SKILLS[x.skill].name+' from recorded evidence'+(x.teacher?' demonstrated by '+x.teacher:'')+'.',affected:[x.who,...(x.teacher?[x.teacher]:[])],kind:'learning'});
   const after=C.commitDraft(before,draft,acting.id,result,tx.rows.map(r=>r.id));
   this.world=after;committed=true;for(const r of tx.rows)r.committed=true;
   this.status='executing';this.phase=acting.id+' / '+option.label;
   this.record('commit',{transaction:tx.id,subject:acting.id,text:option.label,receipts:tx.rows.map(r=>r.id),decisions:{action:selected.answers.action.choice,intent:self.intent?.id||null,...d},learning:learned,changes:after.lastCommit.changes,effects:after.lastCommit.effects,worldRevision:after.revision});
   await this.hooks.animate?.(before,after,option,d,tx.signal);
   const current=C.byId(after,acting.id);
   const stall=C.stagnationReport(current,this.config.stallLimit);
   if(stall.stalled){
    this.running=false;this.status='stalled';this.phase=acting.id+': '+stall.reason+'. Review outcomes or planner settings before spending more. No replacement action was chosen.';
    this.record('stagnation',{subject:acting.id,text:this.phase,report:C.behaviorReport(after,current),committedTurn:after.tick});return false;
   }
   this.status=this.running?'running':'ready';this.phase=this.running?'Next subject will observe the changed world':'Turn committed. Waiting for your next step.';return true;
  }catch(error){
   if(!committed&&!ctr.signal.aborted&&/request cap reached/i.test(error.message)){this.record('rejected_turn',{transaction:tx.id,subject:acting.id,text:error.message,committed:false,receipts:tx.rows.map(r=>r.id)});return this.blockForLimit(/Planner/.test(error.message)?'planner':'jev');}
   this.running=false;this.error=this.scrub(ctr.signal.reason?.message||error.message||String(error));this.status=ctr.signal.aborted?'paused':'error';this.phase=committed?'Turn committed; display stopped':'No world change; turn not committed';
   this.record(committed?'display_stop':'rejected_turn',{transaction:tx.id,subject:acting.id,text:this.error,committed,receipts:tx.rows.map(r=>r.id)});return false;
  }finally{this.busy=false;this.#controller=null;this.emit();}
 }
 export(){return {format:'origin-experiment-v4',exportedAt:new Date().toISOString(),session:this.sessionId,notice:'Local audit, not a provider-signed attestation. No API key included. Simulation, not real humans or a proof of consciousness.',config:{...this.config},attempts:this.attempts,plannerAttempts:this.plannerAttempts,world:C.clone(this.world),log:C.clone(this.log)};}
 reset(){if(this.busy)throw Error('Pause and wait for the current request to cancel before resetting.');this.pause();const old=this.world.tick;this.world=C.genesis();this.record('reset',{text:'Observer created a new genesis. Prior '+old+' turns remain in this log. Request usage was NOT reset.'});this.status=this.connected?'ready':'locked';this.phase='New genesis; no autonomous actions';this.hooks.reset?.();this.emit();}
 import(data){if(this.busy)throw Error('Pause before importing.');if(!['origin-experiment-v3','origin-experiment-v4'].includes(data?.format))throw Error('Not an ORIGIN v3/v4 snapshot.');const w=C.validateWorld(data.world);this.pause();this.world=C.clone(w);this.record('import',{text:'Imported local state. Historical claims in the file are UNVERIFIED; no provider identity or receipts are authenticated.',source:data.session||null,importedLog:data.log||[],worldRevision:w.revision});this.status=this.connected?'ready':'locked';this.hooks.reset?.();this.emit();}
 restore(data){
  if(this.busy)throw Error('Pause before restoring.');
  if(!['origin-experiment-v3','origin-experiment-v4'].includes(data?.format))throw Error('Not an ORIGIN snapshot.');
  C.validateWorld(data.world);if(!Array.isArray(data.log)||data.log.length>100000)throw Error('Invalid saved ledger.');
  this.pause('Restoring a checkpoint; no automatic run.');
  this.world=C.clone(data.world);this.log=C.clone(data.log).map(r=>({...r,provenance:'restored-unverified'}));
  this.attempts=Math.max(this.attempts,Number(data.attempts)||0);this.plannerAttempts=Math.max(this.plannerAttempts,Number(data.plannerAttempts)||0);
  this.valid=this.log.filter(r=>r.type==='request'&&r.status==='valid').length;
  // Keep the explicitly configured limit: restoring a file must never authorize extra spend.
  this.world.version=C.VERSION;
  this.totalTokens=this.log.filter(r=>r.type==='request'&&r.usage).reduce((n,r)=>n+(r.usage.input_tokens||r.usage.prompt_tokens||0),0);this.usageKnown=this.totalTokens>0;
  this.record('restore',{text:'Restored world and ledger. Imported receipts are not independently authenticated. Credentials and model configuration were not restored.'});
  this.status=this.connected?'paused':'locked';this.phase='Checkpoint restored. Request counters and the current cap are preserved. Explicitly connect and approve any higher cap before running.';this.error='';this.hooks.reset?.();this.emit();
 }
}
return Session;
});
