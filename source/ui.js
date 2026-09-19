(function(){'use strict';
const $=id=>document.getElementById(id),C=window.OriginCore,P=window.OriginProviders;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let persistenceReady=false,saveTimer,lastSavedStamp='',bridgeMeta=null,localCheckpoint=null;
let session,view,selected='S01',profileTab='memory',logFilter='all',logLimit=40,lastFocus=null,modalHistory=[],currentModal=null,toastTimer,renderQueued=false;
const fmt=n=>Number(n).toLocaleString('en-US');
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6500);}
function avatar(a){return '<svg viewBox="0 0 64 84" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="64" height="84" fill="#8a9078"/><ellipse cx="32" cy="88" rx="29" ry="36" fill="'+esc(a.cloth)+'"/><path d="M25 44h14v18H25z" fill="'+esc(a.skin)+'"/><ellipse cx="32" cy="30" rx="16" ry="23" fill="'+esc(a.skin)+'"/><path d="M16 29C12 1 53-1 48 31L44 23 39 12 20 18z" fill="'+esc(a.hair)+'"/><path d="M32 27l-3 12h7" fill="none" stroke="#755641" stroke-width="1"/><path d="M26 44q6 3 12-1" fill="none" stroke="#785744" stroke-width="1.4"/><path d="M21 28h6m10 0h6" stroke="'+esc(a.hair)+'" stroke-width="1.4"/><circle cx="24" cy="31" r="1.3" fill="#30352b"/><circle cx="40" cy="31" r="1.3" fill="#30352b"/></svg>';}
function scheduleRender(){if(session&&!session.busy&&persistenceReady&&(session.world.tick>0||session.attempts>0))scheduleSave();if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;render();});}
function select(id){selected=id;view?.select(id);render();if(innerWidth<=900)$('right').classList.add('open');}
function showModal(id,history=true){if(!$(id))return;if(currentModal&&history&&currentModal!==id)modalHistory.push(currentModal);else if(!currentModal)lastFocus=document.activeElement;document.querySelectorAll('.backdrop').forEach(x=>x.hidden=true);$(id).hidden=false;currentModal=id;if(id==='budget-modal'){const next=Math.min(2000,Math.max(session.config.cap,session.attempts+100));$('budget-jev').value=String(next);$('budget-jev').min=String(session.attempts+1);$('budget-planner').value=String(Math.min(500,Math.max(session.config.plannerCap,session.plannerAttempts+1)));$('budget-error').textContent='';}updateModal(id);setTimeout(()=>$(id).querySelector('input,button,select,textarea')?.focus(),30);}
function closeModal(){if(currentModal)$(currentModal).hidden=true;currentModal=null;const prior=modalHistory.pop();if(prior){showModal(prior,false);return;}lastFocus?.focus?.();}
function closeAll(){modalHistory=[];document.querySelectorAll('.backdrop').forEach(x=>x.hidden=true);currentModal=null;lastFocus?.focus?.();}
function updateModal(id){if(!session)return;if(id==='ledger-modal')renderLedger();if(id==='tech-modal')renderTech();if(id==='culture-modal')renderCulture();if(id==='evidence-modal')renderEvidence();if(id==='connect-modal'){
 $('session-cap-note').textContent=session.attempts+' requests attempted. '+session.valid+' validated responses. '+(session.connected?'Connection configured: '+session.config.provider+'.':'No decision connection is active.');$('cap').min=String(session.attempts+1);if(+$('cap').value<=session.attempts)$('cap').value=String(session.attempts+100);
}if(id==='budget-modal')$('budget-summary').textContent=session.attempts+' / '+session.config.cap+' Jev requests used; '+session.plannerAttempts+' / '+session.config.plannerCap+' planner requests used. World turn '+session.world.tick+'. '+(session.config.planner==='none'?'No external LLM planner is enabled.':'Planner mode: '+session.config.planner+'.');if(id==='context-modal')$('observer-context').value=session.config.context;}
function render(){
 if(!session)return;const w=session.world,a=C.byId(w,selected)||w.entities[0],stats=C.stats(w);const totalMin=w.minutes%1440;
 $('time').textContent=String(Math.floor(totalMin/60)).padStart(2,'0')+':'+String(Math.floor(totalMin%60)).padStart(2,'0');$('day').textContent='DAY '+String(Math.floor(w.minutes/1440)+1).padStart(2,'0')+' / TURN '+String(w.tick).padStart(4,'0');
 if($('cognitive-mode'))$('cognitive-mode').textContent=session.config.planner==='none'?'JEV ONLY / INTENTIONS + ACTIONS':'HYBRID / '+session.config.planner.toUpperCase()+' PROPOSALS + JEV';
 const state=session.status;$('status-pill').dataset.state=state;const badges={locked:'NO JEV / WORLD FROZEN',ready:session.valid?'JEV / READY':'KEY SET / UNVERIFIED',checking:'TYPESAFE / CHECKING ACCESS',paused:'PAUSED / WORLD FROZEN',requesting:'JEV / REQUEST IN FLIGHT',executing:'JEV / TURN COMMITTED',running:'JEV / RUNNING',error:'API ERROR / WORLD FROZEN',blocked:'RENDER BLOCKED',planning:'PLANNER / PROPOSING',stalled:'STALLED / REVIEW REQUIRED',limited:'JEV REQUEST LIMIT / PAUSED',planner_limited:'PLANNER LIMIT / PAUSED'};
 $('status-pill').textContent=badges[state]||state.toUpperCase();$('connect-button').textContent=session.connected?'Jev settings':'Connect TypeSafe \u2197';
 $('phase-label').textContent=session.busy?(session.config.planner==='none'?'JEV-ONLY CAUSAL TURN':'HYBRID PROPOSALS / JEV ACTIONS'):session.connected?(session.error?'WORLD FROZEN / CHECK THE LOG':'NO AUTONOMOUS LOCAL POLICY'):'THE WORLD IS FROZEN';
 $('phase-text').textContent=session.error||session.phase;
 $('phase-note').textContent='API attempts '+session.attempts+' / '+session.config.cap+' \u00b7 '+session.valid+' valid responses \u00b7 '+(session.usageKnown?fmt(session.totalTokens)+' reported input tokens':'No token usage reported yet');
 $('phase-note').textContent+=' / planner '+session.plannerAttempts+' / '+session.config.plannerCap;
 $('budget-inline').textContent=session.attempts+' / '+session.config.cap;$('budget-button').classList.toggle('near-limit',session.config.cap-session.attempts<=10);
 const limited=['limited','planner_limited'].includes(state),stalled=state==='stalled';$('run-notice').hidden=!(view?.ready&&(limited||stalled));
 if(limited||stalled){$('run-notice-label').textContent=limited?'SPENDING GUARD / NO NETWORK FAILURE':'LOW-BENEFIT CYCLE / NO SUBSTITUTE ACTION';$('run-notice-title').textContent=limited?'Request limit reached.':'Review this repeated behaviour.';$('run-notice-text').textContent=session.phase;$('run-notice-action').textContent=limited?'Review request budget':'Review decisions';}
 $('request-count').textContent=session.attempts;$('turn-count').textContent=w.tick;$('alive-label').textContent=String(stats.alive).padStart(2,'0');$('ability-count').textContent=stats.known+' / 13';$('self-count').textContent=stats.evidence.self;$('match-count').textContent=stats.matched;
 $('frozen').hidden=!(view?.ready&&!session.connected&&w.tick===0);
 $('run-button').disabled=session.busy||session.running||!view?.ready;$('step-button').disabled=session.busy||session.running||!view?.ready;$('pause-button').disabled=!session.busy&&!session.running;$('connect-submit').disabled=session.busy;$('test-connection').disabled=session.busy||session.running;
 $('run-button').innerHTML=session.running?'Jev running':'&#9654; Run Jev';
 const next=C.actor(w)?.id;
 $('residents').innerHTML=w.entities.map(e=>'<button class="resident '+(e.id===selected?'active':'')+'" data-subject="'+e.id+'"><span class="avatar">'+avatar(e)+'</span><span><strong>'+e.id+'</strong><small>'+(!e.alive?'Life ended':Object.keys(e.known).length+' abilities / '+e.completed+' actions')+'</small></span><span class="next-mark">'+(next===e.id?'\u2192':'')+'</span></button>').join('');
 $('portrait').innerHTML=avatar(a);$('subject-name').textContent='Subject '+a.id.slice(1);$('subject-state').textContent=!a.alive?'Life ended':Object.keys(a.known).length+' learned abilities / '+a.matches+' signal matches';
 $('subject-note').textContent=C.has(a,'language')?'Shared symbols are learned through encounters. No fluent human dialogue is assumed.':'Observer-assigned identity. No name or spoken language is assumed.';
 $('needs').innerHTML=Object.entries(a.body).map(([k,v])=>'<div class="need '+(v<25?'low':'')+'"><label>'+esc({satiety:'Food',hydration:'Water',energy:'Energy',warmth:'Warmth',health:'Health'}[k]||k)+'<b>'+Math.round(v)+'</b></label><div class="track"><i style="width:'+v+'%"></i></div></div>').join('');
 const inv=Object.entries(a.inventory).filter(([k,v])=>v>0);$('inventory').innerHTML=inv.length?inv.map(([k,v])=>'<span>'+esc(k)+' '+v+'</span>').join(''):'<span>EMPTY HANDS / NO INVENTORY</span>';
 $('current').innerHTML=a.last?esc(a.last.label)+'<small>COMMITTED JEV TURN / '+esc(a.last.event)+'</small>':'No action has been chosen.<small>WAITING FOR A REAL JEV RESPONSE</small>';
 $('intent-summary').innerHTML='<b>JEV INTENTION / '+esc(a.intent?.receipt||'NOT YET SELECTED')+'</b>'+esc(a.intent?.id?.toUpperCase()||'Awaiting first goal')+(C.intentStatus(a).complete?' / SATISFIED - REASSESS':'')+((a.behavior?.stagnant||0)?'<br>LOW-INFORMATION STREAK: '+a.behavior.stagnant:'');
 renderProfile(a);renderFeed();if(currentModal)updateModal(currentModal);
}
function renderProfile(a){
 if(profileTab==='intent'){
  let text='<div class="episode"><small>JEV SELECTED / NOT A HIDDEN THOUGHT</small>'+esc(a.intent?.label||'No intention yet.')+'</div>';
  const p=a.proposal;if(p)text+='<div class="episode"><small>'+esc(p.source.toUpperCase())+' PROPOSAL / UNVERIFIED</small><b>'+esc(p.objective)+'</b><br>'+esc(p.hypothesis)+'<br><br>Candidate actions: '+esc(p.actions.join(' > '))+'<br>Expected observation: '+esc(p.expectedObservation)+'<br><button data-receipt="'+esc(p.receipt)+'">Inspect planner receipt</button></div>';
  const b=C.behaviorReport(session.world,a);text+='<div class="episode"><small>OUTCOME FEEDBACK</small>'+esc(b.last_outcome?.physical_result||'No executed action.')+'<br><br>'+esc(b.note)+'<br><br>'+esc(b.needs.scale)+'<br><br>'+esc(b.intention_status.reason)+'<br><br>'+esc(b.cycle.reason)+'</div>';$('profile-body').innerHTML=text;
 }

 if(profileTab==='memory')$('profile-body').innerHTML=a.memory.length?a.memory.slice(-7).reverse().map(m=>'<div class="episode"><small>'+esc(m.event)+' / '+esc(m.kind.toUpperCase())+'</small>'+esc(m.text)+'</div>').join(''):'<div class="empty">No autobiographical episode yet.<br>The first memory must come from an executed Jev decision.</div>';
 if(profileTab==='skills'){
  const learned=Object.entries(a.known);let html=learned.length?learned.map(([k,v])=>'<div class="episode"><span class="skill-badge">'+esc(C.SKILLS[k].name)+'</span><small>LEARNED / '+esc(v.evidence)+' / '+esc(v.receipt||'imported')+'</small>'+esc(v.teacher?'Demonstrated by '+v.teacher:'Acquired through this subject\'s own experiment')+'</div>').join(''):'<div class="empty">No learned skill. Seeing the technology panel does not grant this subject any knowledge.</div>';
  const trials=Object.entries(a.trials);if(trials.length)html+='<div class="rule"></div><div class="micro muted">EXPERIMENTS, NOT UNLOCKS</div>'+trials.map(([k,v])=>'<div class="episode">'+esc(C.SKILLS[k]?.name||k)+' <span class="gold mono">'+v+' attempts</span></div>').join('');$('profile-body').innerHTML=html;
 }
 if(profileTab==='relations'){
  const r=Object.entries(a.relationships);$('profile-body').innerHTML=r.length?r.map(([id,v])=>'<div class="episode spread"><button class="text-button" data-subject="'+esc(id)+'">'+esc(id)+' \u2197</button><span class="mono">'+(v>0?'+':'')+v+' interaction history</span></div>').join(''):'<div class="empty">No relationship has been assigned. Encounters, refusals and exchanges must happen first.</div>';
 }
}
function entryTitle(r){if(r.type==='planner')return r.subject+' / '+r.request?.mode+' proposal / '+(r.response?.proposal?.objective||r.error||r.status);if(r.type==='request'){const choices=r.response?.answers?Object.entries(r.response.answers).map(([k,a])=>k+': '+a.choice).join(' / '):r.status==='pending'?'Waiting for provider':r.error||'No valid answer';return r.subject+' / '+r.phase+' / '+choices;}if(r.type==='commit')return r.subject+' / '+r.text;return r.text||r.type;}
function renderFeed(){const rows=session.log.filter(r=>['request','planner','commit','stagnation','pause','rejected_turn','render_error'].includes(r.type)).slice(-12).reverse();$('feed').innerHTML=rows.length?rows.map(r=>'<button class="feed-row '+(r.error||r.type==='rejected_turn'?'error':'')+'" data-receipt="'+r.id+'">'+esc(entryTitle(r).slice(0,130))+'<span class="stamp">'+r.id+' / '+(r.type==='request'?esc(r.status)+(r.committed?' / COMMITTED':' / NOT COMMITTED'):'TURN '+r.turn)+'</span></button>').join(''):'<div class="empty">Zero API decisions.<br>Nothing has been invented to populate this stream.</div>';}
function renderLedger(){
 $('ledger-summary').textContent=session.log.length+' log entries / '+session.attempts+' attempted requests / '+session.valid+' validated responses / '+session.world.tick+' world turns. Logs are checkpointed without API keys; restore is explicit and unverified.';
 const query=$('log-search').value.trim().toLowerCase();let rows=session.log.filter(r=>logFilter==='all'||logFilter===r.type||(logFilter==='error'&&(r.error||['rejected_turn','display_stop','render_error'].includes(r.type))));if(query)rows=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(query));rows=rows.slice().reverse();
 $('ledger-list').innerHTML=rows.slice(0,logLimit).map(r=>'<button class="ledger-row '+(r.error||r.type==='rejected_turn'?'error':'')+'" data-receipt="'+r.id+'"><div class="title">'+esc(entryTitle(r))+'</div><div class="sub">'+r.id+' / '+esc(r.type.toUpperCase())+' / '+esc(r.at)+'<br>'+(r.type==='request'?'HTTP '+esc(r.httpStatus??'pending')+' / '+esc(r.model||session.config.model)+' / '+(r.latencyMs??'\u2014')+' ms / <span class="badge">'+(r.committed?'WORLD COMMITTED':'NOT COMMITTED')+'</span>':'World turn '+r.turn)+'</div></button>').join('')||'<div class="empty">No matching records.</div>';
 $('more-logs').hidden=rows.length<=logLimit;
}
function showReceipt(id){const r=session.log.find(x=>x.id===id);if(!r)return;let html='<div class="receipt-head">'+esc(r.id)+' / '+esc(r.at)+'<br>'+esc(entryTitle(r))+'<br>'+(r.type==='request'?'STATUS '+esc(r.status)+' / '+(r.committed?'Committed to the world':'NOT committed to the world')+' / HTTP '+esc(r.httpStatus??'pending'):'WORLD TURN '+r.turn)+'</div>';
 if(r.response?.proposal){const p=r.response.proposal;html+='<h3>Planner proposal / not an executed action</h3><p>'+esc(p.objective)+'</p><p>'+esc(p.hypothesis)+'</p><p class="mono">'+esc(p.actions.join(' > '))+'</p><p>Expected observation: '+esc(p.expectedObservation)+'</p>';}
 if(r.response?.answers){for(const [key,a]of Object.entries(r.response.answers)){html+='<h3>'+esc(key)+' <span class="gold">'+esc(a.choice)+'</span></h3><p class="privacy">Returned confidence: '+esc(a.confidence)+' / Provider model: '+esc(r.response.model)+'. This is not a hidden reasoning trace.</p>';for(const [name,p]of Object.entries(a.probabilities||{}).sort((a,b)=>b[1]-a[1]))html+='<div class="prob '+(name===a.choice?'chosen':'')+'"><span class="name">'+esc(name)+'</span><span class="bar"><i style="width:'+Math.max(0,Math.min(100,p*100))+'%"></i></span><b>'+(p*100).toFixed(1)+'%</b></div>';}}
 if(r.effects){html+='<h3 style="margin-top:22px">Consequences across the world</h3>'+r.effects.map(e=>'<div class="impact">'+esc(e.text)+'<br><span class="micro gold">AFFECTED '+esc((e.affected||[]).join(' / '))+'</span></div>').join('');}
 if(r.receipts?.length)html+='<div class="chips">'+r.receipts.map(id=>'<button data-receipt="'+esc(id)+'">'+esc(id)+' \u2197</button>').join('')+'</div>';
 if(r.request)html+='<details><summary>Exact request body (no key)</summary><pre>'+esc(JSON.stringify(r.request,null,2))+'</pre></details>';
 if(r.response)html+='<details><summary>Exact parsed provider response</summary><pre>'+esc(JSON.stringify(r.response,null,2))+'</pre></details>';
 if(r.changes)html+='<details open><summary>Complete state changes before / after</summary><pre>'+esc(JSON.stringify(r.changes,null,2))+'</pre></details>';
 html+='<details><summary>Complete log record</summary><pre>'+esc(JSON.stringify(r,null,2))+'</pre></details>';$('receipt-title').textContent=r.type==='request'?'A decision, inspectable.':'A consequence, traceable.';$('receipt-content').innerHTML=html;showModal('receipt-modal',currentModal!=='receipt-modal');
}
function renderTech(){const w=session.world;$('tech-grid').innerHTML=Object.entries(C.SKILLS).map(([id,s])=>{const holders=w.entities.filter(a=>a.known[id]),trials=w.entities.reduce((n,a)=>n+(a.trials[id]||0),0);return '<article class="tech '+(holders.length?'known':'')+'"><div class="tag">'+(holders.length?'EVIDENCE RECORDED':'NOT YET LEARNED')+'</div><h3>'+esc(s.name)+'</h3><p>'+esc(holders.length?holders.map(a=>a.id).join(', '):s.requires.length?'Prerequisites: '+s.requires.map(k=>C.SKILLS[k].name).join(', '):'A foundational experimental ability.')+'</p><p class="mono">'+trials+' trials / '+holders.length+' learners</p></article>';}).join('');}
function renderCulture(){const rows=session.world.language.slice(-150).reverse();$('culture-body').innerHTML=rows.length?rows.map(r=>'<tr><td>'+r.turn+'</td><td>'+esc(r.from)+' \u2192 '+esc(r.to)+'</td><td class="gold mono">'+esc(r.token)+'</td><td>'+esc(r.intended)+'</td><td>'+esc(r.interpreted)+(r.interpreted===r.intended?' \u2713':'')+'</td><td>'+esc(r.grounding)+'</td></tr>').join(''):'<tr><td colspan="6">No signal has been chosen by Jev. No shared vocabulary has been assigned.</td></tr>';}
function renderEvidence(){const s=C.stats(session.world);const data=[[s.evidence.self,'Self / other learning','Individuals who adopted a supported self/other distinction.'],[s.evidence.attribution,'Matched action recall','Autobiographical probes that matched a recorded own action.'],[s.matched,'Grounded signal matches','Separate sender and receiver choices that agreed on a referent.'],[s.evidence.transmitted,'Learned from another','Skills accepted by a learner after attending a demonstration.']];$('evidence-grid').innerHTML=data.map(([n,title,text])=>'<article class="evidence-box"><b>'+n+'</b><div class="micro">'+title+'</div><p>'+text+'</p></article>').join('');}
function download(name,text,type='application/json'){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function exportAll(){download('ORIGIN-turn-'+String(session.world.tick).padStart(5,'0')+'.json',JSON.stringify(session.export(),null,2));toast('World state and every log exported. The API key is not included.');}
function exportLogs(){download('ORIGIN-decision-ledger.jsonl',session.log.map(r=>JSON.stringify(r)).join('\n'),'application/x-ndjson');toast('Every log exported as newline-delimited JSON.');}
async function initView(){
 $('loader').hidden=false;$('render-error').hidden=true;$('frozen').hidden=true;if(view)view.ready=false;$('world').replaceChildren();$('labels').replaceChildren();
 view=new OriginView($('world'),$('labels'),select);
 try{await view.init(session.world);$('loader').hidden=true;$('render-status').textContent='THREE.JS / 6 ARTICULATED HUMANS / JEV-ONLY WORLD TURNS';session.record('render_ready',{text:'Three.js renderer initialized. All human geometry is local to the page. No agent decision has been made by rendering.'});render();}
 catch(e){$('loader').hidden=true;$('render-error').hidden=false;$('render-error-text').textContent=e.message;$('render-status').textContent='3D UNAVAILABLE / NO AGENT CALLS ALLOWED';session.record('render_error',{text:e.message});render();}
}
session=new OriginSession({change:scheduleRender,canExecute:()=>!!view?.ready&&!document.hidden,connectNeeded:()=>showModal('connect-modal'),choice:(a,o,r)=>{if(selected===a.id)$('current').innerHTML=esc(o.label)+'<small>JEV SELECTED / WAITING FOR REQUIRED CONSEQUENCES</small>';},animate:async(before,after,o,d,signal)=>{render();await view.animate(before,after,o,d,signal,+$('visual-speed').value);view.sync(session.world);},reset:()=>{view?.sync(session.world);render();}});
// Read-only diagnostics expose no key and cannot activate an offline policy.
window.ORIGIN=Object.freeze({getSnapshot:()=>C.clone(session.world),getLogs:()=>C.clone(session.log),getStatus:()=>({connected:session.connected,ready:!!view?.ready,status:session.status,attempts:session.attempts,valid:session.valid,version:C.VERSION,cap:session.config.cap,planner:session.config.planner,plannerAttempts:session.plannerAttempts,provider:session.config.provider,model:session.config.model,transport:session.config.transport})});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.modal)showModal(b.dataset.modal);if(b.hasAttribute('data-close'))closeModal();if(b.dataset.subject)select(b.dataset.subject);if(b.dataset.receipt)showReceipt(b.dataset.receipt);
 if(b.dataset.view){view?.mode(b.dataset.view);document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));}
 if(b.dataset.profile){profileTab=b.dataset.profile;document.querySelectorAll('[data-profile]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));});renderProfile(C.byId(session.world,selected));}
 if(b.dataset.filter){logFilter=b.dataset.filter;logLimit=40;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderLedger();}
});
document.querySelectorAll('.backdrop').forEach(el=>el.addEventListener('pointerdown',e=>{if(e.target===el)closeModal();}));
$('connect-button').onclick=()=>showModal('connect-modal');$('help-button').onclick=()=>showModal('help-modal');
$('cinema-button').onclick=()=>document.body.classList.toggle('cinema');$('people-button').onclick=()=>$('right').classList.toggle('open');$('close-profile').onclick=()=>$('right').classList.remove('open');$('follow-subject').onclick=()=>{view?.mode('follow');document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view==='follow'));};
$('run-button').onclick=()=>['limited','planner_limited'].includes(session.status)?showModal('budget-modal'):session.connected?session.start():showModal('connect-modal');$('step-button').onclick=()=>['limited','planner_limited'].includes(session.status)?showModal('budget-modal'):session.connected?session.step():showModal('connect-modal');
$('run-notice-action').onclick=()=>showModal(session.status==='stalled'?'ledger-modal':'budget-modal');
$('budget-form').onsubmit=e=>{e.preventDefault();try{session.updateLimits(+$('budget-jev').value,+$('budget-planner').value);$('cap').value=String(session.config.cap);$('planner-cap').value=String(session.config.plannerCap);closeAll();toast('Limits approved. Counters unchanged. Press Run Jev or One turn when ready.');}catch(err){$('budget-error').textContent=err.message;}};$('pause-button').onclick=()=>{session.pause();toast('Paused. No new turn will commit from an outstanding request.');};
$('provider').onchange=()=>{$('api-key').value='';$('connection-test-result').textContent='';updateConnectionUI();};
$('connect-form').onsubmit=async e=>{e.preventDefault();$('connection-error').textContent='';try{
 session.connect($('api-key').value,{provider:$('provider').value,model:$('model').value,cap:+$('cap').value,gate:+$('confidence').value,transport:$('transport').value,planner:$('planner').value,plannerModel:$('planner-model').value,plannerCap:+$('planner-cap').value});$('api-key').value='';closeAll();const ok=await session.step();if(!ok&&session.error){$('connection-error').textContent=session.error;showModal('connect-modal');toast(session.error);}
 }catch(err){$('connection-error').textContent=err.message;}};
$('disconnect-button').onclick=()=>{session.disconnect();$('api-key').value='';closeAll();toast('Disconnected. The key was removed from application memory.');};
$('context-form').onsubmit=e=>{e.preventDefault();if(session.busy){toast('Pause before changing observer context.');return;}session.config.context=$('observer-context').value.trim().slice(0,1000);session.record('observer_context',{text:'Context updated for future Jev calls only.',context:session.config.context});closeAll();toast('Context saved. No world state, skill or inventory was changed.');};
$('log-search').oninput=()=>{logLimit=40;renderLedger();};$('more-logs').onclick=()=>{logLimit+=80;renderLedger();};$('export-button').onclick=exportAll;$('export-ledger').onclick=exportLogs;
$('retry-render').onclick=()=>initView();
$('capture-button').onclick=()=>{try{const a=document.createElement('a');a.href=view.capture();a.download='ORIGIN-clearing-turn-'+session.world.tick+'.png';a.click();}catch(e){toast(e.message);}};
$('reset-button').onclick=()=>{try{session.reset();closeAll();toast('New genesis. Prior receipts and request usage remain in the ledger.');}catch(e){toast(e.message);}};
$('import-button').onclick=()=>$('import-file').click();$('import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>33554432)throw Error('Snapshot is larger than the 32 MB import limit.');const data=JSON.parse(await file.text());session.restore(data);closeAll();toast('Local snapshot imported. Its historical receipts are unverified.');}catch(err){toast(err.message);}finally{e.target.value='';}};
window.addEventListener('origin-render-failure',e=>{session.pause('Rendering stopped.');$('render-error-text').textContent=e.detail;$('render-error').hidden=false;session.record('render_error',{text:e.detail});});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(session.running||session.busy))session.pause('Tab hidden; execution paused.');});
document.addEventListener('keydown',e=>{
 if(currentModal&&e.key==='Tab'){const items=[...$(currentModal).querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea,a[href],summary')].filter(x=>x.offsetParent!==null);const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 if(e.key==='Escape'){closeAll();$('right').classList.remove('open');return;}
 if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||currentModal)return;
 if(e.key.toLowerCase()==='f')document.body.classList.toggle('cinema');
 if(e.code==='Space'){e.preventDefault();if(session.busy||session.running)session.pause();else if(session.connected)session.start();else showModal('connect-modal');}
});

function updateConnectionUI(){
 const provider=$('provider').value,p=P.get(provider),bridge=$('transport').value==='bridge';
 if(!p.models.some(m=>m.id===$('model').value))$('model').innerHTML=p.models.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.label)+'</option>').join('');
 $('model').disabled=false;$('api-key').placeholder=provider==='typesafe'?'Paste your TypeSafe API key':'sk-or-v1-...';
 $('api-key-label').textContent='YOUR '+p.label.toUpperCase()+' API KEY';$('endpoint-label').textContent='POST '+p.endpoint;
 const hasKey=bridge&&session.serverHasKeyFor(provider);$('api-key').required=!hasKey;
 $('key-help').textContent=hasKey?p.envKey+' is configured on the local server. Leave this field blank to keep it server-side.':p.label+' key required. Paste it above or set '+p.envKey+' in .env and restart the local server.';
 $('test-connection').hidden=provider!=='typesafe';$('connect-title').textContent=provider==='typesafe'?'Connect your TypeSafe key.':'Connect your OpenRouter key.';
 if(!bridge&&$('planner').value!=='none')$('planner').value='none';
 $('planner-settings').hidden=!(bridge&&$('planner').value!=='none');$('planner-model').disabled=$('planner').value!=='cloud';
 $('planner-note').textContent=$('planner').value==='agy'?'Uses your authenticated agy executable. It can run alongside native TypeSafe, without OpenRouter. Set AGY_ENABLED=1 and configure its permissions. The TypeSafe key is not passed to agy.':'This optional text-generating LLM uses OpenRouter and its own PLANNER_API_KEY (or OPENROUTER_API_KEY). A TypeSafe key cannot authenticate that planner. Select Jev only to use TypeSafe alone.';
 $('bridge-status').textContent=bridgeMeta?(bridge?'Local bridge connected. Selected provider: '+p.label+'. '+(hasKey?'Matching server key configured.':'No matching server key; paste it above.'):'Browser-direct mode. Keys are sent to '+new URL(p.endpoint).hostname+'. A browser CORS/network error can be avoided with Local server bridge.'): 'Standalone page. For reliable native access, start the included local server. Browser-direct access depends on CORS and your network.';
}
$('transport').onchange=updateConnectionUI;$('planner').onchange=updateConnectionUI;
$('api-key').oninput=()=>{$('connection-test-result').textContent='';};
$('test-connection').onclick=async()=>{
 $('connection-error').textContent='';$('connection-test-result').textContent='Checking TypeSafe / GET /v1/models. No decision or world change.';
 try{const names=await session.testTypeSafeConnection($('api-key').value,{transport:$('transport').value});$('connection-test-result').textContent='TypeSafe account access confirmed. Listed models: '+(names.join(', ')||'(none returned)')+'. No world turn was executed. Connect & run still requires a valid decision response.';}
 catch(e){$('connection-test-result').textContent='';$('connection-error').textContent=e.message;}
};
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('origin-first-minds-v4',1);req.onupgradeneeded=()=>req.result.createObjectStore('checkpoints');req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);});}
async function localRead(){const db=await openDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('checkpoints'),req=tx.objectStore('checkpoints').get('latest');req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}finally{db.close();}}
async function localWrite(data){const db=await openDB();try{await new Promise((resolve,reject)=>{const tx=db.transaction('checkpoints','readwrite');tx.objectStore('checkpoints').put(data,'latest');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveCheckpoint(false),600);}
async function saveCheckpoint(explicit){
 if(session.busy){if(explicit)toast('Pause before saving a complete checkpoint.');return;}
 const stamp=session.world.tick+':'+session.log.length;if(!explicit&&stamp===lastSavedStamp)return;
 const snapshot=session.export();let localOK=false,diskOK=false,err='';
 try{await localWrite(snapshot);localOK=true;}catch(e){err=e.message;}
 if(session.bridgeAvailable)try{await session.checkpoint();diskOK=true;}catch(e){err=e.message;}
 if(localOK||diskOK){localCheckpoint=snapshot;lastSavedStamp=stamp;$('save-state').textContent='Saved turn '+snapshot.world.tick+' / '+(diskOK?'local disk + ':'')+(localOK?'browser storage':'disk only');$('restore-start').hidden=false;if(explicit)toast('Checkpoint saved. No key was included.');}
 else{$('save-state').textContent='Checkpoint failed: '+err;if(explicit)toast('Save failed. Use Export: '+err);}
}
async function restoreCheckpoint(){try{
 if(session.busy)throw Error('Pause before restoring a checkpoint.');
 const data=session.bridgeAvailable?await session.savedCheckpoint().catch(()=>localCheckpoint||localRead()):localCheckpoint||await localRead();
 if(!data)throw Error('No saved checkpoint. Use Import snapshot for an exported file.');session.restore(data);closeAll();toast('Restored turn '+session.world.tick+'. No API calls started.');
 }catch(e){toast(e.message);}}
$('supplied-recovery').onclick=async()=>{try{
 if(session.busy||session.running)throw Error('Pause before replacing the current world with the supplied recovery.');
 const response=await fetch('/api/recovery',{headers:{'X-Origin-Token':bridgeMeta.token},cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Recovery unavailable.');
 session.restore(data);closeAll();toast('Recovered supplied turn '+session.world.tick+'. No new knowledge or decisions were invented. Request limits are unchanged.');
 }catch(e){toast(e.message);}};
$('restore-button').onclick=restoreCheckpoint;$('restore-start').onclick=restoreCheckpoint;$('save-now').onclick=()=>saveCheckpoint(true);
async function bootstrap(){
 if(location.protocol==='http:'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost'))try{const res=await fetch('/api/bootstrap');if(res.ok){const info=await res.json();if(info.token){bridgeMeta=info;session.setBridge(info.token,info);$('transport').querySelector('[value=bridge]').disabled=false;$('transport').value='bridge';$('planner-model').value=info.plannerModel||'';if(info.checkpoint)$('restore-start').hidden=false;if(info.suppliedRecovery)$('supplied-recovery').hidden=false;}}}catch{}
 try{localCheckpoint=await localRead();if(localCheckpoint)$('restore-start').hidden=false;}catch{}
 persistenceReady=true;updateConnectionUI();render();
}
window.addEventListener('beforeunload',()=>{if(session.running||session.busy)session.pause('Page closing; pending turn cancelled.');});

render();initView();bootstrap();
})();
