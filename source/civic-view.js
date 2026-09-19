/* Actual world rendering. Isometric Canvas is a functional, explicitly named renderer,
   not an AI demo or test fixture. Optional Three.js displays the same authoritative state. */
(function(){'use strict';const L=window.OriginLife,Terrain=L.terrain;
class IsometricView{
 constructor(host,labels,onSelect){this.host=host;this.labels=labels;this.onSelect=onSelect;this.ready=false;this.selected='S01';this.cutaway=true;this.angle=.72;this.zoom=15;this.focus={x:0,z:2};this.cameraMode='orbit';this.hits=[];this.rendererName='ISOMETRIC / LIVE WORLD STATE';this.onGround=null;this.onObject=null;this.frameCount=0;}
 async init(w){this.world=w;this.canvas=document.createElement('canvas');this.canvas.setAttribute('aria-label','Isometric view of the actual civilization state');this.host.appendChild(this.canvas);this.ctx=this.canvas.getContext('2d');this.renderer={dispose:()=>{this.ready=false;this.canvas.remove();window.removeEventListener('resize',this.resizeHandler);}};this.bind();this.resize();this.ready=true;this.frame();return this;}
 resize(){const r=Math.min(devicePixelRatio||1,1.5);this.width=this.host.clientWidth;this.height=this.host.clientHeight;this.canvas.width=this.width*r;this.canvas.height=this.height*r;this.canvas.style.width='100%';this.canvas.style.height='100%';this.ctx.setTransform(r,0,0,r,0,0);}
 bind(){let drag=null;this.canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,dx:0,dy:0};this.canvas.setPointerCapture(e.pointerId);});this.canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.dx+=Math.abs(dx);drag.dy+=Math.abs(dy);if(e.shiftKey)this.angle+=dx*.007;else{const c=Math.cos(this.angle),s=Math.sin(this.angle);this.focus.x-=dx/this.zoom*c+dy/(this.zoom*.53)*s;this.focus.z+=dx/this.zoom*s-dy/(this.zoom*.53)*c;}drag.x=e.clientX;drag.y=e.clientY;this.cameraMode='orbit';});this.canvas.addEventListener('pointerup',e=>{if(drag&&drag.dx+drag.dy<6)this.pick(e);drag=null;});this.canvas.addEventListener('pointercancel',()=>drag=null);this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(4,Math.min(42,this.zoom*Math.exp(-e.deltaY*.001)));},{passive:false});this.resizeHandler=()=>this.resize();window.addEventListener('resize',this.resizeHandler);}
 project(x,z,h=0){const dx=x-this.focus.x,dz=z-this.focus.z,c=Math.cos(this.angle),s=Math.sin(this.angle);return {x:this.width*.51+(dx*c-dz*s)*this.zoom,y:this.height*.54+(dx*s+dz*c)*this.zoom*.53-h*this.zoom};}
 ground(x,z){return Terrain.visualHeight(this.world.terrain,x,z);}
 poly(points,fill,stroke=null){const g=this.ctx;g.beginPath();points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=.5;g.stroke();}}
 quad(x,z,w,d,h,color){this.poly([[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]].map(([x,z])=>this.project(x,z,h)),color);}
 box(x,z,w,d,h,y,color,top=null){const p=(x,z,h)=>this.project(x,z,h),a=p(x-w/2,z-d/2,y),b=p(x+w/2,z-d/2,y),c=p(x+w/2,z+d/2,y),e=p(x-w/2,z+d/2,y),aa=p(x-w/2,z-d/2,y+h),bb=p(x+w/2,z-d/2,y+h),cc=p(x+w/2,z+d/2,y+h),ee=p(x-w/2,z+d/2,y+h);this.poly([b,c,cc,bb],color);this.poly([c,e,ee,cc],shade(color,-16));this.poly([aa,bb,cc,ee],top||shade(color,14));}
 ellipse(x,z,h,rx,ry,fill){const p=this.project(x,z,h),g=this.ctx;g.fillStyle=fill;g.beginPath();g.ellipse(p.x,p.y,rx*this.zoom,ry*this.zoom,0,0,Math.PI*2);g.fill();}
 text(x,z,h,text,color='#e4eadb',size=10){const p=this.project(x,z,h),g=this.ctx;g.font=size+'px Arial';g.textAlign='center';const w=g.measureText(text).width;g.fillStyle='#183229dc';g.fillRect(p.x-w/2-5,p.y-size-3,w+10,size+7);g.fillStyle=color;g.fillText(text,p.x,p.y);}
 tree(c,i){const x=c.x+(i%2-.5)*1.2,z=c.z+(i/2-.5)*.8,y=this.ground(x,z),g=this.ctx;this.ellipse(x+.5,z+.5,y,.8,.35,'#192c241c');this.box(x,z,.2,.2,2.1,y,'#75614b');const p=this.project(x,z,y+2.6);g.fillStyle=this.world.climate?.season==='Autumn'?'#858048':'#596f47';g.beginPath();g.ellipse(p.x,p.y,1.1*this.zoom,1.35*this.zoom,-.1,0,7);g.fill();g.fillStyle='#8a9a6238';g.beginPath();g.ellipse(p.x-.3*this.zoom,p.y-.2*this.zoom,.75*this.zoom,1*this.zoom,0,0,7);g.fill();}
 human(a){const g=this.ctx,act=this.world.activities[a.activity],y=this.ground(a.x,a.z),p=this.project(a.x,a.z,y),scale=this.zoom*(a.height||1),walking=act&&act.elapsed<act.travel,phase=this.world.simTime*4,swing=walking?Math.sin(phase+a.id.length)*.12:0,sleep=act&&['sleep','furniture_sleep'].includes(act.kind)&&!walking;
 g.save();g.translate(p.x,p.y);this.hits.push({kind:'person',id:a.id,x:p.x,y:p.y-scale,r:Math.max(12,scale*.65)});g.fillStyle='#162d2435';g.beginPath();g.ellipse(0,0,scale*.37,scale*.14,0,0,7);g.fill();
 if(sleep){g.translate(-scale*.6,-scale*.15);g.rotate(Math.PI/2);}if(!a.alive)g.rotate(Math.PI/2);
 const limb=(x1,y1,x2,y2,width,color)=>{g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.beginPath();g.moveTo(x1*scale,y1*scale);g.lineTo(x2*scale,y2*scale);g.stroke();};
 limb(-.12,-.75,-.16+swing,0,.17*scale,shade(a.skin,-10));limb(.12,-.75,.16-swing,0,.17*scale,a.skin);
 g.fillStyle=a.cloth;g.beginPath();g.moveTo(-.28*scale,-1.43*scale);g.lineTo(.28*scale,-1.43*scale);g.lineTo(.33*scale,-.64*scale);g.lineTo(-.3*scale,-.64*scale);g.fill();
 let arm=walking?swing:act&&['build','room_build','gather_node','manufacture','craft_item','experiment'].includes(act.kind)?Math.sin(phase)*.18:0;
 limb(-.25,-1.32,-.4-arm,-.84,.14*scale,a.skin);limb(.25,-1.32,.4+arm,-.9,.14*scale,a.skin);
 g.fillStyle=a.skin;g.beginPath();g.ellipse(0,-1.66*scale,.24*scale,.29*scale,0,0,7);g.fill();g.fillStyle=a.hair;g.beginPath();g.ellipse(0,-1.78*scale,.255*scale,.17*scale,0,Math.PI,Math.PI*2);g.fill();g.fillRect(-.255*scale,-1.79*scale,.1*scale,.23*scale);
 if(scale>12){g.fillStyle='#2a2921';g.beginPath();g.arc(-.09*scale,-1.66*scale,.025*scale,0,7);g.arc(.09*scale,-1.66*scale,.025*scale,0,7);g.fill();g.strokeStyle='#654538';g.lineWidth=.7;g.beginPath();g.moveTo(-.07*scale,-1.52*scale);g.lineTo(.07*scale,-1.52*scale);g.stroke();}
 if(act&&!walking&&['chat','signal','joke','tell_story','court','comfort'].includes(act.kind)){g.fillStyle='#f4edd8';g.beginPath();g.ellipse(.6*scale,-2.1*scale,.5*scale,.29*scale,0,0,7);g.fill();g.fillStyle='#526455';g.font=Math.max(7,scale*.2)+'px Arial';g.textAlign='center';g.fillText(act.decision?.token||'...',.6*scale,-2.04*scale);}
 g.restore();if(a.id===this.selected){this.ellipse(a.x,a.z,y+.025,.53,.23,'#e9cc8b48');this.text(a.x,a.z,y+2.2*(a.height||1),a.identity?.name||a.observerName,'#fff0c8',11);}else if(this.zoom>16)this.text(a.x,a.z,y+2.12*(a.height||1),a.observerName,'#dce9d4',9);
 }
 object(o){const y=this.ground(o.x,o.z),x=o.x,z=o.z,t=o.type,wood='#8b6847',cloth='#c6b58a',f=L.furniture[t],rot=(o.rotation||0)%180,w=rot?(o.size?.[1]||1):(o.size?.[0]||1.4),d=rot?(o.size?.[0]||1.4):(o.size?.[1]||1),p=this.project(x,z,y+.6);this.hits.push({kind:'object',id:o.id,x:p.x,y:p.y,r:Math.max(9,this.zoom*.6)});
 if(t==='shelter'&&this.world.rooms.some(r=>Terrain.inRoom(r,o.x,o.z)))return;if(['shelter'].includes(t)){this.box(x,z,2.6,2.2,.25,y,'#958564');if(!this.cutaway)this.box(x,z,2.9,2.5,.25,y+1.9,'#9e966b');return;}
 if(['bed','double_bed','nursery_mat'].includes(t)){this.box(x,z,w,d,.25,y,wood);this.box(x,z,w-.08,d-.08,.17,y+.25,cloth);this.box(x,z-d*.32,w*.85,.4,.12,y+.42,'#e1d5b5');return;}
 if(t==='cradle'){this.box(x,z,w,d,.35,y,wood);this.box(x,z,w-.15,d-.15,.1,y+.35,'#f1dfb1');return;}
 if(['table','workbench','desk','dining_table','laboratory','computer_desk'].includes(t)){for(const sx of [-.36,.36])for(const sz of [-.34,.34])this.box(x+sx*w,z+sz*d,.1,.1,.75,y,wood);this.box(x,z,w,d,.12,y+.75,wood);if(t==='computer_desk'){this.box(x,z-.17,.7,.16,.55,y+.9,'#485957','#8ba6a0');this.box(x,z+.2,.7,.28,.03,y+.9,'#50615c');}if(t==='laboratory')this.box(x+.3,z,.2,.2,.3,y+.87,'#a0bbb0');return;}
 if(['chair','bench','sofa'].includes(t)){this.box(x,z,w,d,.42,y,wood);this.box(x,z,w-.08,d-.08,.16,y+.42,cloth);this.box(x,z-d/2+.1,w,.18,.55,y+.42,wood);return;}
 if(['solar_panel'].includes(t)){this.box(x,z,w,d,.12,y+.4,'#304e65','#48708a');const p1=this.project(x,z,y+.52),g=this.ctx;g.strokeStyle='#9ab4c555';for(let i=0;i<4;i++){const a=this.project(x-w/2+i*w/4,z-d/2,y+.53),b=this.project(x-w/2+i*w/4,z+d/2,y+.53);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}return;}
 if(['refrigerator','server_rack','shower','shelf'].includes(t)){this.box(x,z,w,d,1.8,y,t==='shelf'?wood:t==='shower'?'#8daeb0':'#a9b7ad');if(t==='server_rack')for(let i=0;i<5;i++)this.box(x,z+d/2,.7,.04,.13,y+.25+i*.27,'#526964');return;}
 if(['hearth','forge','kiln','stove','mill'].includes(t)){this.box(x,z,w,d,.65,y,'#898876');if(t==='hearth'&&this.world.fire.fuel>0){const g=this.ctx,p=this.project(x,z,y+.6);g.fillStyle='#eac279';g.beginPath();g.moveTo(p.x-this.zoom*.25,p.y);g.lineTo(p.x,p.y-this.zoom*.8);g.lineTo(p.x+this.zoom*.2,p.y);g.fill();}return;}
 if(t==='lamp'){this.box(x,z,.1,.1,1.5,y,'#6d7162');this.ellipse(x,z,y+1.55,.28,.18,o.powered?'#f4dfab':'#b4a983');return;}
 if(t==='easel'||t==='school_board'){this.box(x,z,.09,.09,1.4,y,wood);this.box(x,z,1,.16,.65,y+.8,t==='easel'?'#ddd0a4':'#425e4d');return;}
 this.box(x,z,w,d,['storage','market_stall','loom'].includes(t)?1:.55,y,['cistern','washbasin','potter_wheel'].includes(t)?'#bcb297':wood);if(t==='market_stall')this.box(x,z,w+ .3,d+.3,.15,y+1.9,'#b9a579');
 }
 room(r){const y=this.ground(r.x,r.z),x=r.x,z=r.z,w=r.width,d=r.depth,g=this.ctx;this.quad(x,z,w,d,y+.03,r.built?'#b0a087':'#8cb49a3d');if(!r.built){const p=this.project(x,z,y+.2);g.fillStyle='#d8f1cc';g.font='10px monospace';g.textAlign='center';g.fillText((r.name||'ROOM')+' '+r.progress+'/'+r.phases,p.x,p.y);return;}
 const h=this.cutaway?.75:2.5,wall='#c6b59a';
 for(const [axis,side,door]of [['z',-1,'north'],['z',1,'south'],['x',-1,'west'],['x',1,'east']]){const len=axis==='z'?w:d,at=axis==='z'?z+d/2*side:x+w/2*side,hh=this.cutaway&&side===1?.32:h;for(const part of (r.door===door?[-1,1]:[0])){const size=part?len/2-1:len,shift=part?(len/4+.5)*part:0;if(axis==='z')this.box(x+shift,at,size,.22,hh,y,wall);else this.box(at,z+shift,.22,size,hh,y,wall);}}
 if(!this.cutaway&&r.roof)this.box(x,z,w+.3,d+.3,.28,y+2.55,'#877757','#a09170');
 }
 frame(){if(!this.ready)return;this.raf=requestAnimationFrame(()=>this.frame());if(!this.world)return;this.frameCount++;if(this.frameCount%2!==0)return;const w=this.world,g=this.ctx;if(['follow','eye'].includes(this.cameraMode)){const a=L.byId(w,this.selected);if(a){this.focus.x+=(a.x-this.focus.x)*.1;this.focus.z+=(a.z-this.focus.z)*.1;}}
 const night=w.climate?.sun<=.01,gold=w.climate?.season==='Autumn';g.fillStyle=night?'#354b4e':'#a5b7a3';g.fillRect(0,0,this.width,this.height);this.hits=[];
 const cells=w.terrain?.cells||[];for(const c of cells){const p=this.project(c.x,c.z,this.ground(c.x,c.z));if(p.x<-80||p.x>this.width+80||p.y<-80||p.y>this.height+80)continue;const color=c.biome==='water'?night?'#4b6f73':'#759f9b':c.pollution>.12?'#7a7959':gold?'#979766':c.moisture>.65?'#819371':'#929c75';this.quad(c.x,c.z,w.terrain.step+.1,w.terrain.step+.1,this.ground(c.x,c.z),color);}
 for(const p of w.plots){this.quad(p.x,p.z,1.6,1.6,this.ground(p.x,p.z)+.04,'#6c5e43');if(!p.harvested)this.ellipse(p.x,p.z,this.ground(p.x,p.z)+.08+p.growth*.025,.5,.22,'#83a361');}
 for(const r of w.rooms||[])this.room(r);
 for(const bp of w.blueprints.filter(b=>!b.built))this.quad(bp.x,bp.z,1.5,1.5,this.ground(bp.x,bp.z)+.06,'#94debf66');
 const queue=[];for(const c of cells)if(c.trees>1&&Math.hypot(c.x,c.z)>23&&Math.abs(c.x-25)>6)queue.push({x:c.x,z:c.z,draw:()=>this.tree(c,0)});
 for(const n of w.nodes||[])if(n.quantity>0)queue.push({x:n.x,z:n.z,draw:()=>{const y=this.ground(n.x,n.z);if(n.kind==='wood')this.box(n.x,n.z,1.2,.6,.5,y,'#886646');else if(n.kind==='food'){this.ellipse(n.x,n.z,y+.4,.75,.45,'#738850');for(let i=0;i<4;i++)this.ellipse(n.x+(i%2-.5)*.6,n.z+(Math.floor(i/2)-.5)*.5,y+.8,.1,.1,'#b89862');}else if(n.kind==='water')this.ellipse(n.x,n.z,y+.02,1.4,.65,'#759d9d');else this.box(n.x,n.z,1,.9,.5,y,n.kind==='clay'?'#aa8770':n.kind==='coal'?'#5e665d':'#a3a497');if(this.zoom>15)this.text(n.x,n.z,y+1.1,n.kind+' '+n.quantity,'#d1dcc2',8);}});
 for(const o of w.objects)queue.push({x:o.x,z:o.z,draw:()=>this.object(o)});
 for(const a of w.entities)queue.push({x:a.x,z:a.z,draw:()=>this.human(a)});
 for(const a of w.animals.filter(a=>a.alive))queue.push({x:a.x,z:a.z,draw:()=>{const y=this.ground(a.x,a.z);this.box(a.x,a.z,.4,1,.35,y+.6,'#a58b63');for(const z of [-.35,.35])this.box(a.x,a.z+z,.15,.1,.6,y,'#907750');this.ellipse(a.x,a.z-.55,y+1.1,.17,.22,'#baa17a');}});
 queue.sort((a,b)=>this.project(a.x,a.z).y-this.project(b.x,b.z).y);for(const q of queue){const p=this.project(q.x,q.z);if(p.x>-80&&p.x<this.width+80&&p.y>-100&&p.y<this.height+100)q.draw();}
 if(night){g.fillStyle='#172e442c';g.fillRect(0,0,this.width,this.height);}
 const grad=g.createLinearGradient(0,0,0,this.height);grad.addColorStop(0,'#d8dfcc18');grad.addColorStop(.8,'#233b2900');grad.addColorStop(1,'#19312838');g.fillStyle=grad;g.fillRect(0,0,this.width,this.height);
 }
 sync(w){this.world=w;}
 select(id){this.selected=id;}
 mode(m){this.cameraMode=m;if(m==='orbit'){this.zoom=15;this.focus={x:0,z:2};}if(m==='overview'){this.zoom=6;this.focus={x:0,z:0};}if(m==='follow')this.zoom=23;if(m==='eye')this.zoom=34;}
 pick(e){const r=this.canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const hit=[...this.hits].reverse().find(h=>Math.hypot(x-h.x,y-h.y)<h.r);if(hit){if(hit.kind==='person')this.onSelect(hit.id);else this.onObject?.(hit.id);return;}const u=(x-this.width*.51)/this.zoom,v=(y-this.height*.54)/(this.zoom*.53),c=Math.cos(this.angle),s=Math.sin(this.angle);this.onGround?.({x:this.focus.x+u*c+v*s,z:this.focus.z-u*s+v*c});}
 capture(){return this.canvas.toDataURL('image/png');}
}
function shade(hex,delta){if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;const n=parseInt(hex.slice(1),16),v=[(n>>16)&255,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,v+delta)));return '#'+v.map(v=>v.toString(16).padStart(2,'0')).join('');}
class CivilizationView extends IsometricView{
 async init(w){if(w.scenario!=='first-minds'){this.zoom=23;this.focus={x:-3,z:2};}await super.init(w);this.preferred='isometric';if(window.THREE)setTimeout(()=>this.enableThree().catch(()=>{}),150);return this;}
 async enableThree(){if(this.loadingThree)throw Error('Three.js is already loading.');if(this.delegate){this.delegate.ready=true;this.delegate.frame();this.canvas.style.display='none';this.delegate.renderer.domElement.style.display='block';this.labels.style.display='block';this.rendererName='THREE.JS / LIVE WORLD STATE';return;}
  this.loadingThree=true;const oldOnSelect=this.onSelect,view=new window.LivingView(this.host,this.labels,oldOnSelect);view.onObject=id=>this.onObject?.(id);view.onGround=p=>this.onGround?.(p);try{await view.init(this.world);this.delegate=view;view.cutaway=this.cutaway;this.canvas.style.display='none';this.labels.style.display='block';this.rendererName='THREE.JS / LIVE WORLD STATE';this.preferred='three';}catch(e){view.ready=false;view.renderer?.dispose();if(view.renderer?.domElement)view.renderer.domElement.remove();this.rendererName='ISOMETRIC / THREE.JS UNAVAILABLE';throw e;}finally{this.loadingThree=false;}
 }
 disableThree(){if(this.delegate){this.delegate.ready=false;this.delegate.renderer.domElement.style.display='none';this.labels.style.display='none';}this.canvas.style.display='block';this.rendererName='ISOMETRIC / LIVE WORLD STATE';this.preferred='isometric';}
 sync(w){super.sync(w);if(this.delegate?.ready)this.delegate.sync(w);}
 select(id){super.select(id);this.delegate?.select(id);}
 mode(m){super.mode(m);this.delegate?.mode(m);}
 frame(){if(!this.ready)return;if(this.delegate?.ready){this.raf=requestAnimationFrame(()=>this.frame());this.delegate.cutaway=this.cutaway;return;}super.frame();}
 dispose(){this.ready=false;cancelAnimationFrame(this.raf);window.removeEventListener('resize',this.resizeHandler);this.renderer?.dispose();if(this.delegate){this.delegate.ready=false;this.delegate.renderer?.dispose();this.delegate.renderer?.domElement.remove();}this.labels.style.display='block';}
 capture(){return this.delegate?.ready?this.delegate.capture():super.capture();}
}
window.CivilizationView=CivilizationView;
})();
