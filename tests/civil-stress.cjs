#!/usr/bin/env node
/* TEST ONLY. Artificial action selection exercises mechanics, not real Jev behavior. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const L=require('../source/civilization.js');
let seed=77;
const randomFixture=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const report={method:'Deterministic artificial action selector, not Jev. No network, no production policy. Testing state invariants and concurrent mechanics only.',seed,scenarios:[]};
for(const scenario of ['first-minds','homestead','modern']){
 const world=L.genesis(scenario),conflicts=[];world.settings.mortality=false;
 for(let cycle=0;cycle<200;cycle++){
  for(const person of world.entities){
   if(person.activity||!person.alive)continue;
   const options=L.options(world,person).filter(o=>!o.target&&!['hunt','program','train_model'].includes(o.kind));
   if(!options.length)continue;
   const option=options[Math.floor(randomFixture()*options.length)];
   try{L.begin(world,person.id,option,{expression:'neutral'},['TEST-STRESS-ONLY']);}
   catch(error){conflicts.push({option:option.id,message:error.message});}
  }
  for(let i=0;i<80;i++)L.advance(world,.25);
  L.validate(world);
  for(const node of world.nodes){assert(node.quantity>=0);assert(node.reserved>=0);}
  for(const person of world.entities)for(const value of Object.values(person.inventory))assert(Number.isFinite(value)&&value>=0);
 }
 const executionErrors=world.chronicle.filter(e=>e.kind==='execution_error');
 assert.equal(executionErrors.length,0,'Unexpected committed activity execution failure');
 report.scenarios.push({scenario,cycles:200,simulatedMinutes:world.simTime,completedActivities:world.tick,expectedStartConflicts:conflicts.length,conflictExamples:conflicts.slice(0,3),executionErrors:executionErrors.length});
}
report.completedActivities=report.scenarios.reduce((sum,s)=>sum+s.completedActivities,0);
const out=path.join(__dirname,'..','validation','v6.1','mechanical-stress.json');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
