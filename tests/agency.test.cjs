'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const L=require('../source/civilization.js'),Session=require('../source/living-session.js'),A=L.agency;
const AUTH=['TEST-ONLY-AUTHORIZATION'];
function op(w,a,id){const x=L.options(w,a).find(x=>x.id===id);assert.ok(x,'Missing option '+id);return x;}
function perform(w,a,id,d={}){const act=L.begin(w,a.id,op(w,a,id),d,AUTH);let i=0;while(w.activities[act.id]&&i++<3000)L.advance(w,.25);assert.ok(!w.activities[act.id]);return act;}
function answer(req,pick={}){return {model:'jev-6.1-TEST-FIXTURE',answers:Object.fromEntries(Object.entries(req.questions).map(([k,q])=>{const choice=pick[k] in q.criteria?pick[k]:Object.keys(q.criteria)[0];return [k,{type:'choice',choice,confidence:1,probabilities:Object.fromEntries(Object.keys(q.criteria).map(x=>[x,x===choice?1:0]))}];})),usage:{cost:0,input_tokens:1}};}
function session(exchange){const s=new Session({fixture:true,exchange});s.connect('TEST-ONLY',{cap:200});return s;}
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../recovery/supplied-v6.snapshot.json'),'utf8'));

test('supplied save has 961 accepted responses, 332 completions, three discoveries and no planner calls',()=>{
 assert.equal(source.attempts,961);assert.equal(source.world.tick,332);assert.equal(source.plannerAttempts,0);
 const req=source.log.filter(r=>r.type==='request');assert.equal(req.length,961);assert.ok(req.every(r=>r.status==='valid'&&r.httpStatus===200));
 assert.equal(source.world.chronicle.filter(e=>e.kind==='learning').length,3);
});
test('restoring the actual supplied world preserves every body, possession, skill and in-flight activity',()=>{
 const s=new Session();s.restore(source);assert.equal(s.world.version,'6.1.0');assert.equal(s.attempts,961);assert.equal(s.config.cap,100);assert.equal(s.running,false);
 for(let i=0;i<6;i++){const a=s.world.entities[i],old=source.world.entities[i];for(const key of ['body','inventory','known','trials','memory','resume','completed','ageYears','bonds'])assert.deepEqual(a[key],old[key],a.id+'.'+key);}
 for(const key of ['activities','locks','nodes','objects','rooms','resources','simTime','tick'])assert.deepEqual(s.world[key],source.world[key],key);
 assert.equal(s.world.entities[2].agency.historicalPatterns.length,1);assert.ok(s.world.entities[0].agency.historicalPatterns.length);
 assert.equal(s.log.filter(r=>r.type==='request').length,961);L.validate(s.world);
});
test('diagnostics and perceptions are read-only and make no world progress or inference',()=>{
 const w=L.genesis(),before=JSON.stringify(w);A.audit(w);L.perception(w,w.entities[0]);assert.equal(JSON.stringify(w),before);
});
test('the original clay loop is detected on real inventory round-trips without inventing progress',()=>{
 const w=L.genesis(),a=w.entities[2],h=w.households[0];a.inventory.clay=1;h.stores.clay=0;
 for(let i=0;i<3;i++){perform(w,a,'store_clay');perform(w,a,'take_'+h.id+'_clay');}
 assert.equal(a.inventory.clay,1);assert.equal(h.stores.clay,0);assert.equal(w.rooms.length,0);assert.deepEqual(a.known,{});
 assert.ok(a.agency.history.some(e=>e.reasons.some(r=>r.includes('round-trip'))));assert.equal(a.cognition.stalled,true);L.validate(w);
});
test('one legitimate deposit and withdrawal are not enough to trigger the guard',()=>{
 const w=L.genesis(),a=w.entities[2];a.inventory.clay=1;perform(w,a,'store_clay');perform(w,a,'take_H1_clay');assert.equal(a.cognition.stalled,false);assert.ok(a.agency.history.every(e=>!e.low));
});
test('completed shared contacts count for the receiver and flag saturated repeated nonverbal contact',()=>{
 const w=L.genesis(),[a,b]=w.entities;for(const p of[a,b]){p.body.social=100;p.body.fun=100;p.body.comfort=100;}L.changeBond(a,b,{trust:100,affection:100,familiarity:100});L.changeBond(b,a,{trust:100,affection:100,familiarity:100});
 for(let i=0;i<5;i++)perform(w,a,'chat_'+b.id,{response:'accept',interrupt:true});
 assert.equal(b.agency.participations,5);assert.equal(b.completed,0);assert.equal(a.completed,5);assert.equal(b.agency.history.length,5);assert.equal(b.cognition.stalled,true);assert.equal(a.cognition.stalled,true);
 assert.ok(w.conversations.every(c=>c.spoken===null));assert.deepEqual(a.lexicon,{});
});
test('a single useful social encounter is not classified as stagnation',()=>{
 const w=L.genesis(),[a,b]=w.entities;a.body.social=b.body.social=15;perform(w,a,'chat_'+b.id,{response:'accept',interrupt:true});assert.ok(a.body.social>30);assert.equal(a.agency.history[0].low,false);assert.equal(b.agency.history[0].low,false);
});
test('identical exploration with small animation jitter supplies no artificial novelty reward',()=>{
 const w=L.genesis(),a=w.entities[0];perform(w,a,'look');a.x+=.001;perform(w,a,'look');
 assert.equal(a.agency.history[1].low,true);assert.match(a.agency.history[1].result,/No new/);assert.equal(a.agency.history[1].gains.fun,0);
 perform(w,a,'explore_pool');perform(w,a,'explore_pool');assert.equal(a.agency.history.at(-1).low,true);assert.equal(a.agency.history.at(-1).kind,'explore');
});
test('localized gathering can resume after cancellation and consumes each unit exactly once',()=>{
 const w=L.genesis(),a=w.entities[0],node=w.nodes.find(n=>n.id==='N_food_0'),total=node.quantity;
 const act=L.begin(w,a.id,op(w,a,'collect_'+node.id),{},AUTH);while(act.elapsed<act.travel+3)L.advance(w,.25);L.cancel(w,act.id,'TEST accepted interruption');
 const resumed=op(w,a,'resume_collect_'+node.id);assert.ok(resumed.duration<10);assert.equal(node.quantity,total);assert.equal(a.inventory.food,0);
 assert.throws(()=>L.begin(w,a.id,resumed,{},[]),/receipt/);perform(w,a,resumed.id);assert.equal(a.inventory.food,3);assert.equal(node.quantity,total-3);assert.equal(a.resume,null);L.validate(w);
});
test('localized drinking has a resumable option as well as base-engine sleep',()=>{
 const w=L.genesis(),a=w.entities[0];const act=L.begin(w,a.id,op(w,a,'drink_N_water_0'),{},AUTH);L.advance(w,1);L.cancel(w,act.id,'TEST');assert.ok(op(w,a,'resume_drink_N_water_0'));assert.equal(a.inventory.water,0);L.validate(w);
});
test('a model-selected intention is supplied before the action request, not independently beside it',async()=>{
 const seen=[];const s=session(async req=>{seen.push(L.clone(req));return answer(req,{intent:'recover',domain:'body',action:'rest',expression:'neutral'});});s.running=true;await s.planCohort();s.pause();
 const goals=seen.filter(r=>r.questions.intent),actions=seen.filter(r=>r.questions.action);assert.equal(goals.length,6);assert.equal(actions.length,6);
 for(const req of actions){assert.equal(req.state.subject.active_intent.id,'recover');assert.ok(!req.questions.intent);assert.ok(req.state.subject.active_intent.receipt);}
 assert.ok(Object.values(s.world.activities).every(a=>a.receipts.length>=3));
});
test('a hungry person can still choose eating after Jev selects a household activity domain',async()=>{
 const seen=[];const s=session(async req=>{seen.push(req);return answer(req,{intent:'nourish',domain:'home',action:'eat',expression:'neutral'});});s.world.entities[0].inventory.food=1;s.world.entities[0].body.satiety=10;s.running=true;await s.planCohort();s.pause();
 const req=seen.find(r=>r.questions.action&&r.state.subject.subject==='S01');assert.ok(req.questions.action.criteria.eat);assert.equal(s.world.activities[s.world.entities[0].activity].kind,'eat');
});
test('simultaneously starting an independent task does not block a pending approach',async()=>{
 const s=session(async req=>answer(req,req.state.subject.subject==='S02'?{intent:'connect',domain:'social',action:'chat_S01',expression:'neutral'}:{intent:'recover',domain:'body',action:'sleep',expression:'neutral'}));s.running=true;await s.planCohort();s.pause();
 const a=s.world.entities[0],b=s.world.entities[1];assert.equal(s.world.activities[a.activity].kind,'sleep');assert.equal(s.world.activities[b.activity].kind,'chat');assert.equal(s.world.activities[b.activity].approachOnly,true);assert.notEqual(a.activity,b.activity);assert.ok(!s.log.some(r=>r.type==='conflict'));L.validate(s.world);
});
test('a pending receiver prompt contains remaining work and bodily cost of interruption',async()=>{
 let seen;const s=session(async req=>{seen=req;return answer(req,{response:'decline',reaction:'neutral'});});const w=s.world,[a,b]=w.entities;a.body.hydration=20;b.x=a.x+1;b.z=a.z;
 const work=L.begin(w,a.id,op(w,a,'drink_N_water_0'),{},AUTH);const invitation=L.begin(w,b.id,op(w,b,'chat_S01'),{response:'pending'},AUTH);
 // Put this arrival at actual contact without calling the renderer or generating a choice.
 a.x=b.x+1;a.z=b.z;invitation.awaitingResponse=true;
 const p=await s.respond(invitation.id,{epoch:0,cohort:1,controller:new AbortController()});
 assert.equal(seen.state.subject.interruption_context.current.id,work.id);assert.ok(seen.state.subject.body_semantics.urgent.includes('hydration'));
 L.resolveEncounter(w,invitation.id,p.d,p.receipts);assert.equal(a.activity,work.id);assert.equal(w.activities[work.id].elapsed,0);s.pause();
});
test('budget preflight includes staged intention and domain calls, not only one call per person',async()=>{
 let called=0;const s=session(async req=>{called++;return answer(req);});s.config.cap=12;s.running=true;await s.planCohort();assert.equal(called,0);assert.equal(s.status,'budget');assert.equal(s.world.simTime,0);s.pause();
});
test('a spending stop cannot refill needs, add resources, choose an action or consume another request',()=>{
 const s=session(async()=>{throw Error('NO REQUEST EXPECTED');}),a=s.world.entities[0];a.cognition.stalled=true;a.agency.stopReason='TEST measured loop';const before={body:L.clone(a.body),inventory:L.clone(a.inventory),known:L.clone(a.known)};s.running=true;s.pump(1);assert.equal(s.running,false);assert.equal(s.state,'review');assert.equal(s.attempts,0);assert.equal(Object.keys(s.world.activities).length,0);for(const k of Object.keys(before))assert.deepEqual(a[k],before[k]);s.pause();
});
test('explicit review clears the stop but preserves evidence and marks the next intention for Jev',()=>{
 const w=L.genesis(),a=w.entities[0];a.agency.history.push({time:1,low:true,result:'TEST'});a.cognition.stalled=true;a.agency.stopReason='TEST';const saved=JSON.stringify(a.agency.history);A.review(a);assert.equal(JSON.stringify(a.agency.history),saved);assert.equal(a.agency.reviewDue,true);assert.equal(a.agency.sinceReview,0);assert.equal(a.body.satiety,72);
});
test('receiver consent remains a model decision, not an automatic bodily-priority rule',async()=>{
 const s=session(async req=>answer(req,{response:'accept',reaction:'neutral'})),w=s.world,[a,b]=w.entities;b.body.satiety=5;
 const act=L.begin(w,a.id,op(w,a,'chat_S02'),{response:'pending'},AUTH);act.awaitingResponse=true;a.x=b.x-1;a.z=b.z;
 const p=await s.respond(act.id,{epoch:0,cohort:1,controller:new AbortController()});L.resolveEncounter(w,act.id,p.d,p.receipts);assert.ok(act.participants.includes(b.id));assert.equal(b.body.satiety,5);assert.ok(s.log.some(r=>r.phase==='Independent response at encounter'));s.pause();
});
