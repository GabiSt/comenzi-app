const C="comenzi-v8",F=["./","index.html","app.js","parser.js","ar-core.js","ar.js","gate.js","xlsx.full.min.js","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith("comenzi-")&&x!==C).map(x=>caches.delete(x))))));
const AC="assets-ar";
self.addEventListener("fetch",e=>{const u=e.request.url;
if(u.includes("/model/")){e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(AC).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request)));return}
if(u.includes("/ort/")){e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(AC).then(x=>x.put(e.request,c))}return r})));return}
e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
