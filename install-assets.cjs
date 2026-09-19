#!/usr/bin/env node
'use strict';
// Optional: cache and embed the one external rendering library. No model calls or credentials.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const mirrors=['https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js','https://unpkg.com/three@0.160.1/build/three.min.js','https://raw.githubusercontent.com/mrdoob/three.js/r160/build/three.min.js'];
(async()=>{
 await fs.mkdir(path.join(__dirname,'assets'),{recursive:true});let last;
 for(const url of mirrors){try{
  console.log('Fetching pinned Three.js from '+new URL(url).hostname+' ...');
  const res=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error('HTTP '+res.status);const text=await res.text();
  if(text.length<100000||!text.includes('REVISION')||!text.includes('WebGLRenderer'))throw Error('Unexpected library response.');
  await fs.writeFile(path.join(__dirname,'assets','three.min.js'),text);await fs.writeFile(path.join(__dirname,'assets','source.json'),JSON.stringify({url,downloadedAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(text).digest('hex')},null,2));
  require('./build.cjs');console.log('Three.js cached and embedded. ORIGIN.html no longer needs a CDN; model decisions still require the network.');return;
 }catch(e){last=e;console.warn('Mirror failed: '+e.message);}}
 throw Error('All mirrors failed: '+last?.message+'. Check your network/proxy. The bundled isometric renderer remains fully usable; optional Three.js mode is unavailable until the library can be loaded.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
