let ENG=LS.get("eng")||"local",TR=null,DET=[],PV=null;
const jpg=(cv,max=1600)=>{const k=Math.min(1,max/Math.max(cv.width,cv.height)),c=document.createElement("canvas");c.width=Math.round(cv.width*k);c.height=Math.round(cv.height*k);c.getContext("2d").drawImage(cv,0,0,c.width,c.height);return c.toDataURL("image/jpeg",.85)};
async function prep(f){const im=new Image();im.src=URL.createObjectURL(f);await im.decode();const k=Math.min(1,2400/Math.max(im.width,im.height)),c=document.createElement("canvas");
 c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(im.src);return c}
function preview(cv){const w=Math.min(innerWidth-24,640),p=document.createElement("canvas");p.width=w;p.height=Math.round(cv.height*w/cv.width);
 const g=p.getContext("2d");g.drawImage(cv,0,0,p.width,p.height);$("pw").innerHTML="";$("pw").appendChild(p);PV={g,k:p.width/cv.width}}
function mark(r,t){if(!PV)return;const{g,k}=PV;g.lineWidth=t?3:1;g.strokeStyle=t?"#ffd400":"rgba(255,255,255,.4)";g.strokeRect(r.x*k,r.y*k,r.w*k,r.h*k)}
// --- detectie locala de zone cu text: densitate de contur (gradient) pe ferestre 3:1 la 3 scari, cu suprimare de suprapuneri ---
function findRegions(im,N=14){
 const m=Math.min(1,900/Math.max(im.width,im.height)),w=Math.round(im.width*m),h=Math.round(im.height*m),c=document.createElement("canvas");c.width=w;c.height=h;
 const g=c.getContext("2d",{willReadFrequently:true});g.drawImage(im,0,0,w,h);const d=g.getImageData(0,0,w,h).data,L=new Float32Array(w*h);
 for(let i=0;i<w*h;i++)L[i]=.299*d[4*i]+.587*d[4*i+1]+.114*d[4*i+2];
 const W1=w+1,I=new Float64Array(W1*(h+1));
 for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){const gx=x+1<w?Math.abs(L[y*w+x+1]-L[y*w+x]):0,gy=y+1<h?Math.abs(L[(y+1)*w+x]-L[y*w+x]):0;row+=gx+gy;I[(y+1)*W1+x+1]=I[y*W1+x+1]+row}}
 const sum=(x,y,a,b)=>I[(y+b)*W1+x+a]-I[y*W1+x+a]-I[(y+b)*W1+x]+I[y*W1+x];
 const pos=(len,win,st)=>{const a=[];for(let p=0;p+win<=len;p+=st)a.push(Math.round(p));const e=len-win;if(e>=0&&(!a.length||a[a.length-1]<e))a.push(e);return a};
 const C=[];
 [.6,.4,.28].forEach(s=>{const cw=Math.min(w,Math.max(40,Math.round(w*s))),ch=Math.min(h,Math.max(24,Math.round(cw/3)));
  pos(w,cw,cw/2).forEach(x=>pos(h,ch,ch/2).forEach(y=>C.push({x,y,w:cw,h:ch,s:sum(x,y,cw,ch)/(cw*ch)})))});
 C.sort((a,b)=>b.s-a.s);
 const iou=(a,b)=>{const x=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)),y=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)),i=x*y;return i/(a.w*a.h+b.w*b.h-i)};
 const out=[];for(const r of C){if(out.length>=N)break;if(out.every(o=>iou(o,r)<.35))out.push(r)}
 return out.map(r=>({x:Math.round(r.x/m),y:Math.round(r.y/m),w:Math.round(r.w/m),h:Math.round(r.h/m)}))}
async function analyzeLocal(cv,say){
 if(!TR){say("Se descarcă modelul open-source (o singură dată)...");
  const T=await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1");
  TR=await T.pipeline("image-to-text","Xenova/trocr-small-handwritten",{progress_callback:p=>{if(p.status==="progress"&&p.total>3e6)say("Descărcare model: "+Math.round(p.progress)+"%")}})}
 const regs=findRegions(cv),out=[];
 for(let i=0;i<regs.length;i++){const r=regs[i],k=Math.min(1,640/Math.max(r.w,r.h)),c=document.createElement("canvas");
  c.width=Math.max(8,Math.round(r.w*k));c.height=Math.max(8,Math.round(r.h*k));c.getContext("2d").drawImage(cv,r.x,r.y,r.w,r.h,0,0,c.width,c.height);
  say(`Analizez zona ${i+1}/${regs.length}...`);
  const o=await TR(c.toDataURL("image/png")),t=(o[0]?.generated_text||"").trim(),ok=cn(t).length>=3;
  mark(r,ok);if(ok)out.push({text:t,variante:[t.replace(/\s+/g,""),t.toUpperCase()]})}
 return out}
async function analyzeClaude(cv){
 const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":APIKEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
 body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:600,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:jpg(cv).split(",")[1]}},
 {type:"text",text:'Imaginea arata un lingou / semifabricat de otel. Gaseste TOATE marcajele (numere, litere, coduri scrise de mana, vopsite sau poansonate) vizibile in poza, oriunde sunt. Transcrie fiecare marcaj exact; daca e ambiguu da 2-3 variante plauzibile (0/O, 1/7, 5/S, 2/Z). Ignora textul din fundal care nu e marcaj. Raspunde DOAR JSON: {"marcaje":[{"text":"...","variante":["..."]}]}'}]}]})});
 const j=await r.json();if(!r.ok)throw new Error(j.error?.message||r.status);
 const t=j.content.map(c=>c.text||"").join(""),a=t.indexOf("{"),b=t.lastIndexOf("}");if(a<0||b<a)return[];
 const o=JSON.parse(t.slice(a,b+1));return(o.marcaje||(o.text?[o]:[])).filter(x=>x&&x.text)}
function chips(){const seen=new Set(),L=[];DET.forEach((o,i)=>{const k=cn(o.text);if(k.length<3||seen.has(k))return;seen.add(k);L.push(i)});
 $("ch").innerHTML=L.length?`<span class="chip on" data-i="-1">Toate</span>`+L.slice(0,12).map(i=>`<span class="chip" data-i="${i}">${esc(DET[i].text)}</span>`).join(""):"";
 $("ch").onclick=e=>{const c=e.target.closest(".chip");if(!c)return;[...$("ch").children].forEach(x=>x.classList.toggle("on",x===c));const i=+c.dataset.i;
  showMatches(i<0?DET.flatMap(o=>[o.text,...(o.variante||[])]):[DET[i].text,...(DET[i].variante||[])])}}
$("pg").onclick=()=>{const v=$("pt").value.split(/[;\n]/).map(x=>x.trim()).filter(Boolean);if(v.length)showMatches(v)};
$("fp").onchange=async e=>{const f=e.target.files[0];if(!f)return;e.target.value="";tab(2);
 const say=m=>$("ps").textContent=m;$("ch").innerHTML="";$("pl").innerHTML="";$("pinfo").textContent="";
 if(!S.rows.length){say("Încarcă mai întâi Excelul.");return}
 $("cam").disabled=true;
 try{say("Se încarcă poza...");const cv=await prep(f);preview(cv);
  if(ENG==="claude"&&APIKEY){say("Claude analizează toată poza...");DET=await analyzeClaude(cv)}else DET=await analyzeLocal(cv,say);
  $("pt").value=DET.map(o=>o.text).join(" ; ");chips();
  if(!DET.length){say("Nu am găsit text lizibil în poză. Scrie marcajul manual sau fă o poză mai apropiată.")}
  else{say(`Am găsit ${DET.length} text(e) în poză. Caut după toate; atinge un text ca să cauți doar după el.`);showMatches(DET.flatMap(o=>[o.text,...(o.variante||[])]))}}
 catch(x){say("Eroare citire: "+x.message+". Poți scrie marcajul manual.")}
 $("cam").disabled=false};
