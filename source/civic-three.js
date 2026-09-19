/* Three.js projection of exactly the same terrain, rooms, objects and finite nodes. */
(function(){'use strict';const V=window.LivingView,L=window.OriginLife;
const baseSync=V.prototype.sync,baseObject=V.prototype.createObject;
V.prototype.landscape=function(){const T=this.T,w=this.world,terrain=w.terrain;this.resourceMeshes={food:[],stone:[],wood:[]};this.locationTags=[];this.nodeViews={};this.roomViews={};this.roomRevision='';
 const geo=new T.PlaneGeometry(110,110,64,64);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,colors=[];for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),c=L.terrain.cell(terrain,x,z);p.setY(i,L.terrain.visualHeight(terrain,x,z));const col=new T.Color(c?.biome==='water'?'#719b98':c?.moisture>.6?'#83916c':'#989e73');colors.push(col.r,col.g,col.b);}geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();this.ground=this.mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));this.ground.castShadow=false;
 for(const c of terrain.cells)if(c.trees>1&&Math.hypot(c.x,c.z)>23&&Math.abs(c.x-25)>6){const y=L.terrain.visualHeight(terrain,c.x,c.z),g=new T.Group();g.position.set(c.x,y,c.z);this.scene.add(g);this.mesh(new T.CylinderGeometry(.13,.22,2.6,6),this.mat('#716044'),g,0,1.3,0);this.sphere(g,this.mat('#68824f'),0,2.8,0,1,1.5,.9);}
 for(const n of w.nodes){const g=new T.Group();g.position.set(n.x,L.terrain.visualHeight(terrain,n.x,n.z),n.z);this.scene.add(g);if(n.kind==='water'){const m=this.mesh(new T.CircleGeometry(1.6,30),new T.MeshStandardMaterial({color:'#7ba8a2',roughness:.25}),g);m.rotation.x=-Math.PI/2;m.position.y=.04;}else if(n.kind==='wood'){for(let i=0;i<4;i++)this.box(g,this.mat('#8b6847'),(i%2-.5)*.5,.25+Math.floor(i/2)*.22,0,1.5,.22,.22);}else if(n.kind==='food'){this.sphere(g,this.mat('#738c51'),0,.65,0,.8,.7,.75);for(let i=0;i<6;i++)this.sphere(g,this.mat('#bc9564'),Math.cos(i)*.7,.8,Math.sin(i)*.7,.12,.12,.12);}else this.sphere(g,this.mat(n.kind==='clay'?'#ad8b75':n.kind==='coal'?'#565e54':'#a2a291'),0,.35,0,.8,.5,.7);this.nodeViews[n.id]=g;}
};
V.prototype.createObject=function(o){if(['bed','table','workbench','storage','hearth'].includes(o.type)){baseObject.call(this,o);return;}const T=this.T,g=new T.Group();g.position.set(o.x,L.terrain.visualHeight(this.world.terrain,o.x,o.z),o.z);g.rotation.y=(o.rotation||0)*Math.PI/180;this.scene.add(g);const f=L.furniture[o.type],s=f?.size||[1.4,1.2],wood=this.mat('#846547'),cloth=this.mat('#c4b58e'),metal=this.mat('#929f95'),x=s[0],z=s[1];
 if(['double_bed','nursery_mat','cradle'].includes(o.type)){this.box(g,wood,0,.13,0,x,.26,z);this.box(g,cloth,0,.36,0,x-.1,.2,z-.1);this.box(g,this.mat('#e5d9bc'),0,.5,-z*.3,x-.2,.12,.4);}
 else if(['chair','bench','sofa'].includes(o.type)){this.box(g,wood,0,.25,0,x,.5,z);this.box(g,cloth,0,.56,0,x-.1,.13,z-.1);this.box(g,wood,0,.9,-z/2+.1,x,.8,.2);}
 else if(['desk','dining_table','laboratory','computer_desk'].includes(o.type)){this.box(g,wood,0,.8,0,x,.12,z);for(const xx of [-x*.4,x*.4])for(const zz of [-z*.35,z*.35])this.box(g,wood,xx,.4,zz,.08,.8,.08);if(o.type==='computer_desk'){this.box(g,this.mat('#46635e'),0,1.2,-.15,.7,.55,.14);this.box(g,this.mat('#a3c1b7'),0,1.2,-.065,.62,.44,.02);this.box(g,metal,0,.9,.25,.7,.04,.28);}}
 else if(o.type==='solar_panel'){this.box(g,metal,0,.3,0,.12,.6,.12);const panel=this.box(g,this.mat('#385b73'),0,.65,0,x,.13,z);panel.rotation.x=.18;}
 else if(['lamp'].includes(o.type)){this.box(g,metal,0,.75,0,.06,1.5,.06);this.sphere(g,this.mat('#e4d3a5'),0,1.6,0,.25,.2,.25);}
 else if(['shower','server_rack','refrigerator','shelf'].includes(o.type)){this.box(g,o.type==='shelf'?wood:metal,0,.9,0,x,1.8,z);if(o.type==='server_rack')for(let i=0;i<5;i++)this.box(g,this.mat('#455f56'),0,.22+i*.29,z/2+.01,x*.8,.12,.025);}
 else if(o.type==='easel'||o.type==='school_board'){this.box(g,wood,0,.75,0,.1,1.5,.1);this.box(g,this.mat(o.type==='easel'?'#dbc99b':'#3c5b47'),0,1.3,0,1,.7,.16);}
 else if(o.type==='waterwheel'){for(const xx of [-.8,.8])this.box(g,wood,xx,.9,0,.12,1.8,.12);const m=this.mesh(new T.TorusGeometry(.8,.06,6,24),wood,g,0,1,0);m.rotation.y=Math.PI/2;}
 else{this.box(g,['cistern','washbasin','stove','mill','potter_wheel'].includes(o.type)?metal:wood,0,.4,0,x,.8,z);if(o.type==='market_stall')this.box(g,cloth,0,2,0,x+.2,.14,z+.2);}
 g.traverse(n=>{if(n.isMesh)n.userData.objectId=o.id;});this.objectViews[o.id]=g;
};
V.prototype.sync=function(w){baseSync.call(this,w);const T=this.T;for(const n of w.nodes||[]){const g=this.nodeViews?.[n.id];if(g)g.visible=n.quantity+n.reserved>0;}
 for(const o of w.objects){const g=this.objectViews[o.id];if(g){g.visible=!(o.type==='shelter'&&w.rooms.some(r=>L.terrain.inRoom(r,o.x,o.z)));g.position.y=L.terrain.visualHeight(w.terrain,o.x,o.z);g.rotation.y=(o.rotation||0)*Math.PI/180;}}
 const signature=(w.rooms||[]).map(r=>r.id+':'+r.progress+':'+this.cutaway).join('|');if(signature!==this.roomRevision){for(const g of Object.values(this.roomViews||{}))this.scene.remove(g);this.roomViews={};this.roomRevision=signature;
  for(const r of w.rooms||[]){const g=new T.Group();g.position.set(r.x,L.terrain.visualHeight(w.terrain,r.x,r.z),r.z);this.scene.add(g);this.roomViews[r.id]=g;const floor=this.mat('#ae9c7c'),wall=this.mat('#c7bda6');this.box(g,floor,0,.03,0,r.width,.06,r.depth);
   if(!r.built){const mesh=this.mesh(new T.BoxGeometry(r.width,2.5,r.depth),new T.MeshBasicMaterial({color:'#a8d5b6',wireframe:true,transparent:true,opacity:.5}),g,0,1.25,0);continue;}
   const h=this.cutaway?.7:2.5,wallAt=(axis,side,len,door)=>{const fixed=(axis==='x'?r.width:r.depth)/2*side;if(door){for(const part of [-1,1]){const pos=(len/4+.5)*part;if(axis==='x')this.box(g,wall,fixed,h/2,pos,.2,h,len/2-1);else this.box(g,wall,pos,h/2,fixed,len/2-1,h,.2);}}else{if(axis==='x')this.box(g,wall,fixed,h/2,0,.2,h,len);else this.box(g,wall,0,h/2,fixed,len,h,.2);}};
   wallAt('z',1,r.width,r.door==='south');wallAt('z',-1,r.width,r.door==='north');wallAt('x',1,r.depth,r.door==='east');wallAt('x',-1,r.depth,r.door==='west');if(!this.cutaway&&r.roof)this.box(g,this.mat('#9b8d6c'),0,2.6,0,r.width+.3,.2,r.depth+.3);
  }
 }
};
})();
