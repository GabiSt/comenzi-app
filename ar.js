// Tab AR: camera live sau poza, recunoastere marcaj cu modelul propriu (ONNX), card cu datele comenzii
const AR={on:false,mode:"live",stream:null,model:null,names:null,size:640,conf:.35,voter:new ARCore.Voter(8,3),ix:null,ixS:null,idx:{},frozen:false,looping:false,loading:null,fps:0,lastText:"",view:null};
const IDF=["cdaInt","lingou","forja","pm"];
const setSt=t=>{$("arst").textContent=t};
const arErr=()=>AR.err?" Detalii: "+String(AR.err.message||AR.err):"";
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("Nu pot încărca "+src));document.head.appendChild(s)})}
function arLoadModel(){
 if(AR.model)return Promise.resolve(true);if(AR.loading)return AR.loading;
 AR.loading=(async()=>{try{
  const r=await fetch("model/classes.json",{cache:"no-store"});if(!r.ok)throw new Error("lipsește model/classes.json");
  const cfg=await r.json();AR.names=cfg.names;AR.size=cfg.imgsz||640;AR.conf=cfg.conf||.35;
  if(!window.ort)await loadScript("ort/ort.wasm.min.js");
  ort.env.wasm.wasmPaths=new URL("ort/",location.href).href;ort.env.wasm.numThreads=1;
  AR.model=await ort.InferenceSession.create("model/marcaj.onnx",{executionProviders:["wasm"]});
  AR.inName=AR.model.inputNames[0];AR.outName=AR.model.outputNames[0];return true}
 catch(e){AR.err=e;AR.model=null;return false}finally{AR.loading=null}})();
 return AR.loading}
function arIndex(){if(AR.ixS!==S||!AR.ix){AR.ix=ARCore.buildIndex(S,IDF);AR.ixS=S;AR.voter.reset();AR.idx={}}return AR.ix}
async function arDetect(src,sw,sh){const sz=AR.size,lb=ARCore.letterbox(sw,sh,sz),c=AR.cv||(AR.cv=document.createElement("canvas"));c.width=c.height=sz;
 const g=c.getContext("2d",{willReadFrequently:true});g.fillStyle="#727272";g.fillRect(0,0,sz,sz);g.drawImage(src,0,0,sw,sh,lb.padX,lb.padY,lb.nw,lb.nh);
 const d=g.getImageData(0,0,sz,sz).data,n=sz*sz,f=new Float32Array(3*n);
 for(let i=0,p=0;i<n;i++,p+=4){f[i]=d[p]/255;f[n+i]=d[p+1]/255;f[2*n+i]=d[p+2]/255}
 const out=await AR.model.run({[AR.inName]:new ort.Tensor("float32",f,[1,3,sz,sz])}),o=out[AR.outName];
 return ARCore.decode(o.data,AR.names.length,o.dims[2],lb,{conf:AR.conf})}
async function arProcess(src,sw,sh,single){const t=performance.now(),dets=await arDetect(src,sw,sh),r=ARCore.analyze(dets,AR.names,arIndex());
 const show=single?r.hits:AR.voter.push(r.hits);
 AR.lastText=(r.hits[0]&&r.hits[0].text)||(r.strings[0]&&r.strings[0].text)||"";
 AR.view={hits:show,unm:r.unmatched,sw,sh};arDraw();
 const dt=performance.now()-t;AR.fps=AR.fps?AR.fps*.8+.2*(1000/dt):1000/dt;
 if(single)setSt(show.length?"Găsit în Excel.":(r.strings.length?"Citit: "+r.strings.map(s=>s.text).slice(0,3).join(", ")+" – nu e în Excel. Poți corecta manual mai jos.":"Nu am văzut niciun marcaj. Apropie-te sau fă altă poză."));
 else setSt(`Live · ${AR.fps.toFixed(1)} fps`+(AR.lastText?` · citit: ${AR.lastText}`:""))}
function arCardHtml(h){const n=h.rows.length,ix=(AR.idx[h.key]||0)%n,r=S.rows[h.rows[ix]],m=S.meta,g=k=>m[k]>=0?r[m[k]]:"",st=stOf(r),c=STC[st]||"#7f8c8d";
 const row=(a,b)=>b?`<div class="al"><span>${a}</span><b>${esc(b)}</b></div>`:"";
 const dims=(m.dim||[]).map(j=>r[j]?((S.cols[j].split(" · ").slice(1).join(" ")||S.cols[j])+" "+r[j]):"").filter(Boolean).join(" · ");
 return `<div class="arcard" data-key="${esc(h.key)}"><div class="ah"><b>${esc(g("client")||"(fără client)")}</b><span class="b" style="background:${c};color:#fff">${esc(st)}</span></div>
<div class="mu2">${esc(S.cols[h.col].split(" · ").pop())}: ${esc(r[h.col]||"")}</div>${row("Secțiune / aliaj",g("sectAl"))}${row("Grad",g("grd"))}${row("Dimensiuni",dims)}${row("Termen solicitat",g("eta"))}
${n>1?`<div class="mu2">${ix+1}/${n} comenzi cu acest număr · atinge pentru următoarea</div>`:""}</div>`}
function arDraw(){const V=AR.view,box=$("arbox"),cv=$("arc"),W=box.clientWidth,H=box.clientHeight,cc=$("arcards");
 cv.width=W;cv.height=H;if(!V){cc.innerHTML="";cc.dataset.sig="";return}
 const g=cv.getContext("2d"),k=W/V.sw;g.lineWidth=3;g.font="bold 14px system-ui";
 V.unm.forEach(u=>{g.strokeStyle=g.fillStyle="#ffd400";g.strokeRect(u.box.x*k,u.box.y*k,u.box.w*k,u.box.h*k);g.fillText(u.text,u.box.x*k,Math.max(14,u.box.y*k-4))});
 V.hits.forEach(h=>{if(!h.box)return;g.strokeStyle=g.fillStyle="#00e676";g.strokeRect(h.box.x*k,h.box.y*k,h.box.w*k,h.box.h*k)});
 const hs=V.hits.slice(0,3),sig="s|"+hs.map(h=>h.key+":"+(AR.idx[h.key]||0)).join("|");
 if(cc.dataset.sig!==sig){cc.dataset.sig=sig;cc.innerHTML=hs.map(arCardHtml).join("")}
 [...cc.children].forEach((el,i)=>{const h=hs[i];if(!h)return;const w=el.offsetWidth,hh=el.offsetHeight;let x=8,y=8;
  if(h.box){x=Math.min(Math.max(0,h.box.x*k),Math.max(0,W-w-4));y=(h.box.y+h.box.h)*k+8;if(y+hh>H)y=Math.max(0,h.box.y*k-hh-8)}
  el.style.left=x+"px";el.style.top=y+"px"})}
$("arcards").onclick=e=>{const c=e.target.closest(".arcard");if(!c)return;const k=c.dataset.key;AR.idx[k]=(AR.idx[k]||0)+1;$("arcards").dataset.sig="";arDraw()};
async function arLoop(){if(AR.looping)return;AR.looping=true;
 while(AR.on&&AR.mode==="live"&&AR.model){const v=$("arv");
  if(v.readyState>=2&&v.videoWidth&&!AR.frozen){try{await arProcess(v,v.videoWidth,v.videoHeight,false)}catch(e){setSt("Eroare: "+e.message);break}}
  await new Promise(r=>requestAnimationFrame(r))}
 AR.looping=false}
async function arStart(){if(AR.on)return;AR.on=true;setSt("Pornesc camera...");
 try{AR.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});
  const v=$("arv");v.srcObject=AR.stream;await v.play()}
 catch(e){setSt("Camera indisponibilă ("+e.message+"). Cere HTTPS și permisiune; poți alege o poză din galerie.")}
 if(!AR.on)return;const ok=await arLoadModel();if(!AR.on)return;
 if(!ok){setSt("Modelul nu s-a putut încărca (model/marcaj.onnx + model/classes.json)."+arErr()+" Poți scrie marcajul manual mai jos.");return}
 setSt(AR.mode==="live"?"Model încărcat. Îndreaptă camera spre marcaj.":"Model încărcat. Fă poza marcajului.");if(AR.mode==="live")arLoop()}
function arStop(){AR.on=false;if(AR.stream){AR.stream.getTracks().forEach(t=>t.stop());AR.stream=null}const v=$("arv");v.srcObject=null;AR.view=null;AR.voter.reset();arDraw()}
function arUnfreeze(){AR.frozen=false;$("arf").style.display="none";$("arv").style.display="block";AR.view=null;AR.voter.reset();arDraw();$("arshot").textContent="📸 Fă poza";try{$("arv").play()}catch(e){}}
function setMode(m){AR.mode=m;$("m1").classList.toggle("s",m!=="live");$("m2").classList.toggle("s",m!=="photo");$("arshot").classList.toggle("hide",m!=="photo");
 if(m==="live"){arUnfreeze();if(AR.on&&AR.model)arLoop()}else{AR.view=null;AR.voter.reset();arDraw()}}
function freezeFrom(src,sw,sh){const f=$("arf");f.width=sw;f.height=sh;f.getContext("2d").drawImage(src,0,0,sw,sh);f.style.display="block";$("arv").style.display="none";AR.frozen=true;$("arshot").textContent="↩ Reia";return f}
async function arAnalyzeFrozen(f){if(!await arLoadModel()){setSt("Modelul nu s-a putut încărca."+arErr()+" Scrie marcajul manual mai jos.");return}
 setSt("Analizez...");try{await arProcess(f,f.width,f.height,true)}catch(e){setSt("Eroare: "+e.message)}}
$("m1").onclick=()=>setMode("live");$("m2").onclick=()=>setMode("photo");
$("arshot").onclick=async()=>{if(AR.frozen){arUnfreeze();setSt("Fă poza marcajului.");return}
 const v=$("arv");if(!v.videoWidth){setSt("Camera nu e pornită. Alege o poză din galerie.");return}
 const f=freezeFrom(v,v.videoWidth,v.videoHeight);await arAnalyzeFrozen(f)};
$("arfile").onclick=()=>$("arfi").click();
$("arfi").onchange=async e=>{const file=e.target.files[0];if(!file)return;e.target.value="";setMode("photo");
 try{const im=new Image();im.src=URL.createObjectURL(file);await im.decode();const k=Math.min(1,1600/Math.max(im.width,im.height)),w=Math.round(im.width*k),h=Math.round(im.height*k);
  const f=freezeFrom(im,w,h);URL.revokeObjectURL(im.src);await arAnalyzeFrozen(f)}catch(x){setSt("Nu pot citi poza: "+x.message)}};
$("arman").onsubmit=e=>{e.preventDefault();const t=$("armt").value.trim();if(!t)return;const m=ARCore.match(arIndex(),t);
 if(!m){setSt(`Nu găsesc „${t}” în Excel.`);return}
 setMode("photo");const v=$("arv");AR.view={hits:[{...m,box:null}],unm:[],sw:v.videoWidth||$("arbox").clientWidth||1,sh:v.videoHeight||1};$("arcards").dataset.sig="";arDraw();setSt(`Găsit: ${t}`)};
$("arsave").onclick=()=>{const src=AR.frozen?$("arf"):$("arv"),sw=src.videoWidth||src.width,sh=src.videoHeight||src.height;if(!sw){setSt("Nu e nicio imagine de salvat.");return}
 const c=document.createElement("canvas");c.width=sw;c.height=sh;c.getContext("2d").drawImage(src,0,0,sw,sh);
 c.toBlob(b=>{const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`marcaj_${(AR.lastText||"necunoscut").replace(/[^A-Za-z0-9-]/g,"")}_${Date.now()}.jpg`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)},"image/jpeg",.92)};
window.addEventListener("resize",()=>{if(AR.on)arDraw()});
document.addEventListener("visibilitychange",()=>{if(document.hidden){if(AR.on){AR.resume=true;arStop()}}else if(AR.resume&&CURTAB==="3"){AR.resume=false;arStart()}});
