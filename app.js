let S={cols:[],rows:[],meta:{},dateCols:[],dups:0};
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const LS={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){alert("Memorie plină sau blocată.")}}};
let CK=null,SALT=null;
//CRYPTO-START
const b64=a=>{a=new Uint8Array(a);let s="";for(let i=0;i<a.length;i+=0x8000)s+=String.fromCharCode.apply(null,a.subarray(i,i+0x8000));return btoa(s)};
const ub=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function derive(pw,salt){const m=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},m,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function persist(){const d=JSON.stringify({S});
if(CK){const iv=crypto.getRandomValues(new Uint8Array(12)),c=await crypto.subtle.encrypt({name:"AES-GCM",iv},CK,new TextEncoder().encode(d));
LS.set("enc",JSON.stringify({s:b64(SALT),i:b64(iv),d:b64(c)}));try{localStorage.removeItem("S");localStorage.removeItem("key")}catch(e){}}
else{LS.set("S",JSON.stringify(S));try{localStorage.removeItem("enc");localStorage.removeItem("key")}catch(e){}}}
async function openEnc(pw){const e=JSON.parse(LS.get("enc")),salt=ub(e.s),k=await derive(pw,salt);
const p=await crypto.subtle.decrypt({name:"AES-GCM",iv:ub(e.i)},k,ub(e.d));return{o:JSON.parse(new TextDecoder().decode(p)),k,salt}}
//CRYPTO-END
const PAL=["#2e7dd7","#e08a00","#1f8a55","#c0392b","#8e44ad","#16a2b8","#7f8c8d","#d35db0"];
let STC={};
const stOf=r=>(S.meta.stadiu>=0&&r[S.meta.stadiu])||"(fără stadiu)";
function buildStc(){STC={};let n=0;S.rows.forEach(r=>{const s=stOf(r);if(!(s in STC))STC[s]=PAL[n++%PAL.length]})}
function dedupe(s){const seen=new Set(),rows=[];let n=0;
const sk=s.meta&&s.meta.nr>=0?s.meta.nr:-1;
s.rows.forEach(r=>{const k=norm(r.filter((_,j)=>j!==sk).join("\u0001")).replace(/\s+/g," ").trim();
if(!k.replace(/\u0001/g,"").trim()){rows.push(r);return}
if(seen.has(k)){n++;return}seen.add(k);rows.push(r)});
s.rows=rows;s.dups=(s.dups||0)+n;return s}
function hydrate(s){const m=buildMeta(s.cols);s.meta=m.meta;s.dateCols=m.dateCols;return dedupe(s)}
function card(i,hint){const r=S.rows[i],m=S.meta,g=k=>m[k]>=0?r[m[k]]:"",c=STC[stOf(r)]||"var(--bd)";
const det=S.cols.map((x,j)=>r[j]?`<div><span>${esc(x)}</span><span>${esc(r[j])}</span></div>`:"").join("");
const l3=[m.lingou>=0?"Lingou "+(g("lingou")||"–"):"",m.forja>=0?"Forjă "+(g("forja")||"–"):""].filter(Boolean).join(" · ");
return `<div class="card" style="border-left:5px solid ${c}" onclick="this.classList.toggle('open')"><div class="row"><b>${esc(g("client")||"(fără client)")}</b>${g("stadiu")?`<span class="b" style="background:${c};color:#fff">${esc(g("stadiu"))}</span>`:""}</div>
<div class="mu">${esc([m.nr>=0?"#"+r[m.nr]:"",g("tip"),g("sectAl"),g("grd")?"Grd "+g("grd"):"",g("data")].filter(Boolean).join(" · "))}</div><div class="mu">Ext ${esc(g("cdaExt")||"–")} · Int ${esc(g("cdaInt")||"–")}</div>${l3?`<div class="mu">${esc(l3)}</div>`:""}${g("eta")?`<div class="mu">Termen solicitat: ${esc(g("eta"))}</div>`:""}${hint?`<div class="mu" style="color:var(--ac)">Găsit în: ${esc(hint)}</div>`:""}<div class="det">${det}</div></div>`}
// ---- cautare ----
let IX=null,IXS=null,LIM=200;
const IDK=["cdaExt","cdaInt","lingou","forja","pm"];
function ixOf(){if(IXS===S&&IX)return IX;IXS=S;IX=S.rows.map(r=>({t:norm(r.join(" | ")),c:r.map(x=>norm(x).replace(/[^a-z0-9]/g,""))}));return IX}
const tc=t=>t.replace(/[^a-z0-9]/g,"");
function tokHit(x,t){const k=tc(t);return x.t.includes(t)||(k.length>=2&&x.c.some(c=>c.includes(k)))}
function matches(i,toks){const x=ixOf()[i];return toks.every(t=>tokHit(x,t))}
// relevanta: potriviri in coloanele de numere (extern, intern, lingou, forja, P.M.) trec inainte; potrivire exacta si mai sus
function score(i,toks){const x=ixOf()[i];let s=0;toks.forEach(t=>{const k=tc(t);if(!k)return;IDK.forEach(f=>{const j=S.meta[f];if(!(j>=0))return;const c=x.c[j];if(c===k)s+=3;else if(c.includes(k))s+=1})});return s}
function hintFor(i,toks){if(!toks.length)return"";const x=ixOf()[i],out=[];IDK.forEach(f=>{const j=S.meta[f];if(!(j>=0)||!S.rows[i][j])return;if(toks.some(t=>{const k=tc(t);return k&&x.c[j].includes(k)}))out.push(S.cols[j].split(" · ").pop()+" "+S.rows[i][j])});return out.join(" · ")}
let CURTAB="1";
function tab(n){n=String(n);CURTAB=n;["1","2","3"].forEach(k=>{$("t"+k).classList.toggle("s",k!==n);$("v"+k).classList.toggle("hide",k!==n)});$("s1").classList.toggle("hide",n!=="1");
if(n==="2")calRender();if(typeof arStart==="function"){if(n==="3")arStart();else arStop()}}
function render(){buildStc();
const toks=norm($("q").value).split(/\s+/).filter(Boolean),dz=$("dz").value;let d="";
if(dz){const[y,m,dd]=dz.split("-");d=`${dd}.${m}.${y}`}
const idx=[];S.rows.forEach((r,i)=>{if(!matches(i,toks))return;if(d&&!S.dateCols.some(c=>r[c]===d))return;idx.push(i)});
if(toks.length){const sc={};idx.forEach(i=>sc[i]=score(i,toks));idx.sort((a,b)=>sc[b]-sc[a]||a-b)}
$("info").textContent=S.rows.length?`${idx.length} din ${S.rows.length} comenzi`+(S.dups?` · ${S.dups} duplicate eliminate`:""):"Încarcă fișierul Excel pentru a începe.";
$("list").innerHTML=idx.slice(0,LIM).map(i=>card(i,hintFor(i,toks))).join("")+(idx.length>LIM?`<div class="p"><button class="btn s" id="more" style="width:100%">Arată încă 200 (${idx.length-LIM} rămase)</button></div>`:"");
const mo=$("more");if(mo)mo.onclick=()=>{LIM+=200;render()}}
// ---- calendar ----
const p2=n=>String(n).padStart(2,"0"),MN=["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"];
const BY_ALL=[["eta","Livrare (ETA)"],["zirom","Finalizare ZIROM"],["data","Lansare"]];
const T0=new Date();let CAL={y:T0.getFullYear(),m:T0.getMonth(),by:"eta",sel:null,hide:new Set()};
function calRender(){buildStc();const el=$("cal");
if(!S.rows.length){el.innerHTML='<div class="p mu">Încarcă fișierul Excel pentru a vedea calendarul.</div>';return}
const BY=BY_ALL.filter(b=>S.meta[b[0]]>=0);if(BY.length&&!BY.some(b=>b[0]===CAL.by))CAL.by=BY[0][0];
const col=S.meta[CAL.by],seg=`<div class="bar">${BY.map(b=>`<button class="btn ${CAL.by===b[0]?"":"s"}" data-a="by" data-v="${b[0]}" style="font-size:13px;padding:9px 4px">${b[1]}</button>`).join("")}</div>`;
if(!(col>=0)){el.innerHTML=`<div class="p">${seg}<p class="mu">Nu găsesc în Excel coloana pentru această dată.</p></div>`;return}
const ym=`.${p2(CAL.m+1)}.${CAL.y}`,all={},cnt={};
S.rows.forEach((r,i)=>{const d=r[col];if(d&&d.endsWith(ym)){(all[d]=all[d]||[]).push(i);const s=stOf(r);cnt[s]=(cnt[s]||0)+1}});
const vis=d=>(all[d]||[]).filter(i=>!CAL.hide.has(stOf(S.rows[i]))),now=new Date(),today=`${p2(now.getDate())}.${p2(now.getMonth()+1)}.${now.getFullYear()}`;
const off=(new Date(CAL.y,CAL.m,1).getDay()+6)%7,nd=new Date(CAL.y,CAL.m+1,0).getDate();
let cells="";for(let k=0;k<off;k++)cells+="<div></div>";
for(let n=1;n<=nd;n++){const key=p2(n)+ym,v=vis(key),dots=v.slice(0,4).map(i=>`<i class="dt" style="background:${STC[stOf(S.rows[i])]}"></i>`).join("")+(v.length>4?`<em>+${v.length-4}</em>`:"");
cells+=`<div class="cd${key===CAL.sel?" sel":""}${key===today?" today":""}" data-a="day" data-v="${key}"><b>${n}</b><div class="dots">${dots}</div></div>`}
const leg=Object.keys(STC).filter(s=>cnt[s]||CAL.hide.has(s)).map(s=>{const h=CAL.hide.has(s);return `<span class="chip${h?" off":""}" data-a="st" data-v="${esc(s)}" style="border-color:${STC[s]};color:${h?"var(--mu)":STC[s]}">● ${esc(s)} (${cnt[s]||0})</span>`}).join("");
const sl=CAL.sel&&CAL.sel.endsWith(ym)?vis(CAL.sel):null;
el.innerHTML=`<div class="p">${seg}<div class="cnav"><button class="btn s" data-a="prev">‹</button><b>${MN[CAL.m]} ${CAL.y}</b><button class="btn s" data-a="today">Azi</button><button class="btn s" data-a="next">›</button></div>
<div class="cg">${["Lu","Ma","Mi","Jo","Vi","Sâ","Du"].map(x=>`<span class="wd">${x}</span>`).join("")}${cells}</div><div>${leg}</div>
${sl?`<p class="mu" style="margin:14px 0 0"><b>${CAL.sel}</b> · ${sl.length} ${sl.length===1?"comandă":"comenzi"}</p>`:""}</div>${sl?(sl.map(i=>card(i)).join("")||'<div class="p mu">Nicio comandă în această zi.</div>'):""}`}
$("cal").onclick=e=>{const t=e.target.closest("[data-a]");if(!t)return;const a=t.dataset.a,v=t.dataset.v;
if(a==="by"){CAL.by=v;CAL.sel=null}
else if(a==="prev"||a==="next"){const d=new Date(CAL.y,CAL.m+(a==="next"?1:-1),1);CAL.y=d.getFullYear();CAL.m=d.getMonth();CAL.sel=null}
else if(a==="today"){const n=new Date();CAL.y=n.getFullYear();CAL.m=n.getMonth();CAL.sel=`${p2(n.getDate())}.${p2(n.getMonth()+1)}.${n.getFullYear()}`}
else if(a==="day")CAL.sel=CAL.sel===v?null:v;
else if(a==="st"){CAL.hide.has(v)?CAL.hide.delete(v):CAL.hide.add(v)}
calRender()};
// ---- incarcare Excel ----
async function loadX(f){try{S=dedupe(parseWorkbook(XLSX,await f.arrayBuffer()));await persist();render();calRender()}catch(e){alert("Eroare: "+e.message)}}
$("xl").onclick=()=>$("fx").click();$("fx").onchange=e=>e.target.files[0]&&loadX(e.target.files[0]);
$("q").oninput=()=>{LIM=200;render()};$("dz").onchange=()=>{LIM=200;render()};$("dc").onclick=()=>{$("dz").value="";LIM=200;render()};
$("t1").onclick=()=>tab(1);$("t2").onclick=()=>tab(2);$("t3").onclick=()=>tab(3);
$("st").onclick=settings;
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
function modal(title,fields,btns){return new Promise(res=>{const o=document.createElement("div");o.className="ov";o.style.zIndex=40;
o.innerHTML=`<h3>${title}</h3>`+fields.map((f,i)=>`<input class="in" id="f${i}" type="${f.t||"password"}" placeholder="${f.p}" autocomplete="off" value="${esc(f.v||"")}">`).join("")+btns.map(b=>`<button class="btn ${b.s?"s":""}" data-id="${b.id}">${b.t}</button>`).join("");
o.onclick=e=>{const b=e.target.closest("button");if(!b)return;const v=fields.map((_,i)=>o.querySelector("#f"+i).value);o.remove();res({id:b.dataset.id,v})};document.body.appendChild(o)})}
async function setPw(){const o=await modal("Parolă nouă (min. 6 caractere). Nu există recuperare dacă o uiți.",[{p:"Parolă nouă"},{p:"Repetă parola"}],[{id:"ok",t:"Salvează"},{id:"x",t:"Anulează",s:1}]);
if(o.id!=="ok")return;if(o.v[0].length<6||o.v[0]!==o.v[1])return alert("Parolele nu coincid sau sunt prea scurte.");
SALT=crypto.getRandomValues(new Uint8Array(16));CK=await derive(o.v[0],SALT);await persist();alert("Parolă setată. Datele sunt acum criptate.")}
async function settings(){const b=[{id:"pw",t:CK?"🔐 Schimbă parola":"🔐 Setează parolă"}];
if(CK)b.push({id:"rm",t:"🔓 Elimină parola"},{id:"lock",t:"🔒 Blochează acum"});b.push({id:"x",t:"Închide",s:1});
const o=await modal("Setări",[],b);
if(o.id==="pw")await setPw();
else if(o.id==="rm"){const k=await modal("Confirmă parola curentă",[{p:"Parola"}],[{id:"ok",t:"Elimină parola"},{id:"x",t:"Anulează",s:1}]);
if(k.id==="ok"){try{await openEnc(k.v[0]);CK=null;await persist();alert("Parolă eliminată. Datele nu mai sunt criptate.")}catch(e){alert("Parolă greșită.")}}}
else if(o.id==="lock")lock()}
function lock(){S={cols:[],rows:[],meta:{},dateCols:[],dups:0};CK=null;SALT=null;$("list").innerHTML="";$("cal").innerHTML="";if(typeof arStop==="function")arStop();$("q").value="";$("lk").classList.remove("hide");$("lp").value="";$("lp").focus()}
let fails=0;$("lg").onclick=async()=>{const b=$("lg");b.disabled=true;try{const r=await openEnc($("lp").value);S=hydrate(r.o.S);CK=r.k;SALT=r.salt;fails=0;$("lk").classList.add("hide");$("le").textContent="";render()}
catch(e){fails++;$("le").textContent="Parolă greșită.";await new Promise(r=>setTimeout(r,Math.min(30000,1000*2**(fails-1))))}b.disabled=false};
$("lp").onkeydown=e=>{if(e.key==="Enter")$("lg").click()};
let hid=0;document.addEventListener("visibilitychange",()=>{if(document.hidden)hid=Date.now();else if(CK&&Date.now()-hid>60000)lock()});
if(LS.get("enc"))lock();else{try{const s=LS.get("S");if(s)S=hydrate(JSON.parse(s))}catch(e){}render()}
