/* Presentation only: poses read authorized world activities and the shared simulated clock. */
(function(){'use strict';const L=window.OriginLife;
class LivingView extends window.OriginView{
 constructor(...args){super(...args);this.objectViews={};this.blueprintViews={};this.selectedObject=null;this.onObject=null;this.onGround=null;this.cutaway=true;}
 async init(world){await super.init(world);this.skyClock=0;return this;}
 loadLibrary(){const sources=['assets/three.min.js','https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js','https://unpkg.com/three@0.160.1/build/three.min.js','https://raw.githubusercontent.com/mrdoob/three.js/r160/build/three.min.js'];return new Promise(async(resolve,reject)=>{for(const src of sources){try{await new Promise((ok,bad)=>{const s=document.createElement('script');s.src=src;let done=false;const finish=err=>{if(done)return;done=true;clearTimeout(timer);err?bad(err):ok();};const timer=setTimeout(()=>{s.remove();finish(Error('Timeout'));},7000);s.onload=()=>window.THREE?finish():finish(Error('Three.js missing'));s.onerror=()=>finish(Error('Library unavailable'));document.head.appendChild(s);});resolve();return;}catch{}}reject(Error('Three.js could not be loaded. Run node install-assets.cjs on a connected computer or allow the CDN, then retry. No replacement simulation is running.'));});}
 async reset(world){this.ready=false;this.renderer?.dispose();this.host.replaceChildren();this.labels.replaceChildren();}
 createObject(o){const T=this.T,g=new T.Group();g.position.set(o.x,0,o.z);const wood=this.mat('#7c6045'),cloth=this.mat('#c1ac82');this.scene.add(g);
  if(o.type==='bed'){this.box(g,wood,0,.07,0,1,.14,1.7);this.box(g,cloth,0,.19,0,.91,.15,1.6);this.sphere(g,this.mat('#dbccad'),0,.30,.58,.33,.10,.21);}
  else if(o.type==='table'||o.type==='workbench'){this.box(g,wood,0,.78,0,1.6,.14,1);for(const x of [-.6,.6])for(const z of [-.32,.32])this.box(g,wood,x,.37,z,.09,.74,.09);if(o.type==='workbench')this.box(g,this.mat('#aaa59c'),.4,.95,0,.3,.2,.3);}
  else if(o.type==='storage'){for(const z of [-.4,.4])for(const x of [-.5,.5])this.box(g,wood,x,.5,z,.1,1,.1);for(const y of [.1,.55,1])this.box(g,wood,0,y,0,1.2,.07,.95);for(let i=0;i<4;i++)this.sphere(g,this.mat('#a88845'),(i%2-.5)*.4,.74,Math.floor(i/2)*.3-.2,.14,.13,.14);}
  else if(o.type==='hearth'){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;this.sphere(g,this.mat('#97958b'),Math.sin(a)*.65,.12,Math.cos(a)*.65,.2,.14,.16);}}
  else {this.scene.remove(g);return;}
  g.traverse(n=>{if(n.isMesh)n.userData.objectId=o.id;});this.objectViews[o.id]=g;
 }
 sync(w){
  this.world=w;for(const a of w.entities)if(!this.people[a.id])this.makeHuman(a);for(const d of w.animals)if(!this.animals[d.id])this.makeDeer(d);
  super.sync(w);
  for(const a of w.entities){const p=this.people[a.id];p.g.scale.setScalar(a.height);p.height=a.height;const act=a.activity?w.activities[a.activity]:null;const status=act?(act.awaitingResponse?'Awaiting reply':act.elapsed<act.travel?'Walking':act.kind.replaceAll('_',' ')):a.cognition.pending?'Thinking':a.cognition.stalled?'Review':a.alive?'Waiting':'Deceased';p.tag.textContent=a.id+' / '+status;p.tag.title=a.observerName+' / '+status;}
  for(const id of Object.keys(this.people))if(!w.entities.some(a=>a.id===id)){this.scene.remove(this.people[id].g);this.people[id].tag.remove();delete this.people[id];}
  for(const o of w.objects){if(!this.objectViews[o.id]&&!['shelter','kiln','forge'].includes(o.type))this.createObject(o);const g=this.objectViews[o.id];if(g)g.visible=true;}
  for(const id of Object.keys(this.objectViews))if(!w.objects.some(o=>o.id===id)){this.scene.remove(this.objectViews[id]);delete this.objectViews[id];}
  for(const bp of w.blueprints){if(!this.blueprintViews[bp.id]){const T=this.T,geo=new T.BoxGeometry(bp.type==='shelter'?3:1.5,1,2);const box=new T.Mesh(geo,new T.MeshBasicMaterial({color:'#9bdcc4',wireframe:true,transparent:true,opacity:.7}));box.position.set(bp.x,.5,bp.z);this.scene.add(box);this.blueprintViews[bp.id]=box;}this.blueprintViews[bp.id].visible=!bp.built;}
  for(const s of w.structures){const g=this.built[s.id];if(g&&s.type==='shelter'){g.traverse(n=>{if(n.isMesh&&n.material?.side===this.T.DoubleSide){n.material.transparent=true;n.material.opacity=this.cutaway?.30:1;n.material.depthWrite=!this.cutaway;}});}}
 }
 pick(e){const T=this.T,r=this.renderer.domElement.getBoundingClientRect(),v=new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),ray=new T.Raycaster();ray.setFromCamera(v,this.camera);
  const hits=ray.intersectObjects([...Object.values(this.people).map(x=>x.g),...Object.values(this.objectViews)],true);const h=hits.find(h=>h.object.userData.subject||h.object.userData.objectId);if(h?.object.userData.subject){this.onSelect(h.object.userData.subject);return;}if(h?.object.userData.objectId){this.onObject?.(h.object.userData.objectId);return;}const ground=ray.intersectObject(this.ground);if(ground.length)this.onGround?.(ground[0].point);
 }
 frame(){if(!this.ready)return;requestAnimationFrame(()=>this.frame());this.updateCamera();const w=this.world;if(w){
   for(const a of w.entities){const p=this.people[a.id];if(!p)continue;const act=a.activity?w.activities[a.activity]:null,walking=act&&act.elapsed<act.travel;const previous=p.lastPosition||{x:a.x,z:a.z};const dx=a.x-previous.x,dz=a.z-previous.z;if(Math.hypot(dx,dz)>.002)p.g.rotation.y=Math.atan2(dx,dz);p.lastPosition={x:a.x,z:a.z};p.g.position.set(a.x,L.terrain?.visualHeight(w.terrain,a.x,a.z)||0,a.z);
    if(a.alive){p.g.rotation.z=0;const kind=act?.awaitingResponse?'observe':act?.kind||'',mapped=['sleep','relieve'].includes(kind)?'rest':['chat','comfort','joke','hug','court','partner','family','feed','care','play_together'].includes(kind)?'signal':['wash','repair','clean'].includes(kind)?'build':kind;
     this.pose(p,mapped,w.simTime*(kind==='run'?1.8:.7),walking||kind==='run'&&!!act);
     if(act?.kind==='sleep'&&!walking){p.g.rotation.z=Math.PI/2;p.g.position.y=(L.terrain?.visualHeight(w.terrain,a.x,a.z)||0)+.30;}
     if(['play','play_together','joke'].includes(kind)&&!walking){p.limbs.left.arm.rotation.x=-.5+Math.sin(w.simTime*2)*.25;p.limbs.right.arm.rotation.x=-.5-Math.sin(w.simTime*2)*.25;}
     if(act?.option.target&&!walking){const other=L.byId(w,act.actor===a.id?act.option.target:act.actor);if(other)p.g.rotation.y=Math.atan2(other.x-a.x,other.z-a.z);}
    }
    this.project(p.tag,p.g.position.x,p.g.position.y+2.03*p.height,p.g.position.z);
   }
   this.flames.children.forEach((f,i)=>f.scale.y=.8+Math.sin(w.simTime*8+i)*.2);
  }
  const p=this.people[this.selected];if(p){this.selection.position.set(p.g.position.x,(L.terrain?.visualHeight(w.terrain,p.g.position.x,p.g.position.z)||0)+.028,p.g.position.z);this.selection.visible=!p.dead;}
  for(const t of this.locationTags){t.el.classList.toggle('close-view',['eye','follow'].includes(this.cameraMode));this.project(t.el,t.x,t.y,t.z);}
  this.renderer.render(this.scene,this.camera);
 }
}
window.LivingView=LivingView;
})();
