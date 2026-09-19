#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),root=__dirname,source=path.join(root,'source');
let html=fs.readFileSync(path.join(source,'living-shell.html'),'utf8');
for(const part of ['providers','core','agency','life','civil/terrain','civil/catalog','civilization','earth-data','living-session','remote-session','renderer','living-view','civic-three','civic-view','civic-panels','living-ui']){const marker='<!-- '+part.toUpperCase().replaceAll('/','-')+' -->';if(!html.includes(marker))throw Error('Missing '+marker);const code=fs.readFileSync(path.join(source,part+'.js'),'utf8').replace(/<\/script/gi,'<\\/script');html=html.replace(marker,()=>'<script>\n'+code+'\n</script>');}
const library=path.join(root,'assets','three.min.js');if(fs.existsSync(library)&&fs.statSync(library).size>100000)html=html.replace('</head>',()=>'<script>\n'+fs.readFileSync(library,'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>\n</head>');
fs.writeFileSync(path.join(root,'ORIGIN.html'),html);console.log('Built ORIGIN Civilization '+Buffer.byteLength(html)+' bytes; '+(fs.existsSync(library)?'local Three.js included':'production isometric view bundled; optional Three.js via CDN or install-assets.cjs')+'.');
