/* Three.js view. All humans and scenery are original procedural geometry.
   Only camera movement is independent of committed Jev turns. */
(function(){'use strict';
class OriginView{
 constructor(host,labels,onSelect){this.host=host;this.labels=labels;this.onSelect=onSelect;this.ready=false;this.failed='';this.people={};this.animals={};this.built={};this.plots={};this.selected='S01';this.cameraMode='orbit';this.azimuth=.63;this.elevation=.64;this.radius=32;this.focus={x:0,y:.8,z:0};this.clock=0;this.motion=null;this.seed=71;this.pathLine=null;}
 async init(world){
  if(!window.THREE)await this.loadLibrary();const T=this.T=window.THREE;
  this.scene=new T.Scene();this.scene.background=new T.Color('#b8bbb0');this.scene.fog=new T.FogExp2('#b8bbb0',.012);
  this.camera=new T.PerspectiveCamera(43,1,.08,200);this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
  this.host.appendChild(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Interactive three-dimensional early-human settlement');
  this.scene.add(new T.HemisphereLight('#eee3ca','#596755',2.05));this.sun=new T.DirectionalLight('#ffe0a6',3.6);this.sun.position.set(-28,33,15);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-33,right:33,top:33,bottom:-33,near:1,far:110});this.sun.shadow.bias=-.00025;this.sun.shadow.normalBias=.025;this.scene.add(this.sun);this.scene.add(this.sun.target);
  this.materials={};this.unitSphere=new T.SphereGeometry(1,18,12);this.unitBox=new T.BoxGeometry(1,1,1);
  this.landscape();world.entities.forEach(a=>this.makeHuman(a));world.animals.forEach(a=>this.makeDeer(a));this.makeHearth();
  const ring=new T.RingGeometry(.4,.445,64);this.selection=new T.Mesh(ring,new T.MeshBasicMaterial({color:'#f0dcb2',side:T.DoubleSide,transparent:true,opacity:.95}));this.selection.rotation.x=-Math.PI/2;this.selection.position.y=.027;this.scene.add(this.selection);
  this.bind();this.ready=true;this.sync(world);this.resize();this.frame();return this;
 }
 loadLibrary(){
  const sources=['assets/three.min.js','https://raw.githubusercontent.com/mrdoob/three.js/r160/build/three.min.js','https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js','https://unpkg.com/three@0.160.1/build/three.min.js','https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.1/three.min.js'];
  return new Promise(async(resolve,reject)=>{for(const src of sources){try{await new Promise((ok,bad)=>{const s=document.createElement('script');s.src=src;s.crossOrigin='anonymous';let done=false;const finish=(err)=>{if(done)return;done=true;clearTimeout(timer);err?bad(err):ok();};const timer=setTimeout(()=>{s.remove();finish(Error('Library request timed out.'));},5000);s.onload=()=>window.THREE?finish():finish(Error('Three.js global missing.'));s.onerror=()=>finish(Error('Network error loading Three.js.'));document.head.appendChild(s);});return resolve();}catch(e){this.failed=e.message;}}reject(Error('Three.js could not load. With the local server, run node install-assets.cjs and reload. Otherwise allow the listed CDN domains, then Retry 3D. No replacement renderer or simulated decisions are being used.'));});
 }
 rand(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 mat(color,roughness=.9){const key=color+roughness;if(!this.materials[key])this.materials[key]=new this.T.MeshStandardMaterial({color,roughness});return this.materials[key];}
 mesh(geo,mat,parent=this.scene,x=0,y=0,z=0){const m=new this.T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 sphere(parent,mat,x,y,z,sx,sy,sz){const m=this.mesh(this.unitSphere,mat,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
 box(parent,mat,x,y,z,sx,sy,sz){const m=this.mesh(this.unitBox,mat,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
 rod(parent,a,b,r,mat,r2=r){const T=this.T;const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);const m=this.mesh(new T.CylinderGeometry(r2,r,d.length(),9),mat,parent);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
 terrainHeight(x,z){const r=Math.hypot(x,z);return r<24?-.025:Math.max(0,(r-24)*.25)+Math.sin(x*.16)*Math.cos(z*.19)*Math.min(1.5,Math.max(0,(r-24)*.09));}
 landscape(){
  const T=this.T;const ground=new T.PlaneGeometry(180,180,120,120);ground.rotateX(-Math.PI/2);const pos=ground.attributes.position;const colors=[];for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,this.terrainHeight(x,z));const r=Math.hypot(x,z),n=Math.sin(x*.8)*Math.sin(z*.6);const col=new T.Color(r<7?'#9b9373':r<21?'#7b8363':'#727f61');col.multiplyScalar(.93+n*.06);colors.push(col.r,col.g,col.b);}ground.setAttribute('color',new T.Float32BufferAttribute(colors,3));ground.computeVertexNormals();this.ground=this.mesh(ground,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));this.ground.castShadow=false;
  // Smooth, still river. Water time only advances during a committed action display.
  const bank=this.mesh(new T.PlaneGeometry(11,110),this.mat('#afa083'));bank.rotation.x=-Math.PI/2;bank.rotation.z=.11;bank.position.set(19,.015,0);
  this.water=this.mesh(new T.PlaneGeometry(6.7,110,12,32),new T.MeshStandardMaterial({color:'#7bada9',roughness:.21,metalness:.28,transparent:true,opacity:.9}));this.water.rotation.x=-Math.PI/2;this.water.rotation.z=.11;this.water.position.set(19,.045,0);this.water.castShadow=false;
  const pool=this.mesh(new T.CircleGeometry(3,64),new T.MeshStandardMaterial({color:'#8eaeab',roughness:.16,metalness:.34}));pool.rotation.x=-Math.PI/2;pool.position.set(14,.049,1);pool.castShadow=false;
  // Large forest silhouettes, all original geometry and deterministic placement.
  const trunks=[],leaves=[];
  for(let i=0;i<108;i++){const a=this.rand()*Math.PI*2,r=24+this.rand()*38,x=Math.cos(a)*r,z=Math.sin(a)*r;if(x>12&&x<27)continue;const h=4+this.rand()*7;this.tree(x,z,h,trunks,leaves);}
  for(const p of [[-13,-10,6],[-8,-12,7],[-15,4,7],[-12,12,8],[7,-23,7],[12,15,7],[-20,-2,7]])this.tree(...p,trunks,leaves);
  this.instanceParts(new T.CylinderGeometry(.18,.32,1,8),this.mat('#5f5843'),trunks);this.instanceParts(new T.IcosahedronGeometry(1,1),this.mat('#5f7250'),leaves);
  const grass=[];for(let i=0;i<3500;i++){const x=(this.rand()-.5)*110,z=(this.rand()-.5)*110,r=Math.hypot(x,z);if(r<6||(x>14&&x<25)||r>68)continue;grass.push({x,y:this.terrainHeight(x,z)+.16,z,sx:.04+this.rand()*.025,sy:.17+this.rand()*.29,sz:.03,ry:this.rand()*6.28});}
  this.instanceParts(new T.ConeGeometry(1,1,3),this.mat('#858f65'),grass);
  const rockMat=this.mat('#939486');for(let i=0;i<35;i++){const a=this.rand()*6.28,r=19+this.rand()*13,x=Math.cos(a)*r,z=Math.sin(a)*r;if(x>13&&x<25)continue;const m=this.mesh(new T.DodecahedronGeometry(1,0),rockMat);const s=.4+this.rand()*1.1;m.scale.set(s,s*.7,s*.8);m.position.set(x,this.terrainHeight(x,z)+s*.2,z);m.rotation.set(this.rand(),this.rand()*5,this.rand());}
  this.resourceMeshes={food:[],stone:[],wood:[]};for(let i=0;i<15;i++){
   const x=-10+(this.rand()-.5)*5,z=-7+(this.rand()-.5)*4;
   const bush=this.sphere(this.scene,this.mat('#60754a'),x,.45,z,.65,.5,.55);for(let j=0;j<3;j++){const fruit=this.sphere(this.scene,this.mat('#c39254'),x+(this.rand()-.5)*.8,.77+this.rand()*.2,z+(this.rand()-.5)*.7,.085,.10,.08);this.resourceMeshes.food.push(fruit);}
  }
  for(let i=0;i<18;i++){const x=10+(this.rand()-.5)*4,z=-7+(this.rand()-.5)*3;const m=this.mesh(new T.DodecahedronGeometry(.18+this.rand()*.55,0),rockMat);m.position.set(x,.15,z);m.scale.y=.7;this.resourceMeshes.stone.push(m);}
  for(let i=0;i<16;i++){const x=-10+(this.rand()-.5)*5,z=7+(this.rand()-.5)*4;this.resourceMeshes.wood.push(this.rod(this.scene,[x,.15,z],[x+.7+this.rand(),.15,z+this.rand()*.8],.06,this.mat('#74624d')));}
  // Narrow physical stepping stones at the quiet-water edge.
  for(let i=0;i<7;i++){const m=this.mesh(new T.CylinderGeometry(.35,.43,.13,8),rockMat);m.position.set(12.5+i*.8,.025,1+Math.sin(i)*.25);}
  this.locationTags=[];for(const id of ['grove','outcrop','woodland','pool','camp','meadow']){const s=window.OriginCore.SITES[id];const el=document.createElement('div');el.className='place-tag';el.textContent=s.name;this.labels.appendChild(el);this.locationTags.push({el,x:s.x,y:.5,z:s.z});}
 }
 tree(x,z,h,trunks,leaves){const y=this.terrainHeight(x,z);trunks.push({x,y:y+h*.43,z,sx:h*.075,sy:h*.86,sz:h*.075});for(let k=0;k<5;k++){const a=k*2.4;leaves.push({x:x+Math.cos(a)*h*.19,y:y+h*(.65+(k%3)*.09),z:z+Math.sin(a)*h*.17,sx:h*.29,sy:h*.23,sz:h*.26,ry:a});}}
 instanceParts(geo,mat,parts){const T=this.T;const m=new T.InstancedMesh(geo,mat,parts.length),o=new T.Object3D();parts.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.rotation.set(p.rx||0,p.ry||0,p.rz||0);o.scale.set(p.sx,p.sy,p.sz);o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;}
 clothTexture(color){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,128,128);for(let i=0;i<3000;i++){const v=this.rand()>.5?'rgba(30,23,12,.08)':'rgba(240,225,185,.10)';g.fillStyle=v;g.fillRect(this.rand()*128,this.rand()*128,1+this.rand()*2,1+this.rand()*3);}const t=new this.T.CanvasTexture(c);t.colorSpace=this.T.SRGBColorSpace;t.wrapS=t.wrapT=this.T.RepeatWrapping;return t;}
 makeHuman(a){
  const T=this.T,g=new T.Group();g.name=a.id;g.userData.subject=a.id;this.scene.add(g);g.scale.setScalar(a.height);
  const skin=this.mat(a.skin,.82),hair=this.mat(a.hair,.95),lip=this.mat(new T.Color(a.skin).multiplyScalar(.72).getStyle(),.85),cloth=new T.MeshStandardMaterial({map:this.clothTexture(a.cloth),roughness:1,side:T.DoubleSide});
  const hips=new T.Group();hips.position.y=.86;g.add(hips);
  this.sphere(hips,cloth,0,.035,0,.195,.17,.125);
  const torso=new T.Group();torso.position.y=.08;hips.add(torso);
  this.sphere(torso,cloth,0,.23,0,.235,.285,.13);
  const hem=this.mesh(new T.CylinderGeometry(.172,.246,.40,24,2,true),cloth,hips,0,-.10,0);hem.scale.z=.7;
  this.mesh(new T.TorusGeometry(.173,.019,5,32),this.mat('#66523a'),hips,0,.13,.007).rotation.x=Math.PI/2;
  // Shoulder fastening and neck, not abstract capsules replacing the head.
  this.sphere(torso,this.mat('#c6b191'),-.18,.46,.055,.027,.02,.035);
  this.mesh(new T.CylinderGeometry(.06,.07,.13,14),skin,torso,0,.53,0);
  const head=new T.Group();head.position.set(0,.68,.009);torso.add(head);
  this.sphere(head,skin,0,0,0,.119,.161,.108);this.sphere(head,skin,0,-.087,.024,.091,.077,.079);
  this.sphere(head,skin,-.058,-.028,.071,.048,.062,.043);this.sphere(head,skin,.058,-.028,.071,.048,.062,.043);
  this.sphere(head,skin,0,-.008,.110,.025,.048,.033);this.sphere(head,skin,0,-.032,.128,.030,.017,.020);
  for(const side of [-1,1]){
   this.sphere(head,lip,side*.014,-.040,.136,.007,.004,.006);
   this.sphere(head,skin,side*.119,-.008,0,.021,.040,.017);
   this.sphere(head,lip,side*.124,-.005,.009,.008,.021,.006);
   this.sphere(head,this.mat('#d5d1b8'),side*.046,.025,.093,.028,.0105,.013);
   this.sphere(head,this.mat('#3b3727'),side*.046,.025,.105,.009,.010,.004);
   this.sphere(head,this.mat('#151b13'),side*.046,.025,.108,.004,.006,.003);
   const brow=this.sphere(head,hair,side*.047,.047,.094,.032,.0065,.010);brow.rotation.z=side*-.08;
  }
  this.sphere(head,lip,0,-.076,.099,.036,.006,.010);this.sphere(head,skin,0,-.086,.101,.032,.006,.009);
  const cap=this.mesh(new T.SphereGeometry(1,20,14,0,Math.PI*2,0,Math.PI*.54),hair,head,0,.04,-.007);cap.scale.set(.124,.133,.111);
  for(let i=0;i<10;i++){const angle=i/10*Math.PI*2;this.sphere(head,hair,Math.sin(angle)*.106,.026+Math.cos(angle)*.020,Math.cos(angle)*.081-.012,.024,.048,.023);}
  if(['S02','S04','S06'].includes(a.id)){for(let i=-1;i<=1;i++)this.sphere(head,hair,i*.05,-.085,-.077,.052,.125,.040);}
  const limbs={};for(const side of [-1,1]){
   const leg=new T.Group();leg.position.set(side*.099,-.017,0);hips.add(leg);this.sphere(leg,skin,0,-.18,0,.076,.242,.079);
   const knee=new T.Group();knee.position.y=-.40;leg.add(knee);this.sphere(knee,skin,0,-.017,.004,.050,.068,.051);this.sphere(knee,skin,0,-.19,-.005,.054,.213,.060);this.sphere(knee,skin,0,-.394,.060,.055,.046,.123);
   const arm=new T.Group();arm.position.set(side*.235,.399,0);torso.add(arm);this.sphere(arm,skin,0,-.02,0,.074,.10,.073);this.sphere(arm,skin,side*.015,-.158,0,.054,.174,.056);
   const elbow=new T.Group();elbow.position.set(side*.022,-.287,0);arm.add(elbow);this.sphere(elbow,skin,0,-.02,0,.043,.055,.044);this.sphere(elbow,skin,0,-.12,.007,.042,.139,.044);
   const hand=new T.Group();hand.position.set(0,-.253,.004);elbow.add(hand);this.sphere(hand,skin,0,-.02,0,.038,.055,.027);
   for(let f=0;f<4;f++)this.sphere(hand,skin,(f-1.5)*.016,-.078+Math.abs(f-1.5)*.006,0,.009,.035,.009);this.sphere(hand,skin,side*.043,-.02,.008,.014,.032,.015);
   arm.rotation.z=side*.08;elbow.rotation.x=-.10;
   limbs[side===-1?'left':'right']={leg,knee,arm,elbow,hand};
  }
  const prop=this.mesh(new T.DodecahedronGeometry(.06,0),this.mat('#919187'),limbs.right.hand,0,-.08,.04);prop.visible=false;
  g.traverse(n=>{if(n.isMesh)n.userData.subject=a.id;});
  const tag=document.createElement('button');tag.type='button';tag.className='person-tag';tag.textContent=a.id;tag.setAttribute('aria-label','Inspect '+a.id);tag.onclick=()=>this.onSelect(a.id);this.labels.appendChild(tag);
  this.people[a.id]={g,hips,torso,head,limbs,tag,prop,height:a.height,dead:false};g.position.set(a.x,0,a.z);
 }
 makeDeer(d){const T=this.T,g=new T.Group();this.scene.add(g);const coat=this.mat('#a88d63'),dark=this.mat('#554f3d');this.sphere(g,coat,0,.95,0,.28,.30,.61);this.sphere(g,coat,0,1.27,.40,.14,.38,.15);this.sphere(g,coat,0,1.52,.55,.16,.19,.29);this.sphere(g,dark,0,1.48,.79,.10,.09,.035);
  for(const s of [-1,1]){const ear=this.sphere(g,coat,s*.19,1.7,.5,.09,.18,.04);ear.rotation.z=s*-.65;this.sphere(g,dark,s*.13,1.56,.61,.015,.018,.01);for(const z of [-.37,.37]){this.rod(g,[s*.19,.85,z],[s*.18,.12,z+.04],.035,coat);this.sphere(g,dark,s*.18,.08,z+.05,.045,.06,.06);}}
  g.position.set(d.x,0,d.z);g.rotation.y=.5;this.animals[d.id]=g;
 }
 makeHearth(){const T=this.T,g=new T.Group();g.position.set(-3,0,-2);this.scene.add(g);for(let i=0;i<11;i++){const a=i/11*6.28;this.sphere(g,this.mat('#85877b'),Math.cos(a)*.62,.12,Math.sin(a)*.62,.18,.14,.15);}for(let i=0;i<3;i++){const a=i*2.1;this.rod(g,[Math.cos(a)*-.47,.18,Math.sin(a)*-.47],[Math.cos(a)*.47,.18,Math.sin(a)*.47],.08,this.mat('#4d4736'));}
  this.flames=new T.Group();g.add(this.flames);for(let i=0;i<7;i++){const f=this.mesh(new T.ConeGeometry(.16,.65,8),new T.MeshBasicMaterial({color:i%2?'#f5c46a':'#e98b45',transparent:true,opacity:.65}),this.flames,(i%3-1)*.17,.42,(Math.floor(i/3)-1)*.16);f.scale.y=.6+(i%3)*.3;}
  this.fireLight=new T.PointLight('#ffaf53',0,14,2);this.fireLight.position.set(-3,.9,-2);this.scene.add(this.fireLight);this.flames.visible=false;
 }
 build(s){const T=this.T,g=new T.Group();g.position.set(s.x,0,s.z);this.scene.add(g);const wood=this.mat('#847157'),cover=new T.MeshStandardMaterial({map:this.clothTexture('#9d9070'),roughness:1,side:T.DoubleSide});
  if(s.type==='shelter'||s.type==='frame'){
   for(const z of [-.9,.9]){this.rod(g,[-1.2,0,z],[0,1.9,z],.065,wood);this.rod(g,[1.2,0,z],[0,1.9,z],.065,wood);}this.rod(g,[0,1.9,-1.1],[0,1.9,1.1],.065,wood);
   if(s.type==='shelter')for(const side of [-1,1]){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([0,1.9,-1.1,side*1.2,0,-1.1,0,1.9,1.1,0,1.9,1.1,side*1.2,0,-1.1,side*1.2,0,1.1],3));geo.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,0,1,1,0,1,1],2));geo.computeVertexNormals();this.mesh(geo,cover,g);}
  }else if(s.type==='mechanism'){for(const x of [-.7,.7])this.rod(g,[x,0,0],[x,1.5,0],.08,wood);const wheel=this.mesh(new T.TorusGeometry(.65,.055,7,22),wood,g,0,.9,0);wheel.rotation.y=Math.PI/2;for(let i=0;i<8;i++){const r=i/8*Math.PI*2;this.rod(g,[0,.9,0],[0,.9+Math.sin(r)*.63,Math.cos(r)*.63],.035,wood);}}else{this.mesh(new T.CylinderGeometry(.58,.82,.9,18),this.mat('#9c8d76'),g,0,.45,0);this.mesh(new T.CylinderGeometry(.26,.26,.08,16),this.mat('#34372d'),g,0,.92,0);}
  this.built[s.id]=g;
 }
 sync(w){this.world=w;for(const a of w.entities){const p=this.people[a.id];if(!p)continue;if(!this.motion||this.motion.actor!==a.id)p.g.position.set(a.x,0,a.z);p.dead=!a.alive;p.g.rotation.z=a.alive?0:Math.PI/2;p.prop.visible=!!(a.inventory.stone_tool||a.inventory.metal_tool);p.tag.classList.toggle('dead',!a.alive);}
  for(const d of w.animals){const g=this.animals[d.id];g.visible=d.alive;g.position.set(d.x,0,d.z);}
  for(const s of w.structures)if(!this.built[s.id])this.build(s);for(const id of Object.keys(this.built))if(!w.structures.some(s=>s.id===id)){this.scene.remove(this.built[id]);delete this.built[id];}
  for(const p of w.plots){if(!this.plots[p.id]){const g=new this.T.Group();g.position.set(p.x,0,p.z);this.scene.add(g);this.box(g,this.mat('#655d43'),0,.04,0,.95,.08,.95);const growth=new this.T.Group();g.add(growth);for(let i=0;i<5;i++)this.sphere(growth,this.mat('#819a57'),(i%3-1)*.23,.22,Math.floor(i/3)*.28-.12,.12,.2,.06);this.plots[p.id]={g,growth};}const view=this.plots[p.id];view.growth.visible=!p.harvested;view.growth.scale.y=Math.min(1,p.growth/12+.05);}
  for(const id of Object.keys(this.plots))if(!w.plots.some(p=>p.id===id)){this.scene.remove(this.plots[id].g);delete this.plots[id];}
  this.flames.visible=w.fire.fuel>0;this.fireLight.intensity=w.fire.fuel>0?17:0;
  for(const key of Object.keys(this.resourceMeshes)){const cap={food:90,wood:120,stone:100}[key];this.resourceMeshes[key].forEach((m,i)=>m.visible=i/this.resourceMeshes[key].length<w.resources[key]/cap);}
  const day=w.minutes%1440;const night=day<330||day>1190;this.sun.intensity=night?.18:3.6;this.renderer.toneMappingExposure=night?.65:1.1;this.scene.background.set(night?'#404c53':'#b8bbb0');this.scene.fog.color.copy(this.scene.background);this.select(this.selected);
 }
 select(id){this.selected=id;for(const [k,p]of Object.entries(this.people))p.tag.classList.toggle('selected',k===id);}
 mode(mode){this.cameraMode=mode;if(mode==='orbit'){this.radius=32;this.elevation=.64;this.focus={x:0,y:.6,z:0};}if(mode==='overview'){this.radius=52;this.elevation=1.20;this.focus={x:0,y:0,z:0};}if(mode==='follow'){this.radius=8;this.elevation=.34;}if(mode==='eye'){this.radius=3.8;this.elevation=.06;}this.updateCamera();}
 bind(){const canvas=this.renderer.domElement;let pointer=null;canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY,prevX:e.clientX,prevY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.prevX,dy=e.clientY-pointer.prevY;if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>5)pointer.moved=true;this.azimuth-=dx*.005;this.elevation=Math.max(.04,Math.min(1.5,this.elevation+dy*.004));pointer.prevX=e.clientX;pointer.prevY=e.clientY;});canvas.addEventListener('pointerup',e=>{if(pointer&&!pointer.moved)this.pick(e);pointer=null;});canvas.addEventListener('pointercancel',()=>pointer=null);canvas.addEventListener('wheel',e=>{e.preventDefault();this.radius=Math.max(2,Math.min(75,this.radius*Math.exp(e.deltaY*.001)));},{passive:false});window.addEventListener('resize',()=>this.resize());canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;window.dispatchEvent(new CustomEvent('origin-render-failure',{detail:'WebGL context was lost. Execution has stopped. Reload to restore rendering.'}));});}
 pick(e){const T=this.T,r=this.renderer.domElement.getBoundingClientRect(),p=new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),ray=new T.Raycaster();ray.setFromCamera(p,this.camera);const hits=ray.intersectObjects(Object.values(this.people).map(p=>p.g),true);const id=hits.find(h=>h.object.userData.subject)?.object.userData.subject;if(id)this.onSelect(id);}
 resize(){if(!this.renderer)return;const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 updateCamera(){if(['follow','eye'].includes(this.cameraMode)){const p=this.people[this.selected]?.g.position;if(p){this.focus.x+=(p.x-this.focus.x)*.13;this.focus.z+=(p.z-this.focus.z)*.13;this.focus.y=this.cameraMode==='eye'?1.35:1.0;}}
  const f=this.focus,r=this.radius,e=this.elevation,a=this.azimuth;this.camera.position.set(f.x+Math.sin(a)*Math.cos(e)*r,f.y+Math.sin(e)*r,f.z+Math.cos(a)*Math.cos(e)*r);this.camera.lookAt(f.x,f.y,f.z);
 }
 project(el,x,y,z){const v=new this.T.Vector3(x,y,z).project(this.camera);const visible=v.z<1&&v.x>-1.2&&v.x<1.2&&v.y>-1.2&&v.y<1.2;el.hidden=!visible;if(visible){el.style.left=(v.x*.5+.5)*this.host.clientWidth+'px';el.style.top=(-v.y*.5+.5)*this.host.clientHeight+'px';}}
 pose(p,kind,t,moving){const sin=Math.sin(t*10),c=Math.cos(t*10);p.hips.position.y=.86+(moving?Math.abs(sin)*.022:0);p.torso.rotation.x=0;p.head.rotation.x=0;
  for(const [key,side]of [['left',-1],['right',1]]){const l=p.limbs[key];l.leg.rotation.x=moving?sin*side*.48:0;l.knee.rotation.x=moving?Math.max(0,-sin*side)*.65:0;l.arm.rotation.x=moving?-sin*side*.42:0;l.arm.rotation.z=side*.08;l.elbow.rotation.x=-.12;}
  if(moving)return;
  if(['gather','experiment','build','plant','tend','harvest','drink'].includes(kind)){p.torso.rotation.x=.3;p.head.rotation.x=.18;for(const l of Object.values(p.limbs)){l.arm.rotation.x=-.8+sin*.20;l.elbow.rotation.x=-.8;}}
  if(['signal','share','take','teach'].includes(kind)){p.limbs.right.arm.rotation.x=-1.1+sin*.08;p.limbs.right.elbow.rotation.x=-.35;p.head.rotation.y=sin*.05;}
  if(['eat','cook'].includes(kind)){p.limbs.right.arm.rotation.x=-.7;p.limbs.right.elbow.rotation.x=-1.5+sin*.1;}
  if(kind==='rest'){p.hips.position.y=.51;p.limbs.left.leg.rotation.x=-1.3;p.limbs.right.leg.rotation.x=-1.3;p.limbs.left.knee.rotation.x=1.45;p.limbs.right.knee.rotation.x=1.45;p.torso.rotation.x=.15;}
  if(kind==='reflect'||kind==='observe'){p.head.rotation.y=Math.sin(t*2)*.17;}
 }
 async animate(before,after,option,decisions,signal,speed=4){
  if(!this.ready)return;const id=after.lastCommit.actor,start=window.OriginCore.byId(before,id),end=window.OriginCore.byId(after,id),p=this.people[id];
  const distance=Math.hypot(end.x-start.x,end.z-start.z),duration=Math.max(.8,distance/(1.4*speed))+.8;this.motion={actor:id,from:{x:start.x,z:start.z},to:{x:end.x,z:end.z},distance,kind:option.kind,started:performance.now(),duration,walking:Math.max(.05,duration-.8),speed};this.sync(after);p.g.position.set(start.x,0,start.z);
  if(decisions.token){p.tag.textContent=id+' / '+decisions.token;setTimeout(()=>p.tag.textContent=id,4500);}
  await new Promise(resolve=>{this.motion.resolve=resolve;const done=()=>{if(this.motion?.actor===id){this.motion=null;p.g.position.set(end.x,0,end.z);this.pose(p,'',0,false);}signal.removeEventListener('abort',done);resolve();};this.motion.done=done;signal.addEventListener('abort',done,{once:true});});
 }
 frame(){if(!this.ready)return;requestAnimationFrame(()=>this.frame());const now=performance.now();this.updateCamera();
  if(this.motion){const m=this.motion,p=this.people[m.actor],t=(now-m.started)/1000,u=Math.min(1,t/m.walking);p.g.position.set(m.from.x+(m.to.x-m.from.x)*u,0,m.from.z+(m.to.z-m.from.z)*u);if(m.distance>.05)p.g.rotation.y=Math.atan2(m.to.x-m.from.x,m.to.z-m.from.z);this.pose(p,m.kind,t*m.speed,u<1&&m.distance>.05);this.clock+=.015;this.flames.children.forEach((f,i)=>f.scale.y=.75+Math.sin(this.clock*9+i)*.2);if(t>=m.duration)m.done();}
  const selected=this.people[this.selected];if(selected){this.selection.position.set(selected.g.position.x,.028,selected.g.position.z);this.selection.visible=!selected.dead;}
  for(const p of Object.values(this.people))this.project(p.tag,p.g.position.x,2.03*p.height,p.g.position.z);
  for(const t of this.locationTags){t.el.classList.toggle('close-view',['eye','follow'].includes(this.cameraMode));this.project(t.el,t.x,t.y,t.z);}
  this.renderer.render(this.scene,this.camera);
 }
 capture(){if(!this.ready)throw Error('3D is not ready.');this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
}
window.OriginView=OriginView;
})();
