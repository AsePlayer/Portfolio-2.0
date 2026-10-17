const VERSION='5f95d84f06b29a5a',FILES=["assets/FixtureProviders-zJ30RVGc.js","assets/geo-BDZfoXyQ.js","assets/index-CRsNXNnw.js","assets/index-CxEnXugt.css","assets/loader-b2GejHLg.js","assets/validate-CX6Ew6bT.js","attribution/README.txt","attribution/google-maps.svg","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable.png","icons/icon.svg","index.html","manifest.webmanifest","privacy.html","terms.html"];
const ROOT=new URL('./',self.location.href);
const PREFIX=`swwe:${ROOT.pathname}:`,CACHE=`${PREFIX}${VERSION}`;
const SHELL=new Set(FILES);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(FILES.map(file=>new URL(file,ROOT).href));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
  await self.clients.claim();
})()));
async function network(request){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
  try{return await fetch(request,{signal:controller.signal,cache:'no-cache'});}finally{clearTimeout(timer);}
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
  const local=url.pathname.slice(ROOT.pathname.length);
  if(request.mode==='navigate'){
    // Keep the installed index paired with its complete precached assets for offline use.
    const fallback=async()=>await caches.match(request,{ignoreSearch:true})||await caches.match(new URL('index.html',ROOT));
    event.respondWith(network(request).then(response=>response.ok?response:fallback()).catch(fallback));return;
  }
  if(!SHELL.has(local))return; // Live APIs and unrelated resources never enter the shell cache.
  if(local.startsWith('assets/'))event.respondWith(caches.match(request,{ignoreSearch:true}).then(cached=>cached||network(request)));
  else event.respondWith(network(request).catch(()=>caches.match(request,{ignoreSearch:true})));
});
