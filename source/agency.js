/* ORIGIN 6.1: factual feedback and spending guards, never an action policy.
 * This module cannot select an action, synthesize a provider answer, grant knowledge,
 * or repair someone's needs. Every finding references completed or interrupted work.
 */
(function(root,factory){const A=factory();if(typeof module==='object'&&module.exports)module.exports=A;else root.OriginAgency=A;})(globalThis,function(){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const canon=id=>String(id||'').replace(/^(?:resume_)+/,'');
const transfers=new Set(['store_item','take_item','store','retrieve','store_cold']);
const social=new Set(['chat','joke','hug','comfort','play_together','walk_together','celebrate','tell_story']);
const reserveNames=['satiety','hydration','energy','warmth','bladder','hygiene','social','fun','comfort'];
function ensure(a){
 if(!a.agency)a.agency={schema:1,history:[],interruptions:[],participations:0,reviewDue:false,reviewCount:0,reviewedAt:-1,stopReason:null,baseline:0};
 a.agency.history=a.agency.history||[];a.agency.interruptions=a.agency.interruptions||[];
 return a.agency;
}
function needReport(a){
 const reserves=Object.fromEntries(reserveNames.map(k=>[k,{reserve:+a.body[k].toFixed(2),status:a.body[k]<20?'severely depleted':a.body[k]<35?'low':a.body[k]>=75?'satisfied':'adequate'}]));
 const urgent=['satiety','hydration','energy','warmth','bladder'].filter(k=>a.body[k]<(k==='bladder'?20:35));
 return {reserves,urgent,meaning:'These are reserves, NOT deficit scores. High means satisfied. Personality is a preference, not a command to ignore hunger, thirst or unfinished work.'};
}
function personalTurns(a){return a.completed+(a.agency?.participations||0);}
function intentProgress(a){
 const id=a.intent?.id;let satisfied=false;
 if(id==='nourish')satisfied=a.body.satiety>=75&&a.body.hydration>=70;
 if(id==='recover')satisfied=a.body.energy>=70&&a.body.warmth>=50;
 if(id==='connect')satisfied=a.body.social>=75;
 if(id==='play')satisfied=a.body.fun>=75;
 const age=personalTurns(a)-(a.intent?.formedAtParticipation??a.intent?.formedAt??0),urgent=needReport(a).urgent;
 const physicalMismatch=urgent.length>0&&!['nourish','recover','care','balance'].includes(id);
 return {id:id||null,satisfied,personalActivitiesSinceChoice:Math.max(0,age),renew:!id||satisfied||age>=3||physicalMismatch||!!a.agency?.reviewDue,reason:!id?'No established intention':satisfied?'Previous immediate goal is satisfied':physicalMismatch?'Body reserves deteriorated while pursuing another goal':a.agency?.reviewDue?'Recorded outcomes require reconsideration':age>=3?'Re-evaluate after several personal activities':'Existing intention still available'};
}
function signature(w,a,obs){
 // Sub-metre animation jitter is not a new discovery. Facts are deliberately coarse,
 // while the actual simulation coordinates and resource quantities stay unchanged.
 const cell=n=>Math.floor(n/4),near=(w.nodes||[]).filter(n=>Math.hypot(a.x-n.x,a.z-n.z)<18).map(n=>[n.id,n.quantity>0?'present':'empty']).sort();
 return JSON.stringify({cell:[cell(a.x),cell(a.z)],people:(obs.nearby||[]).map(b=>[b.id,b.held]).sort(),objects:(obs.objects||[]).map(o=>[o.id,o.type,Math.floor(o.condition/20)]).sort(),resources:near,fire:obs.fire,weather:obs.weather});
}
function observed(w,a,obs){const key=signature(w,a,obs);return (a.experiences.observedScenes||[]).includes(key);}
function recordObservation(w,a,obs){const key=signature(w,a,obs),seen=observed(w,a,obs);a.experiences.observedScenes=[...(a.experiences.observedScenes||[]).filter(k=>k!==key),key].slice(-48);a.experiences.lastObservation=JSON.stringify(obs);return !seen;}
function transferState(w,a,o){
 if(!transfers.has(o.kind))return null;const h=w.households.find(h=>h.id===o.household);if(!h)return null;const r=o.resource||'food';
 // Include currently reserved stock so another person's in-flight withdrawal is not
 // mistaken for disappearance or creation. A repeated own round-trip is only a warning.
 const reserved=Object.values(w.activities).filter(x=>x.actor!==a.id).reduce((n,x)=>n+(r==='food'&&x.householdReservation===h.id?1:0)+(x.storeReservation?.household===h.id&&x.storeReservation.resource===r?x.storeReservation.quantity:0),0);
 return {resource:r,household:h.id,held:a.inventory[r]||0,stored:(r==='food'?h.food:(h.stores?.[r]||0))+reserved};
}
function capture(w,act){return Object.fromEntries(act.participants.map(id=>{const a=w.entities.find(p=>p.id===id);return [id,{body:copy(a.body),bonds:copy(a.bonds||{}),inventory:copy(a.inventory)}];}));}
function interruptions(a,now){return (a.agency?.interruptions||[]).filter(x=>now-x.time<120);}
function onCancel(w,act,reason){
 for(const id of act.participants){const a=w.entities.find(p=>p.id===id);if(!a)continue;const g=ensure(a);
  const row={activity:act.id,action:canon(act.option.id),kind:act.kind,time:w.simTime,workRemaining:Math.max(0,act.duration-act.elapsed),reason};g.interruptions.push(row);g.interruptions=g.interruptions.slice(-16);
  if(interruptions(a,w.simTime).length>=3)g.reviewDue=true;
 }
}
function finish(w,act,before,eventId,text){
 const findings=[];for(const id of act.participants){const a=w.entities.find(p=>p.id===id);if(!a)continue;const g=ensure(a),b=before[id]||{body:a.body,bonds:a.bonds};
  if(id!==act.actor)g.participations++;
  const gains=Object.fromEntries(reserveNames.map(k=>[k,+(a.body[k]-b.body[k]).toFixed(3)]));
  const totalGain=Object.values(gains).reduce((s,n)=>s+Math.max(0,n),0),o=act.option;
  const peer=act.participants.find(p=>p!==id)||o.target||null;
  const relationshipGain=Object.entries(a.bonds||{}).reduce((s,[p,r])=>s+['trust','affection','familiarity','attraction'].reduce((n,k)=>n+Math.max(0,(r[k]||0)-(b.bonds?.[p]?.[k]||0)),0),0);
  const row={event:eventId,activity:act.id,action:canon(o.id),kind:o.kind,time:w.simTime,role:id===act.actor?'initiator':'participant',peer,skill:o.skill||null,resource:o.resource||((o.kind==='store'||o.kind==='retrieve')?'food':null),household:o.household||null,transfer:transferState(w,a,o),gains,relationshipGain,low:false,reasons:[],result:text};
  const previous=g.history.slice(-8),same=previous.filter(x=>x.kind===o.kind&&x.peer===peer&&x.skill===row.skill);
  if(['observe','explore'].includes(o.kind)&&text.startsWith('No new'))row.reasons.push('Observed the same recorded facts again; no new evidence.');
  const restorative=['eat','meal','dine','drink','drink_node','drink_carried','rest','sleep','furniture_rest','furniture_sleep','furniture_wash','furniture_relieve','wash','relieve','run','play','remember'];
  if(restorative.includes(o.kind)&&totalGain<7)row.reasons.push('Less than seven total reserve points restored by this completed activity.');
  if(social.has(o.kind)&&act.decision.response!=='decline'&&same.length>=2&&totalGain<7&&relationshipGain<2&&!act.decision.dialogue)row.reasons.push('Repeated the same nonverbal encounter after social needs and the recorded bond were satisfied.');
  if(act.decision.response==='decline'&&same.length>=2)row.reasons.push('Repeated the same rejected invitation without a new outcome.');
  if(['teach','tutor'].includes(o.kind)&&act.decision.response!=='decline'&&same.length>=2)row.reasons.push('Repeated the same demonstration; another demonstration is not independent practice or mastery.');
  if(row.transfer){const seq=[...previous,row].slice(-4),t=row.transfer;
   if(seq.length===4&&seq.every(x=>x.transfer&&x.transfer.resource===t.resource&&x.transfer.household===t.household)&&JSON.stringify(seq[1].transfer)===JSON.stringify(t)&&seq.some(x=>x.kind==='take_item'||x.kind==='retrieve')&&seq.some(x=>x.kind==='store_item'||x.kind==='store'))row.reasons.push('A repeated storage round-trip returned this material to the same held and stored quantities without transformation.');
  }
  if(o.kind==='gather_node'&&o.resource==='food'&&(b.inventory.food||0)>=5&&b.body.satiety>=75)row.reasons.push('Additional fruit gathered despite an existing reserve and satisfied hunger.');
  row.low=row.reasons.length>0;g.history.push(row);g.history=g.history.slice(-24);
  const recent=g.history.filter((x,i)=>i>=Math.max(0,g.history.length-(g.sinceReview||0)-1)).slice(-6);
  g.sinceReview=(g.sinceReview||0)+1;
  const lowCount=recent.filter(x=>x.low).length;
  if(row.low){g.reviewDue=true;findings.push({person:id,event:eventId,reasons:row.reasons});}
  // A spending guard, not a forced replacement choice. Three verified ineffective
  // completions after review hold the shared clock until explicit observer review.
  if(lowCount>=3){a.cognition.stalled=true;g.stopReason=row.reasons[0]||'Repeated ineffective completed actions.';}
  a.behavior.history.push({action:row.action,time:w.simTime,kind:o.kind,peer,resource:row.resource,event:eventId,low_information:row.low,result:text});a.behavior.history=a.behavior.history.slice(-12);
  a.behavior.stagnant=row.low?(a.behavior.stagnant||0)+1:0;
 }
 return findings;
}
function review(a){const g=ensure(a);g.sinceReview=0;g.stopReason=null;g.reviewDue=true;g.reviewedAt=g.history.at(-1)?.time??-1;a.behavior.stagnant=0;}
function perception(w,a,p){
 const g=a.agency||{history:[],interruptions:[]};const act=w.activities[a.activity];
 p.body_semantics=needReport(a);p.intention_progress=intentProgress(a);
 p.progress_feedback={recent_outcomes:g.history.slice(-8),historical_patterns:g.historicalPatterns||[],reconsideration_required:!!g.reviewDue,stop_reason:g.stopReason||null,participations_completed:g.participations||0,notice:'Diagnostics are measured feedback, not a policy. No action is removed or selected to manufacture variety.'};
 p.interruption_context={current:act?{id:act.id,kind:act.kind,label:act.label,minutesRemaining:+Math.max(0,act.duration-act.elapsed).toFixed(2),fractionComplete:+(act.elapsed/act.duration).toFixed(3),workCanResume:!act.option.target}:null,recent:interruptions(a,w.simTime),unfinished:a.resume||null,warning:'Accepting an invitation cancels the current activity and may delay food, water, sleep or a pending experiment. Consent applies to this encounter only.'};
 p.observation_is_unchanged=observed(w,a,p.visible);
 return p;
}
function annotate(w,a,options){
 return options.map(o=>{const x={...o},g=a.agency||{history:[]};const notes=[];
  if(['eat','meal','dine','gather_node','retrieve','store'].includes(o.kind)&&(o.resource==='food'||['eat','meal','dine','retrieve','store'].includes(o.kind)))notes.push('Own food reserve '+Math.round(a.body.satiety)+'/100; carried fruit '+(a.inventory.food||0)+'. Storing or gathering is not eating.');
  if(['drink','drink_node','drink_carried'].includes(o.kind))notes.push('Own water reserve '+Math.round(a.body.hydration)+'/100; drinking changes hydration, carrying does not.');
  if(['rest','sleep','furniture_rest','furniture_sleep','run'].includes(o.kind))notes.push('Own energy '+Math.round(a.body.energy)+'/100; running spends energy.');
  if(transfers.has(o.kind))notes.push('Relocates existing material only. It does not construct an object or teach a technique.');
  if(o.resumes)notes.push('Resumes already interrupted work; no prior work is completed automatically.');
  const same=g.history.filter(h=>h.action===canon(o.id));if(same.length>=2)notes.push('Completed '+same.length+' times in recent personal history'+(same.at(-1).low?'; last measured outcome was low-benefit.':'.'));
  if(['chat','joke'].includes(o.kind)&&!a.known.language)notes.push('Nonverbal contact only; no shared vocabulary has been learned.');
  x.feedback=notes.join(' ');return x;
 });
}
function goals(){return {nourish:'Address a real hunger or thirst deficit. Get accessible food and consume it; carrying and storing do not nourish.',recover:'Recover depleted energy, warmth or bodily comfort. Stop when adequately recovered.',balance:'Reconsider body needs and practical unfinished work without a permanent top-up routine.',connect:'Meaningful contact with a particular person. Repetition at full social reserve may have no benefit.',care:'Meet a dependent person\'s observable need, not an invented one.',build:'Produce a usable place or object. Moving a material into and out of storage is not construction.',learn:'Try a grounded manipulation or personally practise an observed technique. Another demonstration alone is not mastery.',play:'Seek enjoyment when useful; rest rather than running with depleted energy.'};}
function intentRequest(w,a,model){return {model,state:{subject:perception(w,a,{visible:{}})},questions:{intent:{type:'choice',instructions:'Choose this individual\'s next provisional intention. Consider actual bodily reserves, unfinished activities and recorded repeated outcomes. Traits and preferences are not compulsory routines. Only this intention is chosen here; an action will be chosen in a separate request using it. No invented success or knowledge.',criteria:goals()}}};}
function reviewIntent(a,intent,receipt,w){const g=ensure(a);const reconsidered=g.reviewDue;g.reviewDue=false;if(reconsidered)g.reviewCount=(g.reviewCount||0)+1;a.intent={id:intent,receipt,formedAt:a.completed,formedAtParticipation:personalTurns(a),formedTime:w.simTime};}
function historical(w,a){
 const list=a.behavior?.history||[],p=[];
 const actions=list.map(x=>canon(x.action));if(actions.filter(x=>x==='store_clay'||/^take_.*_clay$/.test(x)).length>=4)p.push('Imported history repeatedly stores and retrieves clay; no progress check existed for that loop.');
 if(actions.filter(x=>/^chat_/.test(x)).length>=4)p.push('Imported history contains repeated encounters with the same person.');
 if(actions.filter(x=>/^(teach|tutor)_/.test(x)).length>=3)p.push('Imported history repeats demonstrations; practical learning still requires the learner\'s own recorded experience.');
 if(a.resume)p.push('This person has unfinished work that was interrupted.');
 return p;
}
function upgrade(w){
 const old=w.agencyVersion;for(const a of w.entities){const fresh=!a.agency;const g=ensure(a);if(fresh){
  g.historicalPatterns=historical(w,a);g.reviewDue=!!g.historicalPatterns.length;
  const events=w.chronicle||[];
  g.interruptions=events.filter(e=>e.kind==='interruption'&&e.people.includes(a.id)).slice(-16).map(e=>({sourceEvent:e.id,activity:e.activity,time:e.time,reason:e.text,workRemaining:null,provenance:'Imported logged interruption; unfinished duration was not recorded.'}));
  g.participations=events.filter(e=>e.kind==='activity_finished'&&e.people.includes(a.id)&&!e.text.startsWith(a.id+':')).length;
 }}
 w.agencyVersion=1;w.version='6.1.0';return old!==1;
}
function audit(w){return w.entities.map(a=>({id:a.id,name:a.observerName,needs:needReport(a),intent:intentProgress(a),recent:a.agency?.history?.slice(-4)||[],historical:a.agency?.historicalPatterns||[],interruptions:interruptions(a,w.simTime),paused:!!a.cognition.stalled,reason:a.agency?.stopReason||null,reviewDue:!!a.agency?.reviewDue,activity:w.activities[a.activity]?.label||'Awaiting a decision'}));}
return {ensure,canon,needReport,intentProgress,personalTurns,observed,recordObservation,capture,onCancel,finish,review,perception,annotate,goals,intentRequest,reviewIntent,upgrade,audit};
});
