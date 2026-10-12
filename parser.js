// Citeste Excelul cu antetul pe mai multe randuri (celule imbinate) si il transforma in {cols, rows}
function norm(s){return String(s==null?"":s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function fmtDate(d){const p=n=>String(n).padStart(2,"0");return p(d.getDate())+"."+p(d.getMonth()+1)+"."+d.getFullYear()}
function buildMeta(cols){
  const find=re=>cols.findIndex(c=>re.test(norm(c))),nf=(re,ex)=>cols.findIndex(c=>{const n=norm(c);return re.test(n)&&!ex.test(n)});
  const meta={nr:find(/^(nr\.?\s?crt\.?|nr\.?|crt\.?)$/),data:find(/data lans|data comenz|data intr/),client:find(/client/),cdaExt:find(/cda ext/),cdaInt:find(/cda int/),lingou:nf(/lingou/,/cantitate|necesar/),forja:nf(/forja/,/cantitate|necesar/),pm:find(/\bp\.?\s?m\.?$/),stadiu:find(/stadiu/),eta:find(/\beta\b|livrare/),zirom:find(/zirom|finalizare/),tip:find(/^tip produs/),sectAl:find(/sectiune|aliaj/),grd:find(/^grd$|\bgrad\b/),dim:cols.map((c,i)=>/dimensiuni/.test(norm(c))?i:-1).filter(i=>i>=0)};
  const dateCols=cols.map((c,i)=>/\bdata\b|termen|\beta\b|zirom/.test(norm(c))?i:-1).filter(i=>i>=0);
  return{meta,dateCols};
}
const pz=n=>String(n).padStart(2,"0");
// orice forma de data -> dd.mm.yyyy (Date, serial Excel, text dd/mm/yyyy, dd-mm-yy, yyyy-mm-dd)
function toDMY(v){
  if(v instanceof Date)return fmtDate(new Date(v.getTime()+6*36e5));
  if(typeof v==="number"&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return pz(d.getUTCDate())+"."+pz(d.getUTCMonth()+1)+"."+d.getUTCFullYear()}
  const s=String(v==null?"":v).trim();let m;
  if((m=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2}|\d{4})$/)))return pz(+m[1])+"."+pz(+m[2])+"."+(m[3].length===2?"20"+m[3]:m[3]);
  if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/)))return m[3]+"."+m[2]+"."+m[1];
  return s}
// o foaie -> {cols,rows,meta,dateCols} sau null daca nu are coloana "Client"
function parseSheet(XLSX,ws){
  const aoa=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:""});
  if(!aoa.length)return null;
  const ncol=aoa.reduce((m,r)=>Math.max(m,r.length),0);
  aoa.forEach(r=>{while(r.length<ncol)r.push("")});
  const mg=ws["!merges"]||[];
  mg.forEach(m=>{const v=aoa[m.s.r]&&aoa[m.s.r][m.s.c];
    for(let r=m.s.r;r<=m.e.r;r++)for(let c=m.s.c;c<=m.e.c;c++)if(aoa[r]&&!(r===m.s.r&&c===m.s.c))aoa[r][c]=v});
  const hi=aoa.findIndex(r=>r.some(c=>norm(c).trim()==="client"));
  if(hi<0)return null;
  // inaltimea antetului: celulele imbinate pe verticala care pornesc din primul rand (ex. "Client" pe 3 randuri)
  let end=hi;mg.forEach(m=>{if(m.s.r===hi&&m.e.r>end&&m.e.r<=hi+5)end=m.e.r});
  let ds=end+1;
  if(end===hi){ // fara imbinari: primul rand cu un numar sau o data = primul rand de date
    const hasVal=r=>r.some(v=>v instanceof Date||typeof v==="number");
    ds=hi+1;while(ds<aoa.length&&ds<hi+6&&!hasVal(aoa[ds]))ds++;
    if(ds>=aoa.length||ds>=hi+6)ds=hi+1}
  const cols=[];
  for(let c=0;c<ncol;c++){const seen=[];for(let r=hi;r<ds;r++){const t=String(aoa[r][c]).replace(/\s+/g," ").trim();if(t&&!seen.includes(t))seen.push(t)}cols.push(seen.join(" · ")||"Col "+(c+1))}
  const{meta,dateCols}=buildMeta(cols),isD=new Set(dateCols),rows=[];
  for(let r=ds;r<aoa.length;r++){
    const row=aoa[r].map((v,j)=>isD.has(j)?toDMY(v):v instanceof Date?fmtDate(v):String(v==null?"":v).trim());
    if(row.some(x=>x))rows.push(row)}
  return{cols,rows,meta,dateCols};
}
// alege foaia cu cele mai multe comenzi (foaia cu coloana "Client")
function parseWorkbook(XLSX,buf){
  const wb=XLSX.read(buf,{type:"array",cellDates:true});let best=null;
  for(const n of wb.SheetNames){const r=parseSheet(XLSX,wb.Sheets[n]);if(r&&(!best||r.rows.length>best.rows.length))best=r}
  if(!best)throw new Error("Nu gasesc coloana 'Client' in nicio foaie (foi: "+wb.SheetNames.join(", ")+").");
  return best}
if(typeof module!=="undefined")module.exports={parseWorkbook,parseSheet,buildMeta,toDMY,norm};
