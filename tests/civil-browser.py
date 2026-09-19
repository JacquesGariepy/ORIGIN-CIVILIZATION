"""Tests the real shipped Canvas renderer and UI against the real Node server.
Only upstream model responses are fixtures. A Python HTTP relay is used because
this environment blocks Chromium's network. No view/scene is replaced.
Run the TEST-ONLY civil-fixture-server.cjs first (port 4320).
"""
import asyncio,json,urllib.request,urllib.error
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'validation/v6';OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,ok):
 checks.append({'name':name,'passed':bool(ok)})
 if not ok:raise AssertionError(name)
async def relay(url,init):
 url='http://127.0.0.1:4320'+url if url.startswith('/') else url
 if not url.startswith('http://127.0.0.1:4320'):return {'status':503,'headers':{},'text':'External access unavailable in test environment'}
 data=init.get('body');data=data.encode() if isinstance(data,str) else None
 try:r=urllib.request.urlopen(urllib.request.Request(url,data=data,headers={**init.get('headers',{}),'Origin':'http://127.0.0.1:4320'},method=init.get('method','GET')),timeout=15)
 except urllib.error.HTTPError as e:r=e
 return {'status':r.status,'headers':dict(r.headers),'text':r.read().decode()}
async def prepare(browser,size):
 page=await browser.new_page(viewport=size,device_scale_factor=1)
 await page.expose_function('__httpRelay',relay)
 html=ROOT.joinpath('ORIGIN.html').read_text()
 pre="<script>window.fetch=async function(u,i={}){const r=await window.__httpRelay(String(u),i);return new Response(r.text,{status:r.status,headers:r.headers})};</script>"
 await page.set_content(pre+html,wait_until='load')
 await page.wait_for_function('window.ORIGIN?.view?.ready && window.ORIGIN.session.token')
 await page.evaluate("(()=>{const n=document.createElement('div');n.textContent='VALIDATION / UPSTREAM API FIXTURES / REAL SHIPPED RENDERER';n.style='position:fixed;bottom:0;left:0;z-index:9999;background:#142b22;color:#f4dea8;font:9px monospace;padding:6px;pointer-events:none';document.body.appendChild(n)})()")
 return page
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await prepare(b,{'width':1440,'height':960});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
  check('Real canvas renderer initializes without CDN',await page.evaluate("ORIGIN.view.ready && ORIGIN.view.rendererName.includes('ISOMETRIC')"))
  check('No API request before authorization',await page.evaluate('ORIGIN.session.attempts===0'))
  await page.click('#help-btn');await page.click('[data-scenario="modern"]');await page.wait_for_function("ORIGIN.session.world.scenario==='modern'");await page.keyboard.press('Escape')
  check('Seeded modern scenario has declared homes and objects',await page.evaluate('ORIGIN.session.world.rooms.length===3 && ORIGIN.session.world.objects.length>=29'))
  check('Scenario selection does not spend credit',await page.evaluate('ORIGIN.session.attempts===0'))
  for section,title in [('build','Make somewhere belong.'),('world','A place on Earth.'),('households','More than a population.'),('economy','An economy made of actions.'),('civilization','A civilization leaves evidence.'),('conversations','No invisible conversation.'),('creator','One person, not a clone.')]:
   await page.evaluate(f"ORIGIN.ui.page('{section}')");await page.wait_for_timeout(120)
   check('Workspace '+section,await page.locator('#overlay h2').inner_text()==title)
  await page.fill('#creator-name','Ada');await page.click('#creator-form button[type="submit"], #creator-form button.primary');await page.wait_for_function("ORIGIN.session.world.entities[0].observerName==='Ada'")
  check('Creator change applied by authoritative server',await page.evaluate("ORIGIN.session.world.chronicle.some(e=>e.kind==='creator_edit')"))
  await page.evaluate("ORIGIN.ui.page('build')");await page.fill('#room-name','Workshop extension');await page.fill('#room-x','-27');await page.fill('#room-z','-8');await page.fill('#room-w','6');await page.fill('#room-d','6');await page.locator('#room-form button[type="submit"],#room-form button.primary').last.click();await page.wait_for_function('ORIGIN.session.world.rooms.length===4')
  check('Drawing a room is a plan, not an instant free building',await page.evaluate('!ORIGIN.session.world.rooms.at(-1).built && ORIGIN.session.world.rooms.at(-1).progress===0'))
  await page.screenshot(path=str(OUT/'desktop-build.png'))
  await page.evaluate("ORIGIN.ui.page('world')");await page.wait_for_timeout(150);check('Earth canvas uses actual land features',await page.evaluate('ORIGIN_EARTH.features[0].geometry.type === "MultiPolygon"'))
  check('Complete Earth map fits its workspace',await page.evaluate("document.querySelector('#earth-map').getBoundingClientRect().right<=document.querySelector('#overlay').getBoundingClientRect().right"));await page.locator('#earth-map').click(position={'x':150,'y':100});check('Earth map click updates coordinates',await page.locator('#earth-lat').input_value()!='36.1');await page.screenshot(path=str(OUT/'desktop-earth.png'))
  await page.evaluate("ORIGIN.ui.page('live')");await page.click('#connect-btn');check('Remote transport cannot silently fall back to direct',await page.locator('#transport').is_disabled())
  await page.click('#access-btn');await page.wait_for_function("document.querySelector('#connection-error').textContent.includes('succeeded')")
  check('Account check does not change world time',await page.evaluate('ORIGIN.session.world.simTime===0'))
  await page.check('#detached-run');await page.fill('#run-window','60');await page.fill('#jev-cap','60');await page.locator('#connection-form button[type="submit"]').click()
  await page.wait_for_function('Object.keys(ORIGIN.session.world.activities).length>=6',timeout=10000)
  check('Several genuinely simultaneous activities exist',await page.evaluate('new Set(Object.values(ORIGIN.session.world.activities).map(a=>a.start)).size===1'))
  check('Different physical activities run together',await page.evaluate('new Set(Object.values(ORIGIN.session.world.activities).map(a=>a.kind)).size>=4'))
  await page.wait_for_timeout(1700);check('Shared time advances on the server',await page.evaluate('ORIGIN.session.world.simTime>0'))
  await page.screenshot(path=str(OUT/'desktop-running.png'))
  await page.click('#run-btn');await page.wait_for_function('!ORIGIN.session.running')
  check('Pause retains unfinished activities',await page.evaluate('Object.keys(ORIGIN.session.world.activities).length>0'))
  await page.click('#ledger-btn');await page.wait_for_timeout(250)
  check('Full ledger shows complete model requests and receipts',await page.evaluate("ORIGIN.session.log.some(r=>r.type==='request'&&r.response&&r.request&&r.testFixture)"))
  await page.keyboard.press('Escape')
  check('No runtime JavaScript errors',not errors)
  mobile=await prepare(b,{'width':390,'height':844});mobile_errors=[];mobile.on('pageerror',lambda e:mobile_errors.append(str(e)))
  check('Second browser sees same authoritative world',await mobile.evaluate("ORIGIN.session.world.entities[0].observerName==='Ada' && ORIGIN.session.attempts>0"))
  check('Mobile page has no horizontal document overflow',await mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  await mobile.screenshot(path=str(OUT/'mobile-live.png'))
  await mobile.evaluate("ORIGIN.ui.page('households')");await mobile.wait_for_timeout(200);await mobile.screenshot(path=str(OUT/'mobile-families.png'))
  check('Mobile family workspace accessible',await mobile.locator('#overlay h2').inner_text()=='More than a population.')
  await mobile.evaluate("ORIGIN.ui.page('build')");await mobile.wait_for_timeout(200)
  check('Mobile build form remains within viewport',await mobile.locator('#room-form').is_visible())
  await mobile.screenshot(path=str(OUT/'mobile-build.png'))
  await mobile.evaluate("ORIGIN.ui.page('world')");await mobile.wait_for_timeout(180)
  check('Entire Earth atlas fits the mobile workspace',await mobile.evaluate("document.querySelector('#earth-map').getBoundingClientRect().right<=innerWidth && document.querySelector('#earth-map').getBoundingClientRect().width>200"))
  await mobile.screenshot(path=str(OUT/'mobile-earth.png'))
  check('No mobile runtime errors',not mobile_errors)
  await b.close()
 OUT.joinpath('browser-results.json').write_text(json.dumps({'method':'Real production isometric renderer. Real authoritative Node server. Explicit upstream API fixtures. HTTP relay for Chromium network policy. No live provider or WebGL validation.', 'checks':checks},indent=2))
 print(json.dumps({'passed':len(checks),'checks':checks},indent=2))
try:asyncio.run(main())
except Exception:
 OUT.joinpath('browser-results.json').write_text(json.dumps({'checks':checks,'failed':True},indent=2));raise
