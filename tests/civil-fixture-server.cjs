/* TEST HARNESS ONLY. Responses here are deliberate fixtures, never production behavior. */
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createServer}=require('../server.cjs');
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'origin-ui-fixture-'));
const server=createServer({fixture:true,dataDir,env:{TYPESAFE_API_KEY:'TEST-UI-NOT-A-REAL-KEY'},fetchImpl:async(url,init)=>{
 if(init.method==='GET')return Response.json({models:[{id:'jev-latest'}],notice:'TEST FIXTURE'});
 const req=JSON.parse(init.body),id=req.state.subject?.subject||'S01',target={S01:['body','rest'],S02:['body','sleep'],S03:['play','run'],S04:['resources','collect_N_wood_0'],S05:['economy','contract_wood'],S06:['play','play'],S07:['play','play'],S08:['play','play']}[id]||['body','rest'];
 const pref={domain:target[0],action:target[1],intent:'recover',expression:'content',response:'decline',inference:'uncertain'};
 return Response.json({model:'jev-UI-TEST-FIXTURE',answers:Object.fromEntries(Object.entries(req.questions).map(([k,q])=>{const choice=pref[k] in q.criteria?pref[k]:Object.keys(q.criteria)[0];return [k,{type:'choice',choice,confidence:1,probabilities:Object.fromEntries(Object.keys(q.criteria).map(x=>[x,x===choice?1:0]))}];})),usage:{cost:0,input_tokens:1},notice:'TEST FIXTURE, not real Jev'});
}});
server.listen(Number(process.env.ORIGIN_TEST_PORT||4320),'127.0.0.1',()=>console.log('UI FIXTURE SERVER READY / TEST ONLY'));
async function stop(){await server.worldService.close();server.close(()=>{fs.rmSync(dataDir,{recursive:true,force:true});process.exit(0);});}process.on('SIGTERM',stop);process.on('SIGINT',stop);
