"""DOM-only native TypeSafe integration checks. No WebGL or live provider claim."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
results=[]
def check(name,passed):
    results.append({'name':name,'passed':bool(passed)})
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)
    if not passed: raise AssertionError(name)
renderer=(ROOT/'source/renderer.js').read_text().replace('</script','<\\/script')
view='''window.OriginView=class{constructor(host){this.host=host;this.ready=false}async init(){this.ready=true;this.host.innerHTML='<div style="position:absolute;left:36%;top:43%;font:14px monospace;color:#253e31">UI TEST VIEW<br>No WebGL rendering claimed.</div>';return this}sync(){}mode(){}select(){}async animate(){}capture(){return 'data:image/png;base64,'}};'''
fixture=r'''
window.__calls=[];window.__decisionError=0;window.__checkpoint=null;
window.fetch=async(url,init={})=>{
 window.__calls.push({url,method:init.method||'GET',headers:init.headers||{},body:init.body?JSON.parse(init.body):null});
 let data,status=200;
 if(url==='/api/bootstrap')data={token:'TEST_BRIDGE_TOKEN',hasTypeSafeKey:window.__nativeKey,hasOpenRouterKey:window.__legacyKey,hasJevKey:window.__nativeKey||window.__legacyKey,defaultProvider:'typesafe',defaultModel:'jev-latest',checkpoint:false,agyEnabled:false};
 else if(url==='/api/jev-models'||url==='https://api.typesafe.ai/v1/models')data={models:[{name:'jev-latest'},{name:'jev-preview'}]};
 else if(url==='/api/checkpoint'){if(init.method==='POST'){window.__checkpoint=JSON.parse(init.body).snapshot;data={saved:true};}else data=window.__checkpoint;}
 else if(url==='/api/jev'||url==='https://api.typesafe.ai/v1/systemone'){
  const r=JSON.parse(init.body);
  if(window.__decisionError){status=window.__decisionError;data={detail:'TEST invalid TypeSafe credential'};}
  else{data={model:'jev-1.13.0',answers:{},usage:{input_tokens:12,output_tokens:2}};for(const [k,q]of Object.entries(r.questions)){let c={intent:'manipulate',action:'gather_stone',inference:'supported'}[k]||Object.keys(q.criteria)[0];if(!(c in q.criteria))c=Object.keys(q.criteria)[0];data.answers[k]={type:'choice',choice:c,confidence:.95,probabilities:Object.fromEntries(Object.keys(q.criteria).map(v=>[v,v===c?1:0]))};}}
 }else throw Error('No external network is allowed in this test. Unexpected '+url);
 return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
};
'''
raw=(ROOT/'ORIGIN.html').read_text().replace(renderer,view).replace("if(location.protocol==='http:'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost'))try",'if(true)try')
def make_page(browser,native=False,legacy=False,mobile=False):
    ctx=browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':1440,'height':1000})
    ctx.route('**/*',lambda route:route.abort())
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    init='window.__nativeKey='+json.dumps(native)+';window.__legacyKey='+json.dumps(legacy)+';'
    page.set_content(raw.replace('</head>','<script>'+init+fixture+'</script></head>'),wait_until='domcontentloaded')
    page.wait_for_function("ORIGIN.getStatus().ready && document.getElementById('transport').value==='bridge'")
    return ctx,page,errors
try:
 with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROME_BIN','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    ctx,page,errors=make_page(browser)
    check('Native boot issues no model or account-check request',page.evaluate("__calls.every(c=>c.url==='/api/bootstrap')"))
    page.click('#connect-button')
    check('Native TypeSafe is selected by default',page.input_value('#provider')=='typesafe')
    check('Native jev-latest is displayed, not an OpenRouter model ID',page.input_value('#model')=='jev-latest')
    check('No other API is selected by default',page.input_value('#planner')=='none')
    check('Native key is required without a matching server key',page.locator('#api-key').evaluate('(el)=>el.required'))
    page.fill('#api-key','TEST_NATIVE_BROWSER_KEY')
    page.click('#test-connection');page.wait_for_function("document.getElementById('connection-test-result').textContent.includes('access confirmed')")
    check('Explicit access check calls protected model-list bridge',page.evaluate("__calls.filter(c=>c.url==='/api/jev-models').length===1"))
    check('Access check does not start decisions or change the world',page.evaluate('ORIGIN.getStatus().attempts===0 && ORIGIN.getSnapshot().tick===0 && !ORIGIN.getStatus().connected'))
    check('Access check has its own visible ledger record',page.evaluate("ORIGIN.getLogs().some(r=>r.type==='connection_check'&&r.status==='valid')"))
    check('Checked key is absent from exported audit data',page.evaluate("!JSON.stringify(ORIGIN.getLogs()).includes('TEST_NATIVE_BROWSER_KEY')"))
    page.screenshot(path=str(ROOT/'validation/native-desktop-access-check.png'))
    page.select_option('#provider','openrouter')
    check('Provider switch clears entered credentials',page.input_value('#api-key')=='')
    check('Legacy provider gets its own model menu',page.input_value('#model')=='~typesafe/jev-latest')
    check('Native account-check button is not offered to legacy provider',not page.locator('#test-connection').is_visible())
    page.select_option('#provider','typesafe')
    page.select_option('#model','jev-1.13.0')
    page.fill('#api-key','TEST_NATIVE_BROWSER_KEY');page.click('#connect-submit');page.wait_for_function('ORIGIN.getSnapshot().tick===1')
    check('Native connection executes one gated intention/action turn',page.evaluate('ORIGIN.getStatus().attempts===2'))
    check('Pinned native model is sent unchanged',page.evaluate("__calls.filter(c=>c.url==='/api/jev').every(c=>c.body.model==='jev-1.13.0'&&c.headers['X-Jev-Provider']==='typesafe')"))
    check('Native decision records contain the actual upstream endpoint',page.evaluate("ORIGIN.getLogs().filter(r=>r.type==='request').every(r=>r.upstreamEndpoint==='https://api.typesafe.ai/v1/systemone')"))
    check('No OpenRouter request was made by the native scenario',page.evaluate("__calls.every(c=>!c.url.includes('openrouter.ai'))"))
    page.wait_for_timeout(700)
    check('Native checkpoint excludes the pasted credential',page.evaluate("__checkpoint && !JSON.stringify(__checkpoint).includes('TEST_NATIVE_BROWSER_KEY')"))
    check('Native desktop scenario has no uncaught errors',not errors)
    ctx.close()
    ctx,page,errors=make_page(browser,native=True,mobile=True)
    page.click('#connect-button')
    check('Server-held TypeSafe key makes browser key input optional',not page.locator('#api-key').evaluate('(el)=>el.required'))
    check('Matching server credential is described by name','TYPESAFE_API_KEY' in page.inner_text('#key-help'))
    check('Native connection form has no horizontal mobile overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.screenshot(path=str(ROOT/'validation/native-mobile-connection.png'))
    page.click('#test-connection');page.wait_for_function("document.getElementById('connection-test-result').textContent.includes('access confirmed')")
    check('Server-held account test sends no Authorization credential from browser',page.evaluate("__calls.filter(c=>c.url==='/api/jev-models').every(c=>!c.headers.Authorization)"))
    page.click('#connect-submit');page.wait_for_function('ORIGIN.getSnapshot().tick===1')
    check('Native server-held key runs without any OpenRouter configuration',page.evaluate("ORIGIN.getStatus().provider==='typesafe' && __calls.filter(c=>c.url==='/api/jev').every(c=>!c.headers.Authorization)"))
    check('Native mobile scenario has no uncaught JavaScript errors',not errors)
    ctx.close()
    ctx,page,errors=make_page(browser,legacy=True)
    page.click('#connect-button')
    check('OpenRouter server key does not remove TypeSafe input requirement',page.locator('#api-key').evaluate('(el)=>el.required'))
    page.fill('#api-key','TEST_BAD_KEY_FOR_ERROR_TEST');page.evaluate('window.__decisionError=401');page.click('#connect-submit')
    page.wait_for_function("document.getElementById('connection-error').textContent.includes('TypeSafe HTTP 401')")
    check('Failed native decision keeps the error visible in connection settings',page.locator('#connect-modal').is_visible())
    check('Native authentication error leaves the world unmodified',page.evaluate('ORIGIN.getSnapshot().tick===0 && ORIGIN.getStatus().attempts===1'))
    check('Native failure does not call an alternate provider',page.evaluate("__calls.filter(c=>c.url==='/api/jev').length===1 && __calls.every(c=>!c.url.includes('openrouter.ai'))"))
    check('Error scenario has no uncaught JavaScript errors',not errors)
    ctx.close();browser.close()
finally:
    (ROOT/'validation/native-browser-results.json').write_text(json.dumps({'method':'DOM-only with explicit renderer and fetch fixtures; no live TypeSafe call and no WebGL validation.','results':results,'passed':sum(r['passed'] for r in results),'total':len(results)},indent=2))
