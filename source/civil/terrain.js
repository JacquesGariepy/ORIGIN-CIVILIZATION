/* Geographic and physical terrain. Coastlines are real data; all generated cells and
   mineral stocks are explicitly model estimates. No behavioral choices occur here. */
(function(root,factory){const M=factory();if(typeof module==='object'&&module.exports)module.exports=M;else root.OriginTerrain=M;})(globalThis,function(){
'use strict';
const N=33,SPAN=96,STEP=SPAN/(N-1);
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function noise(seed,x,z){let n=Math.imul(x+104729,374761393)^Math.imul(z+50021,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
function create(anchor={lat:36.1,lon:37.2},elevation=null){
 const lat=Number(anchor.lat),lon=Number(anchor.lon);if(!Number.isFinite(lat)||lat<-80||lat>80||!Number.isFinite(lon)||lon<-180||lon>180)throw Error('Choose a supported Earth coordinate (-80 to 80 latitude).');
 if(elevation){if(!Array.isArray(elevation.values)||elevation.values.length!==N*N||elevation.values.some(h=>!Number.isFinite(h)||h < -12000||h>10000)||!Number.isFinite(elevation.metresPerUnit)||elevation.metresPerUnit<1||elevation.metresPerUnit>10000)throw Error('Elevation requires exactly 1089 finite Earth heights and a valid metresPerUnit scale.');}
 const seed=hash(lat.toFixed(4)+','+lon.toFixed(4)),cells=[];
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){
  const x=-SPAN/2+i*STEP,z=-SPAN/2+j*STEP;
  const riverX=25+Math.sin(z*.065)*3;
  const h=elevation?Number(elevation.values[j*N+i]):Math.max(0,Math.hypot(x,z)-14)*.025+Math.sin(x*.09)*Math.cos(z*.06)*.6;
  const moisture=clamp(.78-Math.abs(x-riverX)*.008+noise(seed,i,j)*.15);
  const water=Math.abs(x-riverX)<1.8;
  cells.push({x,z,height:h,moisture:+moisture.toFixed(3),fertility:+clamp(.32+moisture*.6+noise(seed+5,i,j)*.1).toFixed(3),biome:water?'water':Math.abs(lat)>55?'taiga':moisture>.6?'woodland':Math.abs(lat)<22?'savanna':'grassland',trees:water?0:Math.floor(noise(seed+1,i,j)*4),grass:water?0:.7,pollution:0});
 }
 const heights=cells.map(c=>c.height),base=elevation?Math.min(...heights):0;
 return {version:1,anchor:{lat,lon},seed,grid:N,span:SPAN,step:STEP,cells,baseElevation:base,dem:elevation?{...elevation,values:undefined}:null,provenance:elevation?'Elevation sampled from Mapzen Terrain Tiles. Water, biomes and deposits are generated estimates.':'Geographic anchor on Earth; local elevation, water, biomes and deposits are generated estimates.',coastlineSource:'Natural Earth public-domain land polygons; not modern political borders.',hydrology:'Generated stream, not a surveyed watercourse',roads:[]};
}
function cell(t,x,z){if(!t)return null;const i=clamp(Math.round((x+t.span/2)/t.step),0,t.grid-1),j=clamp(Math.round((z+t.span/2)/t.step),0,t.grid-1);return t.cells[j*t.grid+i];}
function height(t,x,z){if(!t)return 0;const u=clamp((x+t.span/2)/t.step,0,t.grid-1),v=clamp((z+t.span/2)/t.step,0,t.grid-1),i=Math.floor(u),j=Math.floor(v),dx=u-i,dz=v-j;const get=(i,j)=>t.cells[Math.min(t.grid-1,j)*t.grid+Math.min(t.grid-1,i)].height;return (get(i,j)*(1-dx)+get(i+1,j)*dx)*(1-dz)+(get(i,j+1)*(1-dx)+get(i+1,j+1)*dx)*dz;}
function visualHeight(t,x,z){const h=height(t,x,z);return t?.dem?(h-t.baseElevation)/Math.max(1,t.dem.metresPerUnit||30):h;}
function inRoom(room,x,z){return room.built&&x>room.x-room.width/2&&x<room.x+room.width/2&&z>room.z-room.depth/2&&z<room.z+room.depth/2;}
function wallBlocked(w,x,z){for(const r of w.rooms||[]){if(!r.built)continue;const dx=Math.abs(x-r.x),dz=Math.abs(z-r.z),halfW=r.width/2,halfD=r.depth/2;
  if(dx<=halfW+.30&&dz<=halfD+.30){const onX=Math.abs(dx-halfW)<.45,onZ=Math.abs(dz-halfD)<.45;const door=r.door||'south';const gap=(door==='south'&&z>=r.z&&Math.abs(x-r.x)<1)||(door==='north'&&z<=r.z&&Math.abs(x-r.x)<1)||(door==='east'&&x>=r.x&&Math.abs(z-r.z)<1)||(door==='west'&&x<=r.x&&Math.abs(z-r.z)<1);if((onX||onZ)&&!gap)return true;}
 }return false;}
function blocked(w,x,z){const max=(w.terrain?.span||48)/2-1;if(x<-max||x>max||z<-max||z>max)return true;if(wallBlocked(w,x,z))return true;
 if(w.obstacles.some(b=>Math.hypot(x-b.x,z-b.z)<b.r+.28))return true;
 const c=cell(w.terrain,x,z);if(c?.biome==='water'&&!(w.terrain.roads||[]).some(p=>Math.hypot(p.x-x,p.z-z)<2))return true;
 return false;
}
class Heap{constructor(){this.a=[];}push(v){const a=this.a;a.push(v);let i=a.length-1;while(i){let p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}pop(){const a=this.a,res=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=v.f)break;a[i]=a[j];i=j;}a[i]=v;}return res;}get length(){return this.a.length;}}
function route(w,a,p){if(!p||Math.hypot(a.x-p.x,a.z-p.z)<.15)return [];let dest={x:Math.round(p.x),z:Math.round(p.z)};
 if(blocked(w,dest.x,dest.z)){const points=[];for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){const q={x:dest.x+dx,z:dest.z+dz};if(!blocked(w,q.x,q.z))points.push(q);}points.sort((u,v)=>Math.hypot(u.x-p.x,u.z-p.z)-Math.hypot(v.x-p.x,v.z-p.z));if(!points.length)throw Error('Destination has no walkable interaction point.');dest=points[0];}
 const start={x:Math.round(a.x),z:Math.round(a.z)},key=(x,z)=>x+','+z,sk=key(start.x,start.z),gk=key(dest.x,dest.z),open=new Heap(),score=new Map([[sk,0]]),parent=new Map();open.push({...start,g:0,f:0});let found=false;
 for(let n=0;open.length&&n<20000;n++){const c=open.pop(),ck=key(c.x,c.z);if(ck===gk){found=true;break;}if(c.g>score.get(ck))continue;for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=c.x+dx,z=c.z+dz;if(blocked(w,x,z)||(dx&&dz&&(blocked(w,c.x+dx,c.z)||blocked(w,c.x,c.z+dz))))continue;const slope=Math.abs(visualHeight(w.terrain,x,z)-visualHeight(w.terrain,c.x,c.z)),g=c.g+Math.hypot(dx,dz)+Math.min(2,slope*.5),k=key(x,z);if(g>=(score.get(k)??Infinity))continue;score.set(k,g);parent.set(k,ck);open.push({x,z,g,f:g+Math.hypot(x-dest.x,z-dest.z)});}}
 if(!found)throw Error('Path blocked by terrain, walls or occupancy.');let k=gk,out=[];while(k!==sk){const [x,z]=k.split(',').map(Number);out.push({x,z});k=parent.get(k);if(!k)throw Error('Path reconstruction failed.');}out.reverse();if(!blocked(w,p.x,p.z))out.push({x:p.x,z:p.z});return out;
}
function climate(w){const t=w.terrain,lat=t?.anchor.lat||36,yearDays=w.settings.yearDays||365,day=w.simTime/1440,yearFraction=(day%yearDays)/yearDays,season=lat>=0?yearFraction:(yearFraction+.5)%1;const tempBase=27-Math.abs(lat)*.32;const temperature=tempBase+Math.sin(season*Math.PI*2)*11+Math.sin((w.minutes%1440)/1440*Math.PI*2-Math.PI/2)*5;
 const phase=noise(t?.seed||7,Math.floor(day),8),rain=phase>.73&&Math.sin((w.minutes%1440)*.006)>.05;
 return {season:['Spring','Summer','Autumn','Winter'][Math.floor(season*4)],temperature:+temperature.toFixed(1),rain,wind:+(2+noise(t?.seed||7,Math.floor(w.simTime/90),9)*6).toFixed(1),sun:Math.max(0,Math.sin(((w.minutes%1440)-360)/720*Math.PI)),source:'Declared deterministic climate model, not real-time observed weather'};
}
function validate(t){if(!t||t.grid!==N||!Array.isArray(t.cells)||t.cells.length!==N*N||t.span!==SPAN)throw Error('Invalid terrain grid.');for(const c of t.cells)if(!Number.isFinite(c.height)||!Number.isFinite(c.moisture)||c.moisture<0||c.moisture>1)throw Error('Invalid terrain cell.');return t;}
return {create,cell,height,visualHeight,wallBlocked,blocked,route,inRoom,climate,noise,hash,validate,N,SPAN};
});
