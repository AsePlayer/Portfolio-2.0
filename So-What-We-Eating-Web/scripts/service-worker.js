const VERSION='__VERSION__',FILES=__FILES__;
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
    event.respondWith(network(request).then(response=>response.ok?response:caches.match(new URL('index.html',ROOT))).catch(()=>caches.match(new URL('index.html',ROOT))));return;
  }
  if(!SHELL.has(local))return; // Live APIs and unrelated resources never enter the shell cache.
  if(local.startsWith('assets/'))event.respondWith(caches.match(request,{ignoreSearch:true}).then(cached=>cached||network(request)));
  else event.respondWith(network(request).catch(()=>caches.match(request,{ignoreSearch:true})));
});
