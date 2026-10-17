import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist'),artifacts=resolve('artifacts');
await mkdir(artifacts,{recursive:true});
const bases=['/So-What-We-Eating-Web/','/projects/what-we-eating/'];
let updatedWorker=false;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),base=bases.find(b=>pathname.startsWith(b));
    if(!base){res.setHeader('content-type','text/html');res.end('<!doctype html><title>Outside app</title><p>Portfolio host</p>');return;}
    const local=pathname.slice(base.length)||'index.html',target=resolve(root,local);
    if(!target.startsWith(root+sep)){res.writeHead(403).end();return;}
    let bytes=await readFile(target);
    if(local==='sw.js'&&updatedWorker)bytes=Buffer.from(bytes.toString().replace(/const VERSION='[^']+'/,"const VERSION='browser-update-check'"));
    res.setHeader('content-type',types[extname(target)]??'application/octet-stream');res.setHeader('cache-control','no-cache');res.end(bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`,url=origin+bases[0];
const chrome=process.env.CHROME_PATH??(existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined);
const report={desktop:false,mobileWidths:[],rerolls:false,historyPersistence:false,menuFallback:false,offline:false,workerUpdate:false,scope:false,portfolioPath:false,storageFailure:false,geolocationDenial:false,errors:[]};
let browser;
const snapshot=page=>page.evaluate(()=>JSON.parse(localStorage.getItem(`swwe:v1:${location.pathname}`)));
const waitFor=async fn=>{const start=Date.now();while(!await fn()){if(Date.now()-start>15000)throw new Error('Browser acceptance wait timed out');await new Promise(r=>setTimeout(r,100));}};
try{
  browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{Math.random=()=>0;});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
  await page.goto(url);await page.getByRole('heading',{name:'SO, WHAT WE EATING?'}).waitFor();
  await page.screenshot({path:resolve(artifacts,'desktop-feed.png'),fullPage:true});report.desktop=true;
  await page.getByLabel('Where are we eating?').fill('Unknown city');await page.getByRole('button',{name:'FEED ME'}).click();
  await page.getByRole('status').filter({hasText:'The test kitchen covers Pasadena'}).waitFor();
  await page.getByLabel('Where are we eating?').fill('91101');
  await page.getByLabel('Party budget',{exact:true}).fill('10');await page.getByLabel('People',{exact:true}).fill('8');await page.getByRole('button',{name:'FEED ME'}).click();
  await page.getByText('Nothing makes a full meal for everyone at this budget.',{exact:false}).waitFor();
  await page.getByLabel('Party budget',{exact:true}).fill('60');await page.getByLabel('People',{exact:true}).fill('3');await page.getByRole('button',{name:'FEED ME'}).click();
  await page.getByRole('heading',{name:'Citrus & Corn',exact:true}).waitFor();
  assert.equal((await snapshot(page)).history.length,0);
  const first=await page.locator('.order-lines').textContent();
  await page.getByRole('button',{name:'Different order here'}).click();assert.notEqual(await page.locator('.order-lines').textContent(),first);
  await page.getByRole('heading',{name:'Citrus & Corn',exact:true}).waitFor();
  await page.getByRole('button',{name:'Different restaurant'}).click();await waitFor(async()=>(await page.locator('.restaurant-intro h1').textContent())!=='Citrus & Corn');report.rerolls=true;
  await page.getByRole('button',{name:'View menu'}).click();await page.getByRole('dialog').waitFor();assert(await page.locator('.menu-list li').count()>0);await page.getByRole('button',{name:'Close'}).click();
  await page.getByRole('button',{name:'Directions'}).click();await page.getByRole('heading',{name:'This spot is make-believe.'}).waitFor();await page.keyboard.press('Escape');
  assert.equal((await snapshot(page)).history.length,0);
  await page.getByRole('button',{name:'Favorite this spot'}).click();
  const chosen=await page.locator('.restaurant-intro h1').textContent();
  await page.getByRole('button',{name:'WE ATE HERE'}).click();assert.equal((await snapshot(page)).history.length,1);assert.equal((await snapshot(page)).history[0].people,3);assert((await snapshot(page)).history[0].totalCents<=6000);
  await page.getByRole('link',{name:'Recent meals',exact:true}).click();await page.getByRole('heading',{name:chosen,exact:true}).waitFor();await page.reload();await page.getByRole('heading',{name:chosen,exact:true}).waitFor();
  assert.equal((await snapshot(page)).history.length,1);assert((await snapshot(page)).preferences.restaurants.some(r=>r.favorite));report.historyPersistence=true;
  await page.getByRole('link',{name:'Feed me',exact:true}).click();
  for(const width of [375,390,430]){
    await page.setViewportSize({width,height:850});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:resolve(artifacts,`mobile-feed-${width}.png`),fullPage:true});report.mobileWidths.push(width);
  }
  await page.getByRole('button',{name:'FEED ME'}).click();await page.locator('.order-lines').waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:resolve(artifacts,'mobile-result.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:resolve(artifacts,'desktop-result.png'),fullPage:true});
  await page.getByRole('link',{name:'Preferences',exact:true}).click();
  await page.getByLabel('How adventurous?').selectOption('surprise');await page.getByLabel('Budget buffer (%)').fill('25');await page.getByRole('button',{name:'Save preferences'}).click();
  await page.reload();assert.equal(await page.getByLabel('Budget buffer (%)').inputValue(),'25');
  await page.locator('.skip-link').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
  // Restrict cuisines to the restaurant with no menu, without touching provider internals.
  for(const cuisine of ['American','Cafe','Fast food','Italian','Japanese','Mexican','Pizza'])await page.getByLabel(cuisine,{exact:true}).selectOption('avoid');
  await page.getByRole('link',{name:'Feed me',exact:true}).click();await page.getByRole('button',{name:'FEED ME'}).click();
  await page.getByRole('heading',{name:'Basil Street Kitchen',exact:true}).waitFor();await page.getByText('Detailed menu data isn’t available',{exact:false}).waitFor();
  assert(await page.getByRole('button',{name:'Different order here'}).isDisabled());assert.equal(await page.locator('.grand-total').count(),0);report.menuFallback=true;
  await waitFor(()=>page.evaluate(()=>!!navigator.serviceWorker.controller));
  const registration=await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return {scope:r.scope,manifest:document.querySelector('link[rel=manifest]').href};});
  assert.equal(registration.scope,url);const manifest=await (await context.request.get(registration.manifest)).json();assert.equal(manifest.display,'standalone');assert(manifest.icons.some(i=>i.sizes==='512x512'));
  await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'SO, WHAT WE EATING?'}).waitFor();
  await page.getByRole('button',{name:'FEED ME'}).click();await page.getByRole('heading',{name:'Basil Street Kitchen',exact:true}).waitFor();report.offline=true;
  await context.setOffline(false);updatedWorker=true;
  await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;await r.update();});
  await waitFor(()=>page.evaluate(async()=>{const keys=await caches.keys();return keys.includes(`swwe:${location.pathname}:browser-update-check`)&&keys.filter(k=>k.startsWith(`swwe:${location.pathname}:`)).length===1;}));
  await page.getByRole('button',{name:'Reload to update'}).waitFor();report.workerUpdate=true;
  const outside=await context.newPage();await outside.goto(origin);assert.equal(await outside.evaluate(()=>navigator.serviceWorker.controller),null);await outside.close();report.scope=true;
  const portfolio=await context.newPage();await portfolio.goto(origin+bases[1]);await portfolio.getByRole('button',{name:'FEED ME'}).click();await portfolio.locator('.order-lines').waitFor();report.portfolioPath=true;await portfolio.close();
  const denied=await browser.newContext();await denied.addInitScript(()=>{Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(_ok,fail)=>fail({code:1})}});Object.defineProperty(window,'localStorage',{get(){throw new Error('Synthetic unavailable storage');}});});
  const fail=await denied.newPage();fail.on('pageerror',e=>report.errors.push(e.message));await fail.goto(url);
  await fail.getByText('Temporary mode:',{exact:false}).waitFor();await fail.getByRole('button',{name:'Use my location'}).click();await fail.getByText('Couldn’t use your location.',{exact:false}).waitFor();report.geolocationDenial=true;
  await fail.getByRole('button',{name:'FEED ME'}).click();await fail.locator('.restaurant-intro h1').waitFor();await fail.getByRole('button',{name:'WE ATE HERE'}).click();await fail.getByRole('link',{name:'Recent meals',exact:true}).click();assert.equal(await fail.locator('.history-list li').count(),1);report.storageFailure=true;
  await denied.close();await context.close();assert.deepEqual(report.errors,[]);
  console.log(JSON.stringify(report,null,2));
}finally{
  await writeFile(resolve(artifacts,'browser-acceptance.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));
}
