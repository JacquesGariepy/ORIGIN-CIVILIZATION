/* ORIGIN / CIVILIZATION 6. Physical world expansion, individual lives, and economy.
   New voluntary actions require Jev receipts. Scenario seeds are explicitly recorded.
   Geographic observations and generated gameplay fields always have separate provenance. */
(function(root,factory){const node=typeof module==='object'&&module.exports;
 const M=factory(node?require('./life.js'):root.OriginLife,node?require('./civil/terrain.js'):root.OriginTerrain,node?require('./civil/catalog.js'):root.OriginCatalog);
 if(node)module.exports=M;else {root.OriginCivil=M;root.OriginLife=M;}
})(globalThis,function(L,T,D){
'use strict';
const {clone,clamp,dist}=L,SEED='DECLARED-SCENARIO-SEED';
Object.assign(L.RECIPES,D.RECIPES);
for(const [id,f]of Object.entries(D.FURNITURE))L.OBJECTS[id]={label:f.label,skill:f.skill,slots:f.slots,...f.cost};
const point=(x,z)=>({x,z}),own=(w,a)=>w.households.find(h=>h.id===a.household),nonzero=o=>Object.fromEntries(Object.entries(o||{}).filter(([,n])=>n>0));
const has=(a,k)=>!!a.known[k],pay=(a,c)=>Object.entries(c||{}).every(([k,n])=>(a.inventory[k]||0)>=n);
const mass=a=>Object.entries(a.inventory).reduce((v,[k,n])=>v+n*(D.ITEMS[k]?.mass||.5),0);
const capacity=a=>a.ageYears<5?3:a.ageYears<13?12:38;
const addItem=(a,k,n)=>{a.inventory[k]=(a.inventory[k]||0)+n;};
const sumNodes=(w,k)=>w.nodes.filter(n=>n.kind===k).reduce((s,n)=>s+n.quantity,0);
const record=(w,kind,text,people=[],data={})=>{const e=L.event(w,kind,text,people,data);for(const id of people){const a=L.byId(w,id);if(a)L.remember(w,a,e);}return e;};
function object(w,o){const f=D.FURNITURE[o.type];o.rotation=o.rotation||0;o.size=f?.size||(['shelter'].includes(o.type)?[3,3]:['bed'].includes(o.type)?[1,1.8]:[1.5,1.2]);o.public=o.public??false;o.stored=o.stored||{};o.powered=false;o.waterLevel=o.waterLevel||0;}
function person(w,a,extra={}){
 for(const k of Object.keys(D.ITEMS))a.inventory[k]=a.inventory[k]||0;
 a.identity=a.identity||{name:a.observerName,pronouns:a.gestates?'she/her':'he/him',favoriteColor:a.cloth};
 a.aspiration=a.aspiration||null;a.practice=a.practice||{};a.habits=a.habits||{};a.moodlets=a.moodlets||[];a.commitments=a.commitments||[];a.journal=a.journal||[];
 a.seenNodes=a.seenNodes||[];a.education=a.education||{lessons:0,practice:0};a.artifacts=a.artifacts||[];
 if(extra.parents){const [p,q]=extra.parents;const n=T.hash(a.id);a.traits=[p.traits[n%p.traits.length],q.traits[(n>>>4)%q.traits.length]];a.skin=n%2?p.skin:q.skin;a.hair=n%3?p.hair:q.hair;a.identity.name='Child '+a.id.slice(1);a.observerName=a.identity.name;a.journal=[];a.practice={};a.aspiration=null;}
}
function seedNodes(w,preserve=true){
 const stock=preserve?clone(w.resources):clone(L.RESOURCES),coords={food:[[-12,-8],[-25,17],[9,28]],wood:[[-15,10],[-28,-18],[0,30]],stone:[[13,-9],[32,-24],[-29,-25]],fibre:[[-11,15],[-26,14],[7,27]],water:[[12,1],[21,20],[22,-24]],clay:[[15,10],[19,-12]],ore:[[12,16],[34,25]],copper:[[17,-18],[31,-27]],silica:[[16,20],[-30,4]],coal:[[-20,21],[-32,-22]]};w.nodes=[];
 for(const [kind,list]of Object.entries(coords)){const total=stock[kind]||0;list.forEach(([x,z],i)=>{const qty=i===list.length-1?total-Math.floor(total/list.length)*(list.length-1):Math.floor(total/list.length);w.nodes.push({id:'N_'+kind+'_'+i,kind,x,z,quantity:qty,capacity:qty,reserved:0,renewable:['food','wood','fibre','water'].includes(kind),recovery:0,quality:kind==='water'?.75:1,provenance:'Generated scenario stock; not a measured Earth deposit'});});}
 for(const k of Object.keys(coords))w.resources[k]=sumNodes(w,k);
}
function ensure(w,seeded=false){
 if(w.civilVersion===6){L.agency.upgrade(w);return w;}
 w.civilVersion=6;w.version='6.1.0';w.terrain=w.terrain||T.create(w.location?{lat:w.location.latitude||36.1,lon:w.location.longitude||37.2}:undefined);w.climate=T.climate(w);
 w.location={name:'Earth-anchored valley',latitude:w.terrain.anchor.lat,longitude:w.terrain.anchor.lon,provenance:w.terrain.provenance};
 w.rooms=w.rooms||[];w.institutions=w.institutions||[];w.contracts=w.contracts||[];w.trades=w.trades||[];w.artifacts=w.artifacts||[];w.conversations=w.conversations||[];w.projects=w.projects||[];
 w.networks=w.networks||{energy:0,water:0,generated:0,consumed:0};w.society=w.society||{births:0,lessons:0,workDelivered:0,barters:0,stories:0};w.ecology=w.ecology||{regrown:0,harvested:0,waterUsed:0,pollution:0};w.physicalEvents=w.physicalEvents||[];w.lastEcologyDay=Math.floor(w.simTime/1440);
 w.settings.maxPopulation=Math.min(64,w.settings.maxPopulation||32);w.settings.cognitionLimit=10;w.settings.maxLogRows=10000;w.settings.scenarioNotice='All initial relationships, ages, coins, structures and abilities are declared initial conditions, not discoveries.';
 for(const a of w.entities)person(w,a);for(const h of w.households){h.stores=h.stores||{wood:h.wood||0};h.homePrivacy=true;h.name=h.name||h.id;}for(const o of w.objects)object(w,o);
 seedNodes(w,true);
 if(seeded){for(const h of w.households){const r={id:'ROOM-'+h.id,x:h.home.x,z:h.home.z,width:8,depth:8,door:'south',household:h.id,progress:4,phases:4,built:true,roof:true,condition:100,material:{wood:5,fibre:3,stone:2},receipt:SEED};w.rooms.push(r);}for(const a of w.entities)if(a.ageYears>=18){a.inventory.coin=12;a.known.carpentry={evidence:SEED};a.known.weaving={evidence:SEED};}}
 return w;
}
function init(w,scenario){ensure(w,scenario==='homestead');}
function category(o){if(o.category)return o.category;if(o.target)return ['care','feed','teach','tutor'].includes(o.kind)?'family':'social';if(['gather','gather_node','explore','survey','plant','tend','harvest','plant_crop','compost'].includes(o.kind))return 'resources';if(['build','clean','repair','store','retrieve','room_build','store_item','take_item','renovate'].includes(o.kind))return 'home';if(['experiment','manufacture','study','record_knowledge','program','craft_item'].includes(o.kind))return 'craft';if(['play','run','paint','music','dance','remember','purpose'].includes(o.kind))return 'play';if(['contract','deliver_contract'].includes(o.kind))return 'economy';return 'body';}
function options(w,a,base){ensure(w);if(a.ageYears<2)return base;
 let out=base.filter(o=>!['gather','drink'].includes(o.kind));const add=(id,label,kind,duration,p=null,extra={})=>out.push({id,label,kind,duration,point:p,...extra});
 const free=capacity(a)-mass(a);
 // Visible physical quantities, not an omniscient global ore inventory.
 for(const n of w.nodes){if(dist(a,n)>38&&!a.seenNodes.includes(n.id))continue;const unit=D.ITEMS[n.kind]?.mass||1;
  if(n.kind==='water'){if(n.quantity>=1)add('drink_'+n.id,'Drink at '+n.id+'; hydration '+Math.round(a.body.hydration)+'/100','drink_node',6,point(n.x-.9,n.z),{node:n.id,nodeQuantity:1});if(free>=1&&n.quantity>=1)add('fill_'+n.id,'Carry water from '+n.id,'gather_node',8,point(n.x-.9,n.z),{resource:'water',node:n.id,nodeQuantity:Math.min(3,n.quantity,Math.floor(free)),category:'resources'});}
  else if((a.ageYears>=8||['food','fibre'].includes(n.kind))&&n.quantity>=1&&free>=unit){const amount=Math.min(n.kind==='food'?3:4,n.quantity,Math.floor(free/unit));if(amount>=1)add('collect_'+n.id,'Collect '+amount+' '+n.kind+' from '+n.id+'; '+n.quantity+' remaining','gather_node',10,point(n.x,n.z),{resource:n.kind,node:n.id,nodeQuantity:amount,category:'resources'});}
 }
 if(a.inventory.meal>0)add('eat_meal','Eat a prepared portion','meal',12,null,{cost:{meal:1}});
 if(a.inventory.bread>0)add('eat_bread','Eat bread','meal',10,null,{cost:{bread:1}});
 if(a.inventory.water>0)add('drink_carried','Drink carried water','drink_carried',4,null,{cost:{water:1}});
 const h=own(w,a);
 if(h&&a.ageYears>=5){for(const [k,n]of Object.entries(nonzero(a.inventory)).filter(([k])=>k!=='food'))if(n>=1)add('store_'+k,'Put one '+k+' into '+h.name+' storage','store_item',6,h.home,{household:h.id,resource:k,cost:{[k]:1}});
  for(const [k,n]of Object.entries(nonzero(h.stores)))if(n>=1&&free>=(D.ITEMS[k]?.mass||1))add('take_'+h.id+'_'+k,'Take one '+k+' from own household storage','take_item',5,h.home,{household:h.id,resource:k,storeQuantity:1});}
 for(const o of w.objects.filter(o=>o.condition>5&&dist(a,o)<35&&(o.household===a.household||o.public))){const f=D.FURNITURE[o.type];if(!f)continue;if(f.use==='infant_rest'||f.use==='maintain')continue;
  if((f.power&&!o.powered)||(f.water&&(w.networks.water<f.water&&a.inventory.water<f.water)))continue;
  const p={x:o.x,z:o.z+.65};
  if(f.use==='craft'){if(a.ageYears>=8&&has(a,'pottery')&&w.fire.fuel>0&&pay(a,{clay:2,wood:1}))add('wheel_pot_'+o.id,'Shape and fire a vessel at the wheel','craft_item',35,p,{object:o.id,cost:{clay:2,wood:1},output:{pot:1},requiresHeat:true,category:'craft'});}
  else if(f.use==='research'){if(a.ageYears>=8)for(const skill of Object.keys(L.RECIPES))if(L.recipePossible(w,a,skill)){const r=L.RECIPES[skill];add('lab_'+o.id+'_'+skill,'Experiment at the bench: '+r.name,'experiment',r.minutes,p,{object:o.id,skill,cost:r.material,category:'craft'});}}
  else if(f.use==='train'){if(a.ageYears>=8&&has(a,'computing')&&w.measurements.filter(m=>m.observer===a.id).length>=8)add('train_'+o.id,'Fit and evaluate a numeric predictor on measured crop data','train_model',55,p,{object:o.id,category:'craft'});}
  else if(f.use==='trade'){if(L.adult(a)&&a.inventory.coin>=4)for(const resource of ['wood','stone','fibre'])add('market_'+o.id+'_'+resource,'Post a funded '+resource+' delivery contract at the market','contract',12,p,{object:o.id,resource,cost:{coin:4},category:'economy'});}
  else if(f.use==='cook_batch'){if(pay(a,{food:3,wood:1}))add('cook_batch_'+o.id,'Prepare three portions at the stove','cook_batch',30,p,{object:o.id,cost:{food:3,wood:1},category:'body'});}
  else if(f.use==='weave'){if(pay(a,{fibre:4}))add('weave_'+o.id,'Weave cloth on the loom','craft_item',30,p,{object:o.id,cost:{fibre:4},output:{cloth:2},category:'craft'});}
  else if(f.use==='mill'){if(pay(a,{grain:2,wood:1}))add('mill_'+o.id,'Grind grain and prepare bread','craft_item',30,p,{object:o.id,cost:{grain:2,wood:1},output:{bread:3},category:'craft'});}
  else if(f.use==='pump'){const water=w.nodes.find(n=>n.kind==='water'&&n.quantity>=3&&dist(n,o)<12);if(water)add('pump_'+o.id,'Pump water into the settlement cistern','pump',18,p,{object:o.id,node:water.id,nodeQuantity:3,category:'home'});}
  else if(f.use==='fill'){if(a.inventory.water>=2)add('cistern_'+o.id,'Store two carried water units in cistern','fill_cistern',8,p,{object:o.id,cost:{water:2},category:'home'});}
  else if(f.use==='compost'){if(a.inventory.food>=1)add('compost_'+o.id,'Compost a food portion','compost',25,p,{object:o.id,cost:{food:1},category:'resources'});}
  else if(f.use==='store'){if(a.inventory.food)add('cold_store_'+o.id,'Store a fruit in cold storage','store_cold',6,p,{object:o.id,cost:{food:1},household:a.household,category:'home'});}
  else if(f.use==='write'){if(has(a,'writing')&&a.inventory.paper>0)for(const skill of Object.keys(a.known).filter(k=>L.RECIPES[k]))add('write_'+o.id+'_'+skill,'Record known '+L.RECIPES[skill].name,'record_knowledge',30,p,{object:o.id,skill,cost:{paper:1},category:'craft'});}
  else if(['read','study'].includes(f.use)){for(const book of w.artifacts.filter(b=>b.type==='knowledge'&&!a.known[b.skill]&&b.author!==a.id&&b.household===a.household).slice(0,6))add('study_'+book.id+'_'+o.id,'Study recorded '+L.RECIPES[book.skill]?.name,'study',30,p,{object:o.id,artifact:book.id,skill:book.skill,category:'craft'});}
  else if(f.use==='compute'){if(has(a,'computing'))add('program_'+o.id,'Run and test a bounded arithmetic program','program',35,p,{object:o.id,category:'craft'});}
  else {const use=f.use==='sit'?'furniture_rest':f.use==='sleep'?'furniture_sleep':f.use==='wash'?'furniture_wash':f.use==='relieve'?'furniture_relieve':f.use==='dine'?'dine':f.use;
   if(use==='dine'&&a.inventory.food<1)continue;add('use_'+o.id,'Use '+f.label+' / '+f.use,use,f.use==='sleep'?90:18,p,{object:o.id,effect:f.need,waterUse:f.water||0,...(use==='dine'?{cost:{food:1}}:{}),category:['paint','music','play','remember'].includes(use)?'play':'body'});}
 }
 if(a.ageYears>=8){
  for(const room of w.rooms.filter(r=>!r.built)){if(pay(a,room.material))add('room_'+room.id,'Build phase '+(room.progress+1)+'/'+room.phases+' of '+room.name,'room_build',45,point(room.x,room.z),{room:room.id,cost:room.material,extraLocks:['room:'+room.id],category:'home'});}
  if(has(a,'farming')&&a.inventory.seed>=2)for(const crop of ['grain','beans','fibre'])add('plant_'+crop,'Plant a '+crop+' patch','plant_crop',22,point(3+(w.plots.length%4)*2,19+Math.floor(w.plots.length/4)*2),{crop,cost:{seed:2},category:'resources'});
  if(a.inventory.compost>0)for(const p of w.plots.filter(p=>!p.harvested).slice(0,8))add('fertilize_'+p.id,'Fertilize '+p.id,'fertilize',12,p,{plot:p.id,cost:{compost:1},category:'resources'});
  if(!a.aspiration)for(const [id,g]of Object.entries(D.GOALS))add('purpose_'+id,'Adopt a personal project: '+g.label,'purpose',4,null,{goal:id,category:'play'});
  if(has(a,'writing'))for(const k of Object.keys(a.known).filter(k=>L.RECIPES[k]))if(a.inventory.clay>=1)add('record_'+k,'Record remembered '+L.RECIPES[k].name+' in clay','record_knowledge',25,null,{skill:k,cost:{clay:1},category:'craft'});
  for(const b of w.entities.filter(b=>b.id!==a.id&&b.alive&&dist(a,b)<20).slice(0,10)){
   if(a.inventory.food>0&&b.inventory.wood>=2)add('barter_'+b.id,'Offer one food for two wood to '+b.id,'barter',12,point(b.x-.8,b.z+.5),{target:b.id,give:{food:1},receive:{wood:2},cost:{food:1},category:'economy'});
   if(a.inventory.wood>=2&&b.inventory.food>0)add('barter_food_'+b.id,'Offer two wood for one food to '+b.id,'barter',12,point(b.x-.8,b.z+.5),{target:b.id,give:{wood:2},receive:{food:1},cost:{wood:2},category:'economy'});
   if((a.bonds[b.id]?.resentment||0)>0)add('apologize_'+b.id,'Offer an apology to '+b.id,'apologize',10,point(b.x-.8,b.z+.5),{target:b.id,category:'social'});
   add('disagree_'+b.id,'Express a disagreement to '+b.id,'disagree',12,point(b.x-.8,b.z+.5),{target:b.id,category:'social'});
   if(has(a,'language')){add('story_'+b.id,'Share an experienced story with '+b.id,'tell_story',20,point(b.x-.8,b.z+.5),{target:b.id,category:'social'});add('celebrate_'+b.id,'Invite '+b.id+' to celebrate together','celebrate',25,point(b.x-.8,b.z+.5),{target:b.id,category:'play'});}
   if(L.adult(a)&&b.ageYears>=5&&b.ageYears<18)for(const k of Object.keys(a.known).filter(k=>!b.known[k]&&L.RECIPES[k]).slice(0,4))add('tutor_'+b.id+'_'+k,'Offer a practical lesson in '+L.RECIPES[k].name+' to '+b.id,'tutor',30,point(b.x-.8,b.z+.5),{target:b.id,skill:k,category:'family'});
  }
 }
 if(L.adult(a)){
  if(a.inventory.coin>=4)for(const resource of ['wood','stone','fibre'])add('contract_'+resource,'Fund a contract: pay four tokens for two '+resource,'contract',8,null,{resource,cost:{coin:4},category:'economy'});
  for(const job of w.contracts.filter(j=>j.state==='open'&&j.owner!==a.id))if(pay(a,{[job.resource]:job.quantity}))add('deliver_'+job.id,'Deliver '+job.quantity+' '+job.resource+' for '+job.reward+' exchange tokens','deliver_contract',15,job.point,{contract:job.id,cost:{[job.resource]:job.quantity},extraLocks:['contract:'+job.id],category:'economy'});
 }
 // A learning witness still needs a personal practical trial; no instant teacher memory copying.
 out=out.filter(o=>!(o.kind==='teach'&&a.ageYears<8));
 return out.map(o=>({...o,category:category(o)}));
}
function perception(w,a,p){ensure(w);const h=own(w,a);p.terrain={anchor:w.terrain.anchor,localCell:T.cell(w.terrain,a.x,a.z),source:w.terrain.provenance};p.environment={...w.climate,localResources:w.nodes.filter(n=>dist(a,n)<18).map(n=>({id:n.id,kind:n.kind,remaining:n.quantity,position:{x:n.x,z:n.z},source:n.provenance}))};p.identity=a.identity;p.aspiration=a.aspiration;p.practice=clone(a.practice);p.moodlets=a.moodlets.filter(m=>m.until>w.simTime);p.capacity={carriedMass:+mass(a).toFixed(2),limit:capacity(a),unit:'declared game kilograms'};p.household=h?{id:h.id,name:h.name,members:h.members,home:h.home,observedStores:dist(a,h.home)<10?{food:h.food,...h.stores}:null}:null;
 p.publicContracts=w.contracts.filter(c=>c.state==='open').map(c=>({id:c.id,owner:c.owner,resource:c.resource,quantity:c.quantity,reward:c.reward}));p.knownRecordedWorks=w.artifacts.filter(b=>b.household===a.household).map(b=>({id:b.id,title:b.title,author:b.author,skill:b.skill}));p.latestConversation=w.conversations.filter(c=>c.people.includes(a.id)).slice(-2);p.physicalNotice='World dynamics are modeled. Map coastline is real geographic data; deposits and local ecology are generated unless explicitly imported. Do not infer unobserved buried resources.';
 return p;
}
function prepare(w,a,o,d){
 if(o.node){const n=w.nodes.find(n=>n.id===o.node);if(!n||n.quantity<(o.nodeQuantity||0))throw Error('That localized stock was taken by another life. Reassess.');}
 if(o.storeQuantity){const h=w.households.find(h=>h.id===o.household);if((h?.stores[o.resource]||0)<o.storeQuantity)throw Error('Household stock already reserved.');}
 if(o.kind==='deliver_contract'&&w.contracts.find(j=>j.id===o.contract)?.state!=='open')throw Error('Contract already claimed.');
 if(o.kind==='build'){if(w.rooms.some(r=>r.built&&T.wallBlocked?.(w,o.point.x,o.point.z)))throw Error('Cannot place furniture through a wall.');}
 if(o.kind==='room_build'&&w.rooms.find(r=>r.id===o.room)?.built)throw Error('Room already complete.');
 if(o.kind==='barter'&&d.response==='accept'&&!pay(L.byId(w,o.target),o.receive))throw Error('Other participant no longer has the proposed goods.');
}
function reserve(w,act){const o=act.option;if(o.node){const n=w.nodes.find(n=>n.id===o.node),q=o.nodeQuantity;n.quantity-=q;n.reserved+=q;w.resources[n.kind]-=q;act.nodeReservation={id:n.id,kind:n.kind,quantity:q};}
 if(o.storeQuantity){const h=w.households.find(h=>h.id===o.household);h.stores[o.resource]-=o.storeQuantity;act.storeReservation={household:h.id,resource:o.resource,quantity:o.storeQuantity};}
 if(o.kind==='deliver_contract'){const j=w.contracts.find(j=>j.id===o.contract);j.state='reserved';j.claimant=act.actor;act.contractReservation=j.id;}
 act.epochOrigin=w.revision;
}
function cancel(w,act){if(!act.nodeReservation&&act.reserved){for(const [kind,q]of Object.entries(act.reserved)){const n=w.nodes.find(n=>n.kind===kind);if(n){n.quantity+=q;n.capacity=Math.max(n.capacity,n.quantity+n.reserved);}}}if(act.nodeReservation){const r=act.nodeReservation,n=w.nodes.find(n=>n.id===r.id);n.quantity+=r.quantity;n.reserved-=r.quantity;w.resources[r.kind]+=r.quantity;act.nodeReservation=null;}if(act.storeReservation){const r=act.storeReservation,h=w.households.find(h=>h.id===r.household);h.stores[r.resource]=(h.stores[r.resource]||0)+r.quantity;act.storeReservation=null;}if(act.contractReservation){const j=w.contracts.find(j=>j.id===act.contractReservation);if(j?.state==='reserved'){j.state='open';j.claimant=null;}act.contractReservation=null;}}
function beforeFinish(w,act){const a=L.byId(w,act.actor),o=act.option,b=o.target?L.byId(w,o.target):null;
 if(o.target&&act.decision.response==='decline')return;
 if(o.requiresHeat&&w.fire.fuel<=0)throw Error('Heat source required to finish this work.');
 if(o.kind==='train_model'&&w.measurements.filter(m=>m.observer===a.id).length<8)throw Error('Insufficient independently recorded samples.');
 if(o.kind==='program'){if(!Array.isArray(act.decision.program))throw Error('No Jev-authorized program was supplied.');L.runProgram(act.decision.program);}
 if(['experiment','manufacture'].includes(o.kind)&&['glassmaking','refining_copper','baking','silicon_processing','photovoltaics','masonry'].includes(o.skill)&&w.fire.fuel<=0)throw Error('Heat source required for this process.');
 if(o.kind==='barter'&&!pay(b,o.receive))throw Error('Barter quantities changed; no transfer made.');
 if(o.waterUse&&w.networks.water<o.waterUse&&a.inventory.water<o.waterUse)throw Error('Water supply ran out before use.');
 const ob=o.object?w.objects.find(x=>x.id===o.object):null;if(ob&&D.FURNITURE[ob.type]?.power&&!ob.powered)throw Error('Power failed before completion.');
 if(o.kind==='deliver_contract'&&w.contracts.find(j=>j.id===o.contract)?.claimant!==a.id)throw Error('Contract reservation no longer valid.');
}
function complete(w,act){const a=L.byId(w,act.actor),o=act.option,b=o.target?L.byId(w,o.target):null,d=act.decision;let text,candidates=[];const ob=o.object?w.objects.find(x=>x.id===o.object):null;
 if(act.nodeReservation&&['gather_node','drink_node','pump'].includes(o.kind)){const r=act.nodeReservation,n=w.nodes.find(n=>n.id===r.id);n.reserved-=r.quantity;act.nodeReservation=null;w.ecology.harvested+=r.quantity;a.seenNodes=[...new Set([...a.seenNodes,n.id])];
  if(o.kind==='gather_node'){addItem(a,o.resource,r.quantity);text='Collected '+r.quantity+' '+o.resource+' from '+n.id+'. These units are no longer available to others.';}
  if(o.kind==='drink_node'){a.body.hydration=clamp(a.body.hydration+40);a.body.bladder=clamp(a.body.bladder-7);w.ecology.waterUsed+=r.quantity;text='Drank from localized water source '+n.id+'.';}
  if(o.kind==='pump'){w.networks.water+=r.quantity;text='Pumped '+r.quantity+' finite water units into settlement storage.';}
 }
 else switch(o.kind){
  case 'meal':a.body.satiety=clamp(a.body.satiety+42);a.body.comfort=clamp(a.body.comfort+8);text='Ate one prepared portion.';break;
  case 'drink_carried':a.body.hydration=clamp(a.body.hydration+40);text='Consumed carried water.';break;
  case 'store_item':{const h=w.households.find(h=>h.id===o.household);h.stores[o.resource]=(h.stores[o.resource]||0)+1;text='Stored one '+o.resource+' for the household.';break;}
  case 'take_item':addItem(a,o.resource,act.storeReservation.quantity);act.storeReservation=null;text='Retrieved the reserved household '+o.resource+'.';break;
  case 'furniture_rest':case 'furniture_sleep':case 'furniture_wash':case 'furniture_relieve':case 'dine':{for(const [k,n]of Object.entries(o.effect||{}))a.body[k]=clamp(a.body[k]+n);if(o.kind==='dine')a.body.satiety=clamp(a.body.satiety+25);if(o.waterUse){if(w.networks.water>=o.waterUse)w.networks.water-=o.waterUse;else a.inventory.water-=o.waterUse;}text='Used '+ob.type+' in a reserved place, with its actual supplies.';break;}
  case 'cook_batch':addItem(a,'meal',3);text='Converted three fruit portions and one wood into three prepared meals.';break;
  case 'craft_item':for(const [k,n]of Object.entries(o.output))addItem(a,k,n);text='Processed finite materials at '+ob.type+'.';break;
  case 'fill_cistern':w.networks.water+=2;text='Stored two carried water units.';break;
  case 'store_cold':own(w,a).food++;text='Stored a portion in powered cold storage.';break;
  case 'compost':addItem(a,'compost',1);text='Converted one food portion to compost.';break;
  case 'fertilize':{const p=w.plots.find(p=>p.id===o.plot);p.fertility=Math.min(1,(p.fertility||.5)+.25);text='Added compost to '+p.id+'.';break;}
  case 'room_build':{const r=w.rooms.find(r=>r.id===o.room);r.progress++;r.contributors=[...new Set([...(r.contributors||[]),a.id])];r.receipts=[...(r.receipts||[]),...act.receipts];r.built=r.progress>=r.phases;text='Constructed phase '+r.progress+'/'+r.phases+' of '+r.name+(r.built?'. The walls, doorway and roof now exist.':'. More material work remains.');break;}
  case 'plant_crop':{const p={id:'P6-'+w.serial++,owner:a.id,x:a.x,z:a.z,crop:o.crop,growth:0,tended:1,moisture:.55,fertility:T.cell(w.terrain,a.x,a.z)?.fertility||.5,harvested:false,plantedAt:w.simTime};w.plots.push(p);text='Planted '+o.crop+' using two seeds; time, water and soil now affect yield.';break;}
  case 'harvest':{const p=w.plots.find(p=>p.id===o.plot);if(!p.crop)return null;const yieldN=Math.max(1,Math.round(3+3*(p.fertility||.5)));p.harvested=true;addItem(a,p.crop,yieldN);addItem(a,'seed',2);text='Harvested '+yieldN+' '+p.crop+' and recovered two seeds.';break;}
  case 'purpose':a.aspiration={id:o.goal,label:D.GOALS[o.goal].label,progress:0,target:D.GOALS[o.goal].target,receipt:act.receipts[0],since:w.simTime};text='Chose a persistent personal project: '+a.aspiration.label+'.';break;
  case 'barter':for(const [k,n]of Object.entries(o.receive)){b.inventory[k]-=n;addItem(a,k,n);}for(const [k,n]of Object.entries(o.give))addItem(b,k,n);w.society.barters++;w.trades.push({id:'TRADE-'+w.serial++,time:w.simTime,from:a.id,to:b.id,give:o.give,receive:o.receive,receipts:act.receipts});L.changeBond(a,b,{trust:2});L.changeBond(b,a,{trust:2});text='Both accepted a barter. Goods changed hands without duplication.';break;
  case 'contract':{const j={id:'JOB-'+w.serial++,owner:a.id,household:a.household,resource:o.resource,quantity:2,reward:4,escrow:4,state:'open',point:{x:a.x,z:a.z},receipt:act.receipts[0]};w.contracts.push(j);text='Escrowed four exchange tokens for a two-'+o.resource+' delivery contract.';break;}
  case 'deliver_contract':{const j=w.contracts.find(j=>j.id===o.contract),owner=L.byId(w,j.owner);addItem(owner,j.resource,j.quantity);addItem(a,'coin',j.escrow);j.paid=j.escrow;j.escrow=0;j.state='completed';j.completedAt=w.simTime;j.worker=a.id;j.receipts=act.receipts;act.contractReservation=null;w.society.workDelivered++;text='Delivered contract '+j.id+'; earned '+j.reward+' previously escrowed exchange tokens.';break;}
  case 'apologize':L.changeBond(b,a,{resentment:-12,trust:3});L.changeBond(a,b,{resentment:-5});text='The apology was heard and accepted; the two directions of the relationship changed separately.';break;
  case 'disagree':L.changeBond(a,b,{resentment:6});L.changeBond(b,a,{resentment:d.reaction==='annoyed'?12:3,trust:-2});text='Expressed disagreement. Each participant retained a different emotional effect.';break;
  case 'tell_story':case 'celebrate':for(const p of [a,b]){p.body.social=clamp(p.body.social+24);p.body.fun=clamp(p.body.fun+25);}L.changeBond(a,b,{familiarity:5,affection:3});L.changeBond(b,a,{familiarity:5,affection:d.reaction==='pleased'?5:1});w.society.stories++;text=o.kind==='celebrate'?'Shared a mutually accepted celebration.':'Shared an account grounded in personal memory.';break;
  case 'tutor':b.education.lessons++;w.society.lessons++;b.practice[o.skill]=(b.practice[o.skill]||0)+.5;candidates.push({who:b.id,skill:o.skill,supported:false,feedback:'Attended a practical lesson from '+a.id+'. Personal practice is still required.',teacher:a.id});L.changeBond(b,a,{trust:4,affection:2});text='Attended a lesson; no adult skill or memory was copied into the child.';break;
  case 'teach':b.practice[o.skill]=(b.practice[o.skill]||0)+.5;candidates.push({who:b.id,skill:o.skill,supported:false,feedback:'Observed a demonstration of '+o.skill+'. A demonstration is evidence to try, not practical competence.',teacher:a.id});text='Observed a demonstration and retained a practice lead, not a finished ability.';break;
  case 'record_knowledge':{const skill=o.skill||Object.keys(a.known).find(k=>L.RECIPES[k]);if(!skill){text='Recorded a personal observation without claiming a technique.';break;}const artifact={id:'WORK-'+w.serial++,type:'knowledge',author:a.id,household:a.household,skill,title:L.RECIPES[skill].name+' / '+a.identity.name,time:w.simTime,evidence:a.known[skill].evidence,receipt:act.receipts[0]};w.artifacts.push(artifact);a.artifacts.push(artifact.id);text='Created a persistent record of known '+L.RECIPES[skill].name+'.';break;}
  case 'study':{const book=w.artifacts.find(b=>b.id===o.artifact);a.practice[o.skill]=(a.practice[o.skill]||0)+.5;a.education.lessons++;text='Studied '+book.title+'; a practical test is still needed.';break;}
  case 'train_model':{const model=L.samplePredictor(w.measurements.filter(m=>m.observer===a.id));const work={id:'MODEL-'+w.serial++,type:'predictor',author:a.id,title:'Measured-crop numeric predictor',model,time:w.simTime,receipt:act.receipts[0]};w.artifacts.push(work);w.predictions.push({...model,author:a.id});text='Fitted a numeric model to actual crop measurements and evaluated '+model.testCount+' held-out samples; MSE '+model.testMSE+'.';break;}
  case 'program':{if(!Array.isArray(d.program))throw Error('No Jev-authorized program was supplied.');const program=d.program;const result=L.runProgram(program);w.artifacts.push({id:'PROGRAM-'+w.serial++,type:'program',author:a.id,title:'Arithmetic test',program,result:result.result,time:w.simTime,receipt:act.receipts[0]});text='Actually executed a bounded arithmetic program; result '+result.result+'.';break;}
  case 'paint':case 'music':case 'remember':{a.body.fun=clamp(a.body.fun+30);a.body.comfort=clamp(a.body.comfort+10);if(o.kind!=='remember'){const artifact={id:'ART-'+w.serial++,type:o.kind,author:a.id,title:a.identity.name+' / '+o.kind,time:w.simTime,seed:T.hash(act.id),receipt:act.receipts[0]};w.artifacts.push(artifact);a.artifacts.push(artifact.id);}text=o.kind==='remember'?'Spent time with a personally recorded memory.':'Created a persistent '+o.kind+' work at '+ob.type+'.';break;}
  default:return null;
 }
 return {text,candidates};
}
function afterFinish(w,act,info){const a=L.byId(w,act.actor),o=act.option,b=o.target?L.byId(w,o.target):null;
 a.habits[o.kind]=(a.habits[o.kind]||0)+1;a.practice[o.skill||o.kind]=(a.practice[o.skill||o.kind]||0)+1;
 if(a.aspiration&&D.GOALS[a.aspiration.id]?.kinds.includes(o.kind)&&act.decision.response!=='decline'){a.aspiration.progress=Math.min(a.aspiration.target,a.aspiration.progress+1);if(a.aspiration.progress===a.aspiration.target&&!a.aspiration.achieved){a.aspiration.achieved=w.simTime;record(w,'personal_milestone',a.identity.name+' completed a self-selected project: '+a.aspiration.label,[a.id],{receipt:act.receipts[0]});}}
 if(o.kind==='gather_node'&&o.resource==='wood'){const c=T.cell(w.terrain,a.x,a.z);if(c)c.trees=Math.max(0,c.trees-.1);}
 if(['manufacture','experiment'].includes(o.kind)&&['iron','steel','metallurgy','electricity'].includes(o.skill)){const c=T.cell(w.terrain,a.x,a.z);if(c)c.pollution=Math.min(1,c.pollution+.025);w.ecology.pollution+=.025;}
 if(o.target&&act.decision.response==='decline'){L.changeBond(a,b,{resentment:1});a.moodlets.push({label:'An invitation was declined',value:-4,source:act.id,until:w.simTime+60});}
 if(o.target&&act.decision.response==='accept'){
  if(['chat','joke','tell_story','signal'].includes(o.kind)){const text=act.decision.dialogue||null;const row={id:'TALK-'+w.serial++,people:[a.id,b.id],time:w.simTime,kind:o.kind,spoken:text,token:act.decision.token||null,gesture:act.decision.gesture||null,source:text?'LLM proposal selected by Jev':act.decision.token?'Jev-selected signal':'Nonverbal interaction; no fabricated spoken sentence',receipts:act.receipts,reply:act.decision.reply||null};w.conversations.push(row);}
  for(const p of [a,b])p.moodlets.push({label:o.kind.replaceAll('_',' '),value:act.decision.reaction==='annoyed'?-5:5,source:act.id,until:w.simTime+120});
 }
 if(o.kind==='build'){const ob=w.objects.at(-1),bp=w.blueprints.find(bp=>bp.built===ob.id);if(bp)ob.rotation=bp.rotation||0;}
 a.moodlets=a.moodlets.filter(m=>m.until>w.simTime).slice(-12);
}
function advance(w,dt){
 const old=w.climate;w.climate=T.climate(w);w.weather=w.climate.rain?'rain':w.climate.temperature<2?'cold':'clear';
 let supply=0,storage=20;for(const o of w.objects){o.condition=clamp(o.condition-dt*.00012);if(o.condition<=5)continue;if(o.type==='waterwheel'&&w.nodes.some(n=>n.kind==='water'&&n.quantity>0&&dist(n,o)<8))supply+=.12;if(o.type==='solar_panel')supply+=w.climate.sun*.16;if(o.type==='battery_bank')storage+=50;}
 const energy=supply*dt;w.networks.energy=Math.min(storage,w.networks.energy+energy);w.networks.generated+=energy;
 for(const o of w.objects){const required=(D.FURNITURE[o.type]?.power||0)*dt*.015;o.powered=required===0||o.condition>5&&w.networks.energy>=required;if(o.powered&&required){w.networks.energy-=required;w.networks.consumed+=required;}}
 for(const a of w.entities.filter(a=>a.alive)){const room=w.rooms.find(r=>T.inRoom(r,a.x,a.z));if(room?.roof){a.body.warmth=clamp(a.body.warmth+dt*.04);a.body.comfort=clamp(a.body.comfort+dt*.018);}a.moodlets=a.moodlets.filter(m=>m.until>w.simTime);if(a.ageYears>88&&w.settings.mortality)a.body.health=clamp(a.body.health-dt*.003*(a.ageYears-87));
  const act=a.activity?w.activities[a.activity]:null;if(act&&act.elapsed>=act.travel&&['furniture_sleep'].includes(act.kind))a.body.energy=clamp(a.body.energy+dt*.5);
 }
 const day=Math.floor(w.simTime/1440);if(day>w.lastEcologyDay){for(let d=w.lastEcologyDay;d<day;d++){
  for(const n of w.nodes.filter(n=>n.renewable)){const cell=T.cell(w.terrain,n.x,n.z),factor=n.kind==='water'?8:n.kind==='wood'?.4:n.kind==='food'?2:1;const grown=Math.min(n.capacity-n.quantity-n.reserved,Math.max(0,factor*(cell?.moisture||.5)*(w.climate.season==='Winter'?.35:1)));n.recovery+=grown;const units=Math.floor(n.recovery);if(units>0){n.quantity+=units;n.recovery-=units;w.resources[n.kind]+=units;w.ecology.regrown+=units;}}
  for(const h of w.households){const cold=w.objects.some(o=>o.household===h.id&&o.type==='refrigerator'&&o.powered);const loss=Math.floor(h.food*(cold?.01:.12));if(loss){h.food-=loss;h.stores.compost=(h.stores.compost||0)+loss;record(w,'storage_change',h.name+': '+loss+' stored portions spoiled into compost. '+(cold?'Cold storage reduced the loss.':'No powered cold storage.'),h.members);}}
  for(const c of w.terrain.cells){c.moisture=clamp(c.moisture+(w.climate.rain?.08:-.015)-c.pollution*.01,0,1);c.pollution=Math.max(0,c.pollution-.002);}
 }
 w.lastEcologyDay=day;record(w,'ecology','A simulated day passed: local regeneration, moisture and stored-food spoilage were updated.',[],{day,climate:w.climate});}
 if(old?.season!==w.climate.season)record(w,'season','Season changed to '+w.climate.season+'.',[],{source:w.climate.source});
}
function draftRoom(w,input){ensure(w);const r={id:'ROOM-'+w.serial++,name:String(input.name||'Proposed room').slice(0,60),x:Number(input.x),z:Number(input.z),width:Number(input.width),depth:Number(input.depth),door:input.door||'south',household:input.household||w.households[0].id,progress:0,phases:4,built:false,roof:true,condition:100};
 if(![r.x,r.z,r.width,r.depth].every(Number.isFinite)||r.width<4||r.depth<4||r.width>14||r.depth>14||!['north','south','east','west'].includes(r.door))throw Error('Rooms need dimensions from 4 to 14 and a valid doorway.');
 if(Math.abs(r.x)+r.width/2>44||Math.abs(r.z)+r.depth/2>44)throw Error('Room outside active settlement bounds.');
 if(w.rooms.some(q=>Math.abs(q.x-r.x)<(q.width+r.width)/2+1&&Math.abs(q.z-r.z)<(q.depth+r.depth)/2+1))throw Error('Rooms overlap or leave no access gap.');
 for(const [x,z]of [[r.x-r.width/2,r.z-r.depth/2],[r.x+r.width/2,r.z+r.depth/2]])if(T.blocked(w,x,z))throw Error('Room footprint meets blocked terrain.');
 if(!w.households.some(h=>h.id===r.household))throw Error('Unknown room household.');for(let x=r.x-r.width/2;x<=r.x+r.width/2;x++)for(let z=r.z-r.depth/2;z<=r.z+r.depth/2;z++)if(T.blocked(w,x,z))throw Error('Room footprint meets blocked terrain.');
 const cost=Math.ceil((r.width+r.depth)/4);r.material={wood:cost,fibre:Math.ceil(cost/2),stone:Math.ceil(cost/2)};w.rooms.push(r);record(w,'design_proposal','Player proposed '+r.name+'. Materials and four Jev-authorized work phases are still required.',[],{room:clone(r)});return r;
}
function appearance(w,id,values){const a=L.byId(w,id);if(!a)throw Error('Unknown person.');if(a.activity)throw Error('Pause and edit a person who is not in an activity.');const name=String(values.name||a.identity.name).trim().slice(0,40);if(!name)throw Error('Enter a name.');const colors=['skin','hair','cloth'];for(const k of colors)if(values[k]&&!/^#[0-9a-f]{6}$/i.test(values[k]))throw Error('Use a six-digit hexadecimal color.');a.identity.name=name;a.observerName=name;for(const k of colors)if(values[k])a[k]=values[k];if(values.traits){const allowed=['curious','patient','sociable','playful','practical','independent','caring','quiet','creative','bold'];if(!Array.isArray(values.traits)||values.traits.length>3||values.traits.some(t=>!allowed.includes(t)))throw Error('Choose up to three supported traits.');if(values.traits.length<1)throw Error('Select at least one trait.');a.traits=values.traits;}record(w,'creator_edit','Observer edited '+id+' appearance/name/traits. This is not an earned life event.',[id]);return a;}
function relocate(w,anchor,dem){if(Object.keys(w.activities).length)throw Error('Finish or cancel active activities before changing geography.');const t=T.create(anchor,dem);w.terrain=t;w.location={name:'Earth settlement',latitude:anchor.lat,longitude:anchor.lon,provenance:t.provenance};record(w,'geography_import','Observer selected Earth coordinates; '+t.provenance,[],{anchor,demSource:dem?.source||null});return w;}
function validate(w){if(!w.civilVersion)return;T.validate(w.terrain);for(const key of ['nodes','rooms','contracts','trades','artifacts','conversations'])if(!Array.isArray(w[key]))throw Error('Missing civilization '+key);for(const n of w.nodes)if(!Number.isFinite(n.quantity)||n.quantity<0||!Number.isFinite(n.reserved)||n.reserved<0)throw Error('Invalid localized stock.');for(const r of w.rooms)if(!Number.isFinite(r.x)||!Number.isFinite(r.z)||r.width<4||r.depth<4)throw Error('Invalid room.');for(const j of w.contracts)if(!Number.isFinite(j.escrow)||j.escrow<0)throw Error('Invalid exchange escrow.');}
L.install({init,person,object,options,perception,blocked:T.blocked,path:T.route,prepare,reserve,cancel,beforeFinish,complete,afterFinish,advance,validate,weather:w=>{const c=T.climate(w);return c.rain?'rain':c.temperature<2?'cold':'clear';}});
function genesis(scenario='first-minds'){
 if(!['first-minds','homestead','workshop','modern'].includes(scenario))throw Error('Unknown scenario.');const w=L.genesis(scenario==='first-minds'?'first-minds':'homestead');w.scenario=scenario;
 if(['workshop','modern'].includes(scenario)){const known=scenario==='modern'?Object.keys(L.RECIPES):['carpentry','weaving','pottery','masonry','wheel','farming','cooking','writing','metallurgy','iron','refining_copper','baking','measurement'];for(const a of w.entities.filter(a=>a.ageYears>=18)){for(const k of known)a.known[k]={evidence:SEED,turn:0};for(const k of ['plank','cloth','brick','iron','grain','water'])a.inventory[k]=2;a.inventory.coin=20;}
  const types=scenario==='modern'?['double_bed','sofa','shower','refrigerator','stove','computer_desk','solar_panel','battery_bank','lamp','school_board','toy_box','dining_table','easel','drum','market_stall','pump','cistern','loom']:['loom','potter_wheel','market_stall','mill','easel','drum','school_board','dining_table','latrine','washbasin'];
  const placements={double_bed:[-6,6,'H1'],sofa:[-14,-7,'H1'],shower:[-15,-10,'H1'],refrigerator:[-8.5,-10,'H1'],stove:[-10.5,-10,'H1'],computer_desk:[-13,-10,'H1'],solar_panel:[-16,2,'H1'],battery_bank:[-13,2,'H1'],lamp:[-3.2,6,'H1'],school_board:[5,2.5,'H2'],toy_box:[7,7,'H2'],dining_table:[-5,4,'H1'],easel:[-15,-5.5,'H1'],drum:[-8,-5.5,'H1'],market_stall:[0,-7,'H1'],pump:[12,3,'H2'],cistern:[14,3,'H2'],loom:[-14,6,'H1'],potter_wheel:[-15,-9,'H1'],mill:[-12,-9,'H1'],latrine:[7,7,'H2'],washbasin:[-8,-10,'H1']};
  w.rooms.push({id:'ROOM-COMMON',name:'Shared workshop and living room',x:-12,z:-8,width:10,depth:8,door:'south',household:'H1',progress:4,phases:4,built:true,roof:true,condition:100,receipt:SEED});
  const grove=w.nodes.find(n=>n.id==='N_food_0');if(grove)grove.x=-22;
  types.forEach((t,i)=>{const p=placements[t]||[-17+i*2,-4,'H1'];const ob=L.makeObject(w,t,p[0],p[1],p[2],SEED);if(['market_stall','school_board','loom','potter_wheel','mill','pump','cistern'].includes(t))ob.public=true;});w.networks.energy=scenario==='modern'?35:0;w.networks.water=20;w.fire.fuel=150;
 }
 if(scenario!=='first-minds')record(w,'scenario','Declared '+scenario+' starting setup. Initial homes, family links and knowledge were seeded, NOT discovered.',w.entities.map(a=>a.id),{receipt:SEED});return w;
}
function migrate(old){if(old.schema==='origin-life-v5'){const w=clone(old);ensure(w,false);record(w,'migration','Imported v5 world. New localized stocks preserve prior aggregate quantities; new fields are declared defaults.',[]);return w;}return ensure(L.migrate(old));}
return {...L,VERSION:'6.1.0',genesis,migrate,ensure,draftRoom,appearance,relocate,category,categories:D.CATEGORIES,items:D.ITEMS,furniture:D.FURNITURE,goals:D.GOALS,terrain:T,mass,capacity};
});
