/* Authored gameplay catalog. These are coarse engineering rules, not validated chemistry. */
(function(root,factory){const M=factory();if(typeof module==='object'&&module.exports)module.exports=M;else root.OriginCatalog=M;})(globalThis,function(){
'use strict';
const ITEMS={food:{label:'Fruit',mass:.25},meal:{label:'Prepared meal',mass:.4},grain:{label:'Grain',mass:.5},beans:{label:'Legumes',mass:.4},wood:{label:'Wood',mass:1.5},stone:{label:'Stone',mass:2},fibre:{label:'Plant fibre',mass:.2},water:{label:'Water',mass:1},clay:{label:'Clay',mass:1},ore:{label:'Iron-bearing ore',mass:2},copper:{label:'Copper-bearing ore',mass:1},silica:{label:'Silica sand',mass:1},coal:{label:'Coal',mass:1},seed:{label:'Seeds',mass:.02},meat:{label:'Meat',mass:.5},iron:{label:'Iron billet',mass:1},steel:{label:'Steel',mass:1},copper_wire:{label:'Copper wire',mass:.25},glass:{label:'Glass',mass:.7},plank:{label:'Timber plank',mass:1},brick:{label:'Fired brick',mass:1},cloth:{label:'Woven cloth',mass:.3},paper:{label:'Paper',mass:.05},book:{label:'Written volume',mass:.4},coin:{label:'Exchange token',mass:.005},compost:{label:'Compost',mass:.5},oil:{label:'Oil crop extract',mass:.4},bread:{label:'Bread',mass:.3},pot:{label:'Pottery vessel',mass:1},stone_tool:{label:'Stone tool',mass:.7},metal_tool:{label:'Metal tool',mass:.7},wheel:{label:'Wheel',mass:2},shaft:{label:'Shaft',mass:2},generator:{label:'Generator',mass:4},circuit:{label:'Switching circuit',mass:.15},computer:{label:'Computing assembly',mass:3},predictor:{label:'Fitted predictor',mass:.1},battery:{label:'Storage cell',mass:1.5},silicon:{label:'Refined silicon',mass:.2},fertilizer:{label:'Fertilizer',mass:.5}};
const FURNITURE={
 chair:{label:'Timber chair',skill:'stone',cost:{wood:3},slots:1,category:'Comfort',size:[.8,.8],use:'sit',need:{comfort:22,energy:8}},
 double_bed:{label:'Double bed',skill:'shelter',cost:{plank:5,cloth:4},slots:2,category:'Sleep',size:[2,2.3],use:'sleep',need:{comfort:55,energy:70}},
 cradle:{label:'Cradle',skill:'stone',cost:{wood:3,fibre:3},slots:1,category:'Family',size:[1,1.2],use:'infant_rest',need:{comfort:40,energy:50}},
 sofa:{label:'Woven sofa',skill:'weaving',cost:{wood:5,cloth:5},slots:2,category:'Comfort',size:[2.1,1],use:'sit',need:{comfort:40,energy:12}},
 shelf:{label:'Bookshelf',skill:'carpentry',cost:{plank:4},slots:1,category:'Knowledge',size:[1.6,.5],use:'read',need:{fun:15}},
 washbasin:{label:'Water basin',skill:'pottery',cost:{clay:4,wood:2},slots:1,category:'Hygiene',size:[1,1],use:'wash',need:{hygiene:45,comfort:10},water:1},
 latrine:{label:'Private latrine',skill:'shelter',cost:{wood:4,stone:2},slots:1,category:'Hygiene',size:[1.2,1.3],use:'relieve',need:{bladder:90,comfort:12}},
 shower:{label:'Plumbed shower',skill:'plumbing',cost:{iron:3,copper_wire:2,glass:2},slots:1,category:'Hygiene',size:[1.3,1.3],use:'wash',need:{hygiene:85,comfort:30},water:2},
 stove:{label:'Cooking stove',skill:'iron',cost:{iron:5,brick:4},slots:1,category:'Food',size:[1.2,1],use:'cook_batch',need:{},heat:1},
 refrigerator:{label:'Cold storage',skill:'refrigeration',cost:{steel:4,circuit:1,glass:2},slots:1,category:'Food',size:[1,1],use:'store',power:1,need:{}},
 dining_table:{label:'Dining table',skill:'carpentry',cost:{plank:5},slots:4,category:'Food',size:[2.2,1.4],use:'dine',need:{comfort:20,social:6}},
 loom:{label:'Weaving loom',skill:'weaving',cost:{wood:7,fibre:4},slots:1,category:'Production',size:[1.8,1.3],use:'weave',need:{},workstation:'weaving'},
 potter_wheel:{label:'Potter wheel',skill:'wheel',cost:{wood:4,stone:3},slots:1,category:'Production',size:[1.2,1.2],use:'craft',need:{},workstation:'pottery'},
 mill:{label:'Grain mill',skill:'wheel',cost:{stone:8,wood:6,wheel:1},slots:1,category:'Production',size:[2,2],use:'mill',need:{},workstation:'baking'},
 pump:{label:'Water pump',skill:'waterpower',cost:{iron:3,wood:4,wheel:1},slots:1,category:'Utilities',size:[1.4,1.4],use:'pump',need:{}},
 cistern:{label:'Water cistern',skill:'pottery',cost:{clay:6,stone:4},slots:1,category:'Utilities',size:[1.8,1.8],use:'fill',need:{}},
 waterwheel:{label:'Waterwheel generator',skill:'electricity',cost:{wood:8,iron:3,generator:1},slots:1,category:'Utilities',size:[2,2],use:'maintain',need:{},supply:'hydro'},
 solar_panel:{label:'Solar array',skill:'photovoltaics',cost:{silicon:4,glass:3,copper_wire:3},slots:1,category:'Utilities',size:[2.4,2],use:'maintain',need:{},supply:'solar'},
 battery_bank:{label:'Battery bank',skill:'storage_power',cost:{battery:4,steel:2},slots:1,category:'Utilities',size:[1.8,1.2],use:'maintain',need:{}},
 lamp:{label:'Electric lamp',skill:'electricity',cost:{copper_wire:1,glass:1},slots:1,category:'Comfort',size:[.5,.5],use:'sit',need:{comfort:12},power:.2},
 desk:{label:'Writing desk',skill:'carpentry',cost:{plank:4},slots:1,category:'Knowledge',size:[1.8,1],use:'write',need:{fun:10}},
 school_board:{label:'Teaching board',skill:'writing',cost:{wood:5,clay:2},slots:1,category:'Knowledge',size:[1.8,.7],use:'study',need:{fun:15}},
 laboratory:{label:'Experiment bench',skill:'measurement',cost:{glass:4,iron:3,plank:4},slots:1,category:'Knowledge',size:[2,1.2],use:'research',need:{},workstation:'research'},
 computer_desk:{label:'Computing desk',skill:'computing',cost:{computer:1,plank:3,copper_wire:2},slots:1,category:'Knowledge',size:[1.8,1.1],use:'compute',need:{fun:15},power:1},
 server_rack:{label:'Model training rack',skill:'ai',cost:{computer:2,circuit:4,steel:3},slots:1,category:'Knowledge',size:[1.2,1.2],use:'train',need:{},power:3},
 easel:{label:'Painting easel',skill:'stone',cost:{wood:3,fibre:1},slots:1,category:'Art and play',size:[1,1],use:'paint',need:{fun:38}},
 drum:{label:'Hand drum',skill:'weaving',cost:{wood:2,cloth:1},slots:1,category:'Art and play',size:[.8,.8],use:'music',need:{fun:40,social:5}},
 board_game:{label:'Carved board game',skill:'stone',cost:{wood:2,stone:1},slots:2,category:'Art and play',size:[.9,.9],use:'play',need:{fun:42}},
 toy_box:{label:'Toy basket',skill:null,cost:{fibre:3,wood:1},slots:2,category:'Family',size:[1,1],use:'play',need:{fun:35}},
 bench:{label:'Garden bench',skill:'stone',cost:{wood:4,stone:2},slots:2,category:'Comfort',size:[2,.8],use:'sit',need:{comfort:30}},
 market_stall:{label:'Market stall',skill:'shelter',cost:{wood:6,fibre:4},slots:1,category:'Exchange',size:[2,1.5],use:'trade',need:{},workstation:'market'},
 compost_bin:{label:'Compost bin',skill:'farming',cost:{wood:3},slots:1,category:'Food',size:[1.4,1.4],use:'compost',need:{}},
 memorial:{label:'Memory marker',skill:'stone',cost:{stone:3},slots:1,category:'Family',size:[.8,.8],use:'remember',need:{comfort:15}},
 nursery_mat:{label:'Family play mat',skill:'weaving',cost:{cloth:3},slots:3,category:'Family',size:[2,2],use:'play',need:{fun:30,comfort:20}}
};
function recipe(name,requires,material,out,act,site='camp',minutes=40,tier=3){return {name,requires,material,out,act,site,minutes,tier,practice:3,cue:'The modeled '+name.toLowerCase()+' process passed its repeatable output test.',idea:'The recorded process can transform these materials.'};}
const RECIPES={
 carpentry:recipe('Timber joinery',['stone'],{wood:3},{plank:2},'Try cutting and joining timber','camp',35,2),
 weaving:recipe('Woven cloth',['stone'],{fibre:4},{cloth:2},'Test interlaced fibres under tension','camp',35,2),
 masonry:recipe('Fired masonry',['pottery'],{clay:3,wood:1},{brick:3},'Compare fired clay blocks','bank',45,3),
 glassmaking:recipe('Glass forming',['iron'],{silica:3,coal:2},{glass:2},'Test a high-heat silica mixture','forge',70,5),
 refining_copper:recipe('Copper conductors',['metallurgy'],{copper:3,coal:1},{copper_wire:2},'Test refined copper and drawn wire','forge',50,4),
 paper:recipe('Paper sheets',['weaving'],{fibre:3,wood:1},{paper:4},'Press a fibre pulp into a sheet','pool',40,3),
 printing:recipe('Reproducible print',['writing','paper'],{paper:3,wood:2},{book:1},'Compare repeated impressions on paper','camp',45,4),
 exchange:recipe('Exchange tokens',['writing','metallurgy'],{copper:1,clay:1},{coin:12},'Make counted tokens and compare transactions','camp',30,4),
 measurement:recipe('Repeatable measurement',['writing','pottery'],{clay:2,wood:2},{},'Compare a marked measure over repeated trials','camp',35,3),
 baking:recipe('Grain preparation',['cooking','farming'],{grain:2,wood:1},{bread:3},'Test ground grain and controlled heat','hearth',30,3),
 sanitation:recipe('Protected water',['pottery','fire'],{clay:2,wood:1},{pot:1},'Compare covered and exposed stored water','pool',30,3),
 plumbing:recipe('Water distribution',['iron','sanitation'],{iron:3,clay:2},{},'Test a sealed water conduit','pool',50,5),
 refrigeration:recipe('Cold storage',['electricity','glassmaking'],{steel:2,copper_wire:2,circuit:1},{},'Test a powered insulated storage loop','forge',70,7),
 storage_power:recipe('Electrical storage',['electricity'],{copper_wire:2,clay:2,iron:1},{battery:1},'Compare charge and discharge measurements','forge',65,6),
 silicon_processing:recipe('Purified silicon',['steel','measurement'],{silica:4,coal:2},{silicon:1},'Test a modeled high-purity processing chain','forge',85,7),
 photovoltaics:recipe('Photovoltaics',['circuits','silicon_processing','glassmaking'],{silicon:2,glass:2,copper_wire:1},{},'Compare electrical output under changing light','forge',75,8),
 data_science:recipe('Experimental data analysis',['computing','measurement'],{paper:3},{},'Validate an arithmetic program against observations','camp',55,9)
};
const GOALS={builder:{label:'Build a home',kinds:['build','room_build'],target:4},caregiver:{label:'Support a family',kinds:['care','feed','tutor'],target:8},explorer:{label:'Know the surroundings',kinds:['explore','survey'],target:8},maker:{label:'Become a practiced maker',kinds:['manufacture','experiment','craft_item'],target:8},companion:{label:'Create lasting bonds',kinds:['chat','comfort','play_together','court','celebrate'],target:8},scholar:{label:'Develop and share knowledge',kinds:['teach','study','experiment','record_knowledge'],target:8},artist:{label:'Express something personal',kinds:['paint','music','dance','tell_story'],target:8}};
const CATEGORIES={body:'Food, water, sleep, comfort and hygiene',resources:'Explore, gather, farm and care for the landscape',home:'Build, repair, clean and organize a home',social:'Meet, cooperate, express affection or resolve a disagreement',family:'Care, learn, teach and support a household',craft:'Experiment, manufacture, record or study',play:'Play, create music, express yourself or remember',economy:'Barter, take a contract or exchange goods'};
return {ITEMS,FURNITURE,RECIPES,GOALS,CATEGORIES};
});
