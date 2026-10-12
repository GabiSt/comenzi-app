// Poarta de acces: aplicatia se deschide direct doar de pe reteaua firmei (dupa IP-ul public);
// de pe orice alta retea cere parola de administrator.
// ATENTIE: e verificare in browser - descurajeaza folosirea in afara firmei, dar nu e securitate reala (vezi GATE-SETUP.txt).
(function () {
  // ---- SETARI (modifica doar aici) ----
  const ALLOWED_IPS = ["212.146.78.46"];       // ex: ["203.0.113.10"]; poti pune mai multe
  const SALT = "schimba-ma-comenzi";
  const ADMIN_HASH = "cd39204eef94acec09c013b2b574e8f4551a4062388cdfb8d0215a6d0a718596";
  // -------------------------------------
  const KEY = "gate_ok";

  if (ADMIN_HASH.indexOf("PUNE_AICI") === 0) { console.warn("gate.js: poarta nu e configurata, e inactiva."); return; }
  if (sessionStorage.getItem(KEY) === "1") return;

  const box = document.createElement("div");
  box.style.cssText = "position:fixed;inset:0;z-index:99999;background:#111;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font:16px system-ui;padding:20px;text-align:center";
  box.textContent = "Verific rețeaua…";
  document.body.appendChild(box);

  const open = () => { sessionStorage.setItem(KEY, "1"); box.remove(); };
  const sha = async t => [...new Uint8Array(await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(SALT + t)))].map(x => x.toString(16).padStart(2, "0")).join("");

  const askAdmin = () => {
    box.innerHTML = '<div>Nu ești pe rețeaua autorizată.<br>Autentificare administrator:</div>' +
      '<input id="gpw" type="password" autocomplete="current-password" style="padding:10px;font-size:16px">' +
      '<button id="gbtn" style="padding:10px 18px;font-size:16px">Intră</button>' +
      '<div id="gerr" style="color:#f88"></div>';
    const go = async () => {
      const pw = document.getElementById("gpw");
      if (await sha(pw.value) === ADMIN_HASH) open();
      else { document.getElementById("gerr").textContent = "Parolă greșită"; pw.value = ""; }
    };
    document.getElementById("gbtn").onclick = go;
    document.getElementById("gpw").onkeydown = e => { if (e.key === "Enter") go(); };
    document.getElementById("gpw").focus();
  };

  (async () => {
    try {
      const c = new AbortController(); setTimeout(() => c.abort(), 4000);
      const r = await fetch("https://api.ipify.org?format=json", { signal: c.signal, cache: "no-store" });
      const { ip } = await r.json();
      if (ALLOWED_IPS.includes(ip)) return open();
    } catch (e) {}
    askAdmin();   // fara internet sau IP diferit -> cere parola
  })();
})();
