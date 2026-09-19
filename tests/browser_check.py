"""DOM-only tests with explicit renderer, transport and bootstrap fixtures.
No real browser networking, WebGL rendering, provider calls or AGY execution is claimed.
These fixtures are not imported by any application file.
"""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
results=[]
def check(name,ok):
    results.append({'name':name,'passed':bool(ok)})
    print(('PASS ' if ok else 'FAIL ')+name,flush=True)
    if not ok: raise AssertionError(name)
raw=(ROOT/'ORIGIN.html').read_text()
renderer=(ROOT/'source/renderer.js').read_text().replace('</script','<\\/script')
view_stub="""window.OriginView=class{constructor(host){this.host=host;this.ready=false}async init(){this.ready=true;this.host.innerHTML='<div style="position:absolute;left:34%;top:42%;color:#263;max-width:32%;font:14px monospace">UI TEST VIEW<br>No 3D rendering claimed.<br>Model responses are test fixtures.</div>';return this}sync(){}mode(){}select(){}async animate(){}capture(){return 'data:image/png;base64,'}};"""
fixtures=r'''
window.__checkpoint=null;
window.fetch=async function(url,init={}){
 let data;
 if(url==='/api/bootstrap')data={token:'TEST_LOCAL_TOKEN',hasJevKey:false,agyEnabled:true,checkpoint:!!window.__checkpoint};
 else if(url==='/api/checkpoint'){
  if(init.method==='POST'){window.__checkpoint=JSON.parse(init.body).snapshot;data={saved:true};}
  else data=window.__checkpoint;
 }else if(url==='/api/plan'){
  const r=JSON.parse(init.body);data={proposal:{objective:'Investigate a loose object',hypothesis:'A fruit can be grasped',actions:['gather_food'],expectedObservation:'Fruit in these hands',evidence:[]},audit:{mode:r.mode,model:'TEST_FIXTURE'}};
 }else if(url==='/api/jev'){
  const r=JSON.parse(init.body);data={model:'typesafe/jev-test-fixture',answers:{},usage:{input_tokens:12,output_tokens:1}};
  for(const [k,q]of Object.entries(r.questions)){let c={intent:'nourish',action:'gather_food',inference:'supported'}[k]||Object.keys(q.criteria)[0];if(!(c in q.criteria))c=Object.keys(q.criteria)[0];data.answers[k]={type:'choice',choice:c,confidence:.9,probabilities:Object.fromEntries(Object.keys(q.criteria).map(x=>[x,x===c?1:0]))};}
 }else throw Error('External networking is disabled in this test.');
 return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
};
'''
html=raw.replace(renderer,view_stub).replace("if(location.protocol==='http:'&&(location.hostname==='127.0.0.1'||location.hostname==='localhost'))try",'if(true)try')
html=html.replace('</head>','<script>'+fixtures+'</script></head>')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROME_BIN','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  context=browser.new_context(viewport={'width':1440,'height':1000})
  context.route('**/*',lambda route:route.abort())
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='domcontentloaded');page.wait_for_function('ORIGIN.getStatus().ready');page.wait_for_function("document.getElementById('transport').value==='bridge'")
  check('UI boots without uncaught JavaScript errors',not errors)
  check('Ready idle UI has a frozen world and makes no decision calls',page.evaluate('ORIGIN.getSnapshot().tick')==0 and page.evaluate('ORIGIN.getStatus().attempts')==0)
  page.click('#connect-button');page.fill('#api-key','TEST_ONLY_NOT_REAL_KEY');page.click('#connect-submit');page.wait_for_function('ORIGIN.getSnapshot().tick===1',timeout=10000);page.wait_for_timeout(700)
  check('Connect runs a Jev-gated intention and action through fixture transport',page.evaluate('ORIGIN.getStatus().attempts')==2)
  check('Inventory and finite shared resources change consistently',page.evaluate('ORIGIN.getSnapshot().entities[0].inventory.food')==3 and page.evaluate('ORIGIN.getSnapshot().resources.food')==87)
  check('Persistent intention is visible in person inspector','NOURISH' in page.inner_text('#intent-summary'))
  page.click('[data-profile=intent]');check('Intent details tab is functional','JEV SELECTED' in page.inner_text('#profile-body'))
  page.click('[data-modal=ledger-modal]');check('Full ledger has inspectable receipts',page.locator('#ledger-list [data-receipt]').count()>0)
  page.locator('#ledger-modal [data-close]').click()
  page.click('#connect-button');page.select_option('#planner','agy');check('AGY configuration controls are exposed',page.locator('#planner-settings').is_visible())
  page.fill('#api-key','TEST_ONLY_NOT_REAL_KEY');page.click('#connect-submit');page.wait_for_function('ORIGIN.getSnapshot().tick===2',timeout=10000);page.wait_for_timeout(700)
  check('Hybrid planner calls have a separate committed ledger entry',page.evaluate("ORIGIN.getLogs().some(r=>r.type==='planner'&&r.committed)"))
  check('Hybrid proposal cannot bypass Jev decisions',page.evaluate("ORIGIN.getLogs().filter(r=>r.type==='request'&&r.committed).length")>=4)
  page.click('#help-button');page.click('#save-now');page.wait_for_function("document.getElementById('save-state').textContent.includes('Saved turn 2')")
  check('Checkpoint transport receives full world and log without the API key',page.evaluate("__checkpoint.world.tick===2 && !JSON.stringify(__checkpoint).includes('TEST_ONLY_NOT_REAL_KEY')"))
  page.locator('#help-modal [data-close]').click();page.screenshot(path=str(ROOT/'validation/desktop-ui-test.png'))
  page.click('#help-button');page.click('#restore-button');page.wait_for_timeout(150)
  check('Restore does not automatically run more turns',page.evaluate('ORIGIN.getSnapshot().tick')==2)
  page.set_viewport_size({'width':390,'height':844});page.click('#people-button');page.wait_for_timeout(150)
  check('Mobile page has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  check('Mobile inspector remains accessible',page.locator('#right').is_visible())
  page.screenshot(path=str(ROOT/'validation/mobile-ui-test.png'))
  check('Complete DOM scenario has no uncaught JavaScript errors',not errors)
  page.click('#close-profile');page.set_viewport_size({'width':1440,'height':1000});page.click('#help-button')
  page.set_input_files('#import-file',str(ROOT/'recovery/turn-74.snapshot.json'))
  page.wait_for_function('ORIGIN.getSnapshot().tick===74')
  check('Supplied recovery preserves the 74 committed turns and 100 attempted calls',page.evaluate('ORIGIN.getStatus().attempts===100 && ORIGIN.getStatus().cap===100'))
  check('Recovery invents no learned abilities',page.evaluate('ORIGIN.getSnapshot().entities.every(a=>Object.keys(a.known).length===0)'))
  page.click('#step-button');page.wait_for_function("ORIGIN.getStatus().status==='limited'")
  page.locator('#run-notice').wait_for(state='visible')
  check('Request cap has a distinct visible limit panel',page.locator('#run-notice').is_visible() and 'limit' in page.inner_text('#run-notice-title'))
  check('Budget stop makes no extra attempted request',page.evaluate('ORIGIN.getStatus().attempts')==100)
  page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(ROOT/'validation/mobile-budget-stop.png'))
  page.set_viewport_size({'width':1440,'height':1000});page.screenshot(path=str(ROOT/'validation/desktop-budget-stop.png'))
  page.click('#run-notice-action');page.fill('#budget-jev','150');page.locator('#budget-form button[type=submit]').click()
  check('Budget approval preserves counters and does not resume activity',page.evaluate("ORIGIN.getStatus().cap===150 && ORIGIN.getStatus().attempts===100 && ORIGIN.getSnapshot().tick===74 && ORIGIN.getStatus().status==='paused'"))
  check('Budget updates are logged as explicit observer approvals',page.evaluate("ORIGIN.getLogs().some(r=>r.type==='limits_changed')"))
  check('New budget and recovery flow has no JavaScript errors',not errors)
  browser.close()
finally:
 (ROOT/'validation/browser-ui-results.json').write_text(json.dumps({'method':'DOM-only: renderer, bootstrap capability and fetch fixtures. These fixtures are absent from production. Browser networking was blocked by the environment. NOT a live-provider, real-AGY or WebGL validation.','results':results,'passed':sum(x['passed'] for x in results),'total':len(results)},indent=2))
 print(json.dumps(results,indent=2))
