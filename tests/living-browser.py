"""UI tests only. Uses an explicitly labeled view adapter and network fixtures.
Never deployed in ORIGIN.html. Does not claim a WebGL or live-model validation.
Run: python tests/living-browser.py (requires Python Playwright + Chromium).
No running application server or real API key is used.
"""
import asyncio, json, re, os, shutil
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'validation'/'v5'; OUT.mkdir(parents=True,exist_ok=True)
html=(ROOT/'ORIGIN.html').read_text()
stub='''window.LivingView=class {
constructor(host,labels,onSelect){this.host=host;this.labels=labels;this.onSelect=onSelect;this.ready=false;this.selected='S01';this.cutaway=true;}
async init(w){this.ready=true;this.host.innerHTML='<canvas id="test-view"></canvas>';this.renderer={dispose(){}};this.sync(w);return this;}
sync(w){this.world=w;const c=this.host.querySelector('canvas');if(!c)return;c.width=innerWidth;c.height=innerHeight;const g=c.getContext('2d');g.fillStyle='#697660';g.fillRect(0,0,c.width,c.height);g.fillStyle='#384b39';g.fillRect(c.width*.3,180,c.width*.4,350);g.font='14px monospace';g.fillStyle='#f1e6cd';g.fillText('UI TEST ADAPTER - NOT A THREE.JS RENDER',c.width*.28,c.height*.5);for(const a of w.entities){g.beginPath();g.arc(c.width*.5+a.x*5,c.height*.6+a.z*5,6,0,7);g.fill();}}
select(id){this.selected=id;} mode(){}capture(){return this.host.querySelector('canvas').toDataURL();}
};'''
def replace(m):
    code=m.group(1)
    if 'class OriginView' in code: return '<script>/* 3D view omitted ONLY in this UI test adapter. */</script>'
    if 'class LivingView' in code: return '<script>'+stub+'</script>'
    return m.group(0)
html=re.sub(r'<script>(.*?)</script>',replace,html,flags=re.S)
results=[]
def record(name,passed,detail=''):
    results.append({'test':name,'passed':bool(passed),'detail':detail})
    assert passed, name+': '+detail
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser') or None,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  context=await browser.new_context(viewport={'width':1440,'height':1000})
  page=await context.new_page();errors=[];requests=[]
  page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR:',e,flush=True)))
  await page.route('**/ORIGIN.html',lambda r:r.fulfill(status=200,content_type='text/html',body=html))
  async def jev(route):
   req=route.request.post_data_json;requests.append(req)
   who=req['state'].get('subject',{}).get('subject','S01')
   choices={}
   for k,q in req['questions'].items():
    opts=q['criteria']; wanted={'action':{'S01':'run','S02':'sleep','S03':'play','S04':'wash','S05':'rest','S06':'gather_food','S07':'play','S08':'rest'}.get(who,'rest'),'intent':'balance','expression':'content','response':'accept','reaction':'pleased','inference':'supported','token':'ka','gesture':'point_food','meaning':'food','interpretation':'food'}.get(k,next(iter(opts)))
    pick=wanted if wanted in opts else next(iter(opts));choices[k]={'type':'choice','choice':pick,'probabilities':{x:int(x==pick) for x in opts},'confidence':1}
   await asyncio.sleep(.035)
   await route.fulfill(status=200,content_type='application/json',body=json.dumps({'model':'jev-test-fixture','answers':choices,'usage':{'input_tokens':10}}))
  fixture=r"""
window.fixtureReq=[];
window.fetch=async (url,init={})=>{
 if(url==='/api/bootstrap')return new Response(JSON.stringify({token:'TEST-BRIDGE-TOKEN',hasTypeSafeKey:false,cloudEnabled:false,agyEnabled:false}),{status:200});
 if(url==='/api/checkpoint')return new Response(JSON.stringify({saved:true}),{status:200});
 if(url!=='/api/jev')throw Error('Network forbidden in UI fixture: '+url);
 const req=JSON.parse(init.body);window.fixtureReq.push(req);const who=req.state.subject?.subject||'S01',answers={};
 for(const [k,q]of Object.entries(req.questions)){const desired={action:{S01:'run',S02:'sleep',S03:'play',S04:'wash',S05:'rest',S06:'gather_food',S07:'play',S08:'rest'}[who]||'rest',intent:'balance',expression:'content',response:'accept',reaction:'pleased',inference:'supported',token:'ka',gesture:'point_food',meaning:'food',interpretation:'food'}[k]||Object.keys(q.criteria)[0];const choice=desired in q.criteria?desired:Object.keys(q.criteria)[0];answers[k]={type:'choice',choice,confidence:1,probabilities:Object.fromEntries(Object.keys(q.criteria).map(x=>[x,+(x===choice)]))};}
 await new Promise(r=>setTimeout(r,35));return new Response(JSON.stringify({model:'jev-test-fixture',answers,usage:{input_tokens:10}}),{status:200});
};
"""
  await page.route('**/*',lambda route:route.abort())
  page.on('dialog',lambda d:d.accept())
  await page.set_content(html.replace('</head>','<script>'+fixture+'</script></head>'),wait_until='domcontentloaded');await page.wait_for_function('window.ORIGIN?.view?.ready===true',timeout=6000);await page.wait_for_timeout(200)
  record('world starts locked and sends no decision request',await page.evaluate('fixtureReq.length')==0)
  record('English document',await page.get_attribute('html','lang')=='en')
  await page.click('#help-btn');await page.click('#homestead-btn');await page.wait_for_function('ORIGIN.session.world.entities.length===8');await page.wait_for_timeout(200)
  record('homestead seeds two children and objects',await page.evaluate('ORIGIN.session.world.objects.length')>=10)
  record('seeded scenario does not send AI requests',await page.evaluate('fixtureReq.length')==0)
  await page.click('#connect-btn');await page.fill('#api-key','TEST-UI-FIXTURE-NOT-REAL');await page.fill('#jev-cap','200');await page.click('#connection-form button[type=submit]');await page.wait_for_function('Object.keys(ORIGIN.session.world.activities).length>=4');await page.wait_for_timeout(250)
  record('multiple lives are active concurrently',await page.evaluate('Object.keys(ORIGIN.session.world.activities).length')>=4)
  await page.evaluate('ORIGIN.session.pause("UI fixture pause")');await page.wait_for_function('!ORIGIN.session.busy');
  before=await page.evaluate('ORIGIN.session.world.simTime');await page.wait_for_timeout(350);record('pause freezes shared time',await page.evaluate('ORIGIN.session.world.simTime')==before)
  record('paused activities are retained',await page.evaluate('Object.keys(ORIGIN.session.world.activities).length')>0)
  for name in ['people','build','world','knowledge','chronicle','live']:
   await page.click('[data-page="'+name+'"]');await page.wait_for_timeout(150)
   record('navigation '+name,await page.is_visible('#overlay') if name!='live' else not await page.is_visible('#overlay'))
  await page.click('#suggest-btn');await page.fill('#suggest-text','Consider helping your household prepare a sleeping place.');await page.click('#suggest-form button');record('player request is only a suggestion',await page.evaluate('ORIGIN.session.world.entities[0].activeSuggestion') is not None)
  await page.click('#ledger-btn');await page.fill('#ledger-search','Choose next activity');await page.wait_for_timeout(120);record('ledger contains exact action requests',await page.locator('.ledger-row').count()>0);await page.locator('.ledger-row').first.click();record('ledger expands exact JSON', 'questions' in await page.inner_text('#ledger-detail'));await page.click('#ledger-modal [data-close]')
  await page.screenshot(path=str(OUT/'desktop-ui-adapter.png'))
  await page.set_viewport_size({'width':390,'height':844});await page.wait_for_timeout(200)
  await page.click('#mobile-person');record('mobile person inspector opens',await page.is_visible('#right'));await page.click('[data-tab=family]');record('family view is rendered','Partner' in await page.inner_text('#profile-content'));await page.screenshot(path=str(OUT/'mobile-ui-adapter.png'));await page.click('#close-profile')
  record('mobile viewport has no horizontal document overflow',await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'))
  await page.click('[data-page=build]');await page.wait_for_timeout(120);record('mobile build catalog renders',await page.locator('[data-blueprint]').count()==8);await page.screenshot(path=str(OUT/'mobile-build-ui-adapter.png'))
  await page.click('[data-page=live]');await page.set_viewport_size({'width':1440,'height':1000});await page.wait_for_timeout(100)
  await page.evaluate('ORIGIN.session.reset("first-minds"); ORIGIN.session.config.cap=ORIGIN.session.attempts; ORIGIN.session.start();');await page.wait_for_function('ORIGIN.session.state==="budget"');await page.wait_for_function('document.getElementById("status-title").textContent.toLowerCase().includes("budget")');record('request limit produces visible budget stop','budget' in (await page.inner_text('#status-title')).lower())
  await page.click('#budget-btn');await page.fill('#budget-jev','300');await page.fill('#budget-planner','20');await page.click('#budget-form button');record('budget approval does not automatically run',not await page.evaluate('ORIGIN.session.running'))
  record('UI adapter run has no uncaught browser exceptions',not errors,str(errors))
  (OUT/'browser-ui-tests.json').write_text(json.dumps({'renderer':'EXPLICIT UI TEST ADAPTER; not WebGL','models':'TEST FIXTURES ONLY','requests':await page.evaluate('fixtureReq.length'),'results':results,'errors':errors},indent=2))
  print(json.dumps({'passed':sum(r['passed'] for r in results),'checks':len(results),'errors':errors},indent=2))
  await browser.close()
asyncio.run(main())
