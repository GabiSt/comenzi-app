// Logica pura pentru recunoasterea marcajelor (fara DOM): decodare YOLO, grupare caractere, potrivire cu Excel, vot pe cadre
(function(root){
const CONF={o:"0",q:"0",d:"0",i:"1",l:"1",j:"1",z:"2",s:"5",g:"6",b:"8"};
const N=s=>String(s==null?"":s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const cn=s=>N(s).replace(/[^a-z0-9]/g,"").split("").map(c=>CONF[c]||c).join("");
// distanta minima de editare a lui a intr-un subsir oarecare din b (Sellers)
function sub(a,b){const m=a.length,n=b.length;let p=new Array(n+1).fill(0);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return Math.min(...p)}
function lev(a,b){const m=a.length,n=b.length;let p=Array.from({length:n+1},(_,j)=>j);
for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
function letterbox(sw,sh,size){const scale=Math.min(size/sw,size/sh),nw=Math.round(sw*scale),nh=Math.round(sh*scale);return{scale,nw,nh,padX:Math.floor((size-nw)/2),padY:Math.floor((size-nh)/2)}}
const iou=(a,b)=>{const x=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)),y=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)),i=x*y;return i/(a.w*a.h+b.w*b.h-i||1)};
// out: Float32Array [4+nc][n] (iesirea Ultralytics, canal-major); coordonate in imaginea sursa
function decode(data,nc,n,lb,o){o=o||{};const conf=o.conf||.35,nmsT=o.nms||.5,d=[];
for(let i=0;i<n;i++){let best=-1,bs=0;for(let c=0;c<nc;c++){const v=data[(4+c)*n+i];if(v>bs){bs=v;best=c}}
 if(bs<conf)continue;const cx=data[i],cy=data[n+i],w=data[2*n+i],h=data[3*n+i];
 const x=(cx-w/2-lb.padX)/lb.scale,y=(cy-h/2-lb.padY)/lb.scale,ww=w/lb.scale,hh=h/lb.scale;if(ww<2||hh<2)continue;
 d.push({x,y,w:ww,h:hh,c:best,s:bs})}
d.sort((a,b)=>b.s-a.s);const keep=[];for(const a of d){if(keep.every(k=>iou(k,a)<nmsT))keep.push(a)}return keep}
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
const union=a=>{const x=Math.min(...a.map(d=>d.x)),y=Math.min(...a.map(d=>d.y)),r=Math.max(...a.map(d=>d.x+d.w)),b=Math.max(...a.map(d=>d.y+d.h));return{x,y,w:r-x,h:b-y}};
// caractere detectate -> siruri candidate (cuvinte, linii, tot textul); linii dupa y, cuvinte dupa spatiu intre caractere
function groupChars(dets,names){if(!dets.length)return[];const mh=med(dets.map(d=>d.h)),ds=[...dets].sort((a,b)=>(a.y+a.h/2)-(b.y+b.h/2)),lines=[];
for(const d of ds){const cy=d.y+d.h/2,L=lines.find(l=>Math.abs(l.cy-cy)<.6*mh);if(L){L.d.push(d);L.cy=L.d.reduce((s,x)=>s+x.y+x.h/2,0)/L.d.length}else lines.push({cy,d:[d]})}
const out=[],seen=new Set(),add=a=>{const text=a.map(d=>names[d.c]).join("");if(text.length<2||seen.has(text))return;seen.add(text);out.push({text,box:union(a),conf:a.reduce((s,d)=>s+d.s,0)/a.length,n:a.length})};
const allw=[];lines.sort((a,b)=>a.cy-b.cy).forEach(l=>{l.d.sort((a,b)=>a.x-b.x);const ws=[];let cur=[l.d[0]];
 for(let i=1;i<l.d.length;i++){const p=l.d[i-1],c=l.d[i];if(c.x-(p.x+p.w)>.9*mh){ws.push(cur);cur=[c]}else cur.push(c)}ws.push(cur);
 ws.forEach(add);if(ws.length>1)add(l.d);ws.forEach(w=>allw.push(...w))});
if(lines.length>1)add(allw);return out}
function buildIndex(S,fields){const map=new Map(),list=[];
fields.forEach(f=>{const j=S.meta[f];if(!(j>=0))return;S.rows.forEach((r,i)=>{const k=cn(r[j]);if(k.length<2)return;const e={i,col:j,key:k};list.push(e);let a=map.get(k);if(!a)map.set(k,a=[]);a.push(e)})});
return{map,list}}
// potrivire: exact (orice lungime >=2), apoi continere / diferenta mica de caractere (>=4 caractere)
function match(ix,text,min){min=min||.75;const x=cn(text);if(x.length<2)return null;
const pack=(score,es)=>({score,key:[...new Set(es.map(e=>e.i))].join(","),rows:[...new Set(es.map(e=>e.i))],col:es[0].col,text});
const ex=ix.map.get(x);if(ex)return pack(1,ex);if(x.length<4)return null;
let best=0,hits=[];for(const e of ix.list){const k=e.key;let s=0;
 if(x.length>=4&&k.includes(x))s=.9+.1*x.length/k.length;else if(k.length>=4&&x.includes(k))s=.85+.1*k.length/x.length;
 else if(x.length>=5&&k.length>=5){const L=Math.min(x.length,k.length),d=Math.min(sub(x,k),sub(k,x));if(d<=(L<=8?1:2))s=1-d/L}
 if(s<min)continue;if(s>best+1e-9){best=s;hits=[e]}else if(Math.abs(s-best)<=1e-9)hits.push(e)}
return hits.length?pack(best,hits):null}
function analyze(dets,names,ix,min){const strs=groupChars(dets,names),by=new Map(),unmatched=[];
for(const s of strs){const m=match(ix,s.text,min);if(!m){if(s.text.length>=3)unmatched.push({text:s.text,box:s.box});continue}
 const h={key:m.key,rows:m.rows,col:m.col,score:m.score*(.5+.5*s.conf),box:s.box,text:s.text},o=by.get(h.key);if(!o||h.score>o.score)by.set(h.key,h)}
return{hits:[...by.values()].sort((a,b)=>b.score-a.score),unmatched,strings:strs}}
class Voter{constructor(win,min){this.win=win||8;this.min=min||3;this.h=[]}
reset(){this.h=[]}
push(hits){this.h.push(hits);if(this.h.length>this.win)this.h.shift();const m=new Map();
 this.h.forEach(fr=>fr.forEach(x=>{const e=m.get(x.key)||{n:0,sum:0};e.n++;e.sum+=x.score;e.last=x;m.set(x.key,e)}));
 return[...m.values()].filter(e=>e.n>=this.min).sort((a,b)=>b.n-a.n||b.sum-a.sum).map(e=>({...e.last,n:e.n,score:e.sum/e.n}))}}
const api={cn,lev,letterbox,decode,groupChars,buildIndex,match,analyze,Voter};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.ARCore=api;
})(typeof window!=="undefined"?window:globalThis);
