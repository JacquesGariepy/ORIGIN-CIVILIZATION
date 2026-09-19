#!/usr/bin/env node
/* Read-only forensic summary. Does not load credentials or contact a provider. */
'use strict';
const fs=require('node:fs');
function count(rows,key){return rows.reduce((out,r)=>{const k=String(key(r));out[k]=(out[k]||0)+1;return out;},{});}
try {
 const input=process.argv[2];if(!input)throw Error('Usage: node tools/analyze-save.cjs path/to/save.json');
 const st=fs.statSync(input);if(st.size>128*1024*1024)throw Error('Input exceeds the 128 MB audit limit.');
 const data=JSON.parse(fs.readFileSync(input,'utf8'));if(!data.world||!Array.isArray(data.world.entities)||!Array.isArray(data.log))throw Error('Expected an ORIGIN save with world.entities and log.');
 const w=data.world,req=data.log.filter(r=>r.type==='request');
 const report={source:input,version:data.version,attempts:data.attempts,plannerAttempts:data.plannerAttempts,completedInitiated:w.tick,elapsedSimMinutes:w.simTime,requests:req.length,http:count(req,r=>r.httpStatus),statuses:count(req,r=>r.status),phases:count(req,r=>r.phase),worldEvents:count(w.chronicle||[],r=>r.kind),unfinishedActivities:Object.keys(w.activities||{}).length,people:w.entities.map(a=>({id:a.id,name:a.observerName,completedInitiated:a.completed,practice:a.practice,body:a.body,learned:Object.keys(a.known||{}),unfinished:a.resume?.option?.id||null})),notice:'Derived from an editable supplied file; not a provider attestation. No inference or source file mutation.'};
 console.log(JSON.stringify(report,null,2));
} catch(e){console.error(e.message);process.exitCode=1;}
