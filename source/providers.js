/* Fixed provider contracts. No credentials, fallback providers, or behavioural policy. */
(function(root,factory){const P=factory();if(typeof module==='object'&&module.exports)module.exports=P;else root.OriginProviders=P;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const definitions=Object.freeze({
 typesafe:Object.freeze({id:'typesafe',label:'TypeSafe',endpoint:'https://api.typesafe.ai/v1/systemone',modelsEndpoint:'https://api.typesafe.ai/v1/models',envKey:'TYPESAFE_API_KEY',models:Object.freeze([{id:'jev-latest',label:'jev-latest / stable alias'},{id:'jev-1.13.0',label:'jev-1.13.0 / pinned version'},{id:'jev-preview',label:'jev-preview / preview alias'}])}),
 openrouter:Object.freeze({id:'openrouter',label:'OpenRouter',endpoint:'https://openrouter.ai/api/alpha/decisions',modelsEndpoint:null,envKey:'OPENROUTER_API_KEY',models:Object.freeze([{id:'~typesafe/jev-latest',label:'Jev Latest / OpenRouter alias'},{id:'typesafe/jev-1.13',label:'Jev 1.13 / OpenRouter pinned'}])})
});
function get(id){if(!Object.prototype.hasOwnProperty.call(definitions,id))throw Error('Unknown decision provider.');return definitions[id];}
function validateModel(provider,model){const p=get(provider);if(!p.models.some(m=>m.id===model))throw Error('Invalid '+p.label+' model ID. Select a '+p.label+' model in Jev settings.');return model;}
function keyFor(provider,key){const p=get(provider),value=String(key||'').trim();if(!value)return '';if(value.length>4096||/[\r\n\x00-\x1f\x7f]/.test(value))throw Error('Invalid API key format.');if(provider==='typesafe'&&value.startsWith('sk-or-v1-'))throw Error('This looks like an OpenRouter key. TypeSafe native requires your TypeSafe key, not an OpenRouter key.');return value;}
function describeError(provider,status,body,retryAfter){
 const p=get(provider);let detail=typeof body?.error==='string'?body.error:body?.error?.message||body?.message||body?.detail||'';
 if(Array.isArray(detail))detail=detail.map(d=>[Array.isArray(d.loc)?d.loc.join('.'):d.loc,d.msg].filter(Boolean).join(': ')).join('; ');
 if(detail&&typeof detail==='object')detail=JSON.stringify(detail);
 const hints={401:'Check the '+p.label+' key for this provider ('+p.envKey+').',403:'Check this key\'s permissions and account access.',422:'TypeSafe rejected the request schema. Inspect the exact response in the decision ledger.',429:'Provider rate limit. The world is unchanged; retry explicitly after the cooldown.',529:'TypeSafe is temporarily overloaded. The world is unchanged; retry explicitly after the cooldown.',404:'Check the selected '+p.label+' model and the fixed endpoint in the ledger.'};
 const hint=hints[status]||'No automatic retry or fallback provider. Check the decision ledger.';
 return p.label+' HTTP '+status+': '+(String(detail).slice(0,1800)||'Request not accepted.')+' '+hint+(retryAfter?' Retry-After: '+retryAfter+'.':'');
}
function retryAt(value,status,now=Date.now()){if(![429,529].includes(status))return 0;const seconds=Number(value);if(value&&Number.isFinite(seconds)&&seconds>=0)return now+seconds*1000;const date=Date.parse(value);return Number.isFinite(date)?Math.max(now,date):now+5000;}
return Object.freeze({definitions,get,validateModel,keyFor,describeError,retryAt});
});
