/* THM Полка — читалка. Подключается в каждый учебник одной строкой:
   <script src="../assets/reader.js" defer></script>
   Хранит всё в localStorage этого сайта, ключи начинаются с "thm-". */
(function () {
  "use strict";
  if (window.__thmReader) return;
  window.__thmReader = true;
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || new URL("../assets/reader.js", location.href).href;

  // ---------- хранилище ----------
  var BOOK = (location.pathname.split("/").pop() || "").replace(/\.html?$/, "") || "book";
  var KEY = "thm-reader:" + BOOK;
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var st = get(KEY, {});
  st.bookmarks = st.bookmarks || [];
  st.marks = st.marks || [];
  st.seen = st.seen || {};
  st.quiz = st.quiz || {};
  st.readSecs = st.readSecs || 0;
  st.dwell = st.dwell || {};
  if (!st.firstOpen) st.firstOpen = new Date().toISOString();
  var prefs = get("thm-reader:prefs", { night: false, zoom: 1, rate: 1 });
  if (prefs.terms == null) prefs.terms = true;
  if (prefs.logs == null) prefs.logs = true;
  function save() { st.lastOpen = new Date().toISOString(); put(KEY, st); summary(); }

  // ---------- структура учебника ----------
  var root = document.querySelector("main.content") || document.querySelector("main") || document.querySelector(".wrap") || document.body;
  var chapters = Array.prototype.filter.call(document.querySelectorAll("h1[id], h2[id]"), function (h) {
    return !h.closest("nav,aside,.toc,.side,#thmr,#thmr-head");
  });
  function chTitle(h) { return (h.textContent || "").replace(/\s+/g, " ").trim(); }
  function bookTitle() { return (document.title || BOOK).replace(/^Учебник:\s*/, ""); }
  function quizEls() { return document.querySelectorAll(".qz, .quiz .q"); }

  function summary() {
    var all = get("thm-reader:summary", {});
    var seen = chapters.filter(function (h) { return st.seen[h.id]; }).length;
    var qTotal = quizEls().length, qDone = 0, qOk = 0;
    Object.keys(st.quiz).forEach(function (k) { qDone++; if (st.quiz[k]) qOk++; });
    all[BOOK] = {
      title: bookTitle(), chapters: chapters.length, seen: seen,
      quizTotal: qTotal, quizDone: qDone, quizOk: qOk,
      lastOpen: st.lastOpen, lastCh: st.pos && st.pos.title || "", readSecs: st.readSecs,
      bookmarks: st.bookmarks.length, marks: st.marks.length
    };
    put("thm-reader:summary", all);
  }

  // ---------- стили ----------
  var css = document.createElement("style");
  css.textContent = [
    "#thmr,#thmr *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;letter-spacing:normal;text-transform:none}",
    "#thmr{--r-bg:#ffffff;--r-fg:#16212e;--r-mut:#5b6876;--r-line:#d5dbe2;--r-acc:#c2620a;--r-soft:#fbe9d6;color:var(--r-fg)}",
    "@media (prefers-color-scheme:dark){#thmr{--r-bg:#17202a;--r-fg:#e3e9ef;--r-mut:#93a1af;--r-line:#2a3644;--r-acc:#f0954a;--r-soft:#3a2716}}",
    "html[data-theme=dark] #thmr{--r-bg:#17202a;--r-fg:#e3e9ef;--r-mut:#93a1af;--r-line:#2a3644;--r-acc:#f0954a;--r-soft:#3a2716}",
    "html[data-theme=light] #thmr{--r-bg:#ffffff;--r-fg:#16212e;--r-mut:#5b6876;--r-line:#d5dbe2;--r-acc:#c2620a;--r-soft:#fbe9d6}",
    "#thmr-fab{position:fixed;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2147483000;width:52px;height:52px;border-radius:50%;border:1px solid var(--r-line);background:var(--r-bg);color:var(--r-acc);font-size:17px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,.18);cursor:pointer}",
    "#thmr-panel{position:fixed;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(78px + env(safe-area-inset-bottom,0px));z-index:2147483001;width:min(340px,calc(100vw - 32px));max-height:min(72vh,620px);overflow:auto;background:var(--r-bg);border:1px solid var(--r-line);border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);padding:14px;display:flex;flex-direction:column;gap:12px;font-size:14px;line-height:1.4}",
    "#thmr .t-h{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--r-mut);font-weight:600}",
    "#thmr .t-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}",
    "#thmr button.t-b{border:1px solid var(--r-line);background:transparent;color:var(--r-fg);border-radius:8px;padding:7px 10px;font-size:13px;cursor:pointer;line-height:1.2}",
    "#thmr button.t-b[aria-pressed=true]{background:var(--r-soft);border-color:var(--r-acc);font-weight:600}",
    "#thmr button.t-b.acc{background:var(--r-acc);border-color:var(--r-acc);color:var(--r-bg);font-weight:600}",
    "#thmr button.t-b:focus-visible,#thmr-fab:focus-visible{outline:2px solid var(--r-acc);outline-offset:2px}",
    "#thmr .t-list{display:flex;flex-direction:column;gap:4px;margin:0;padding:0;list-style:none}",
    "#thmr .t-list li{display:flex;gap:6px;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--r-line);padding:6px 0}",
    "#thmr .t-list a{color:var(--r-fg);text-decoration:none;min-width:0;overflow-wrap:anywhere}",
    "#thmr .t-list a:hover{color:var(--r-acc)}",
    "#thmr .t-list small{display:block;color:var(--r-mut);font-size:12px}",
    "#thmr .t-x{border:none;background:none;color:var(--r-mut);cursor:pointer;font-size:16px;line-height:1;padding:2px 4px}",
    "#thmr .t-mut{color:var(--r-mut);font-size:12px}",
    "#thmr .t-bar{height:5px;border-radius:3px;background:var(--r-line);overflow:hidden}#thmr .t-bar i{display:block;height:100%;background:var(--r-acc)}",
    "#thmr a.t-home{color:var(--r-acc);font-weight:600;text-decoration:none;font-size:13px}",
    "#thmr-sel{position:absolute;z-index:2147483002;display:flex;gap:4px;background:var(--r-bg);border:1px solid var(--r-line);border-radius:8px;padding:4px;box-shadow:0 4px 16px rgba(0,0,0,.2)}",
    "#thmr-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:2147483001;background:var(--r-bg);border:1px solid var(--r-line);border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.2);padding:10px 12px;display:flex;gap:10px;align-items:center;max-width:calc(100vw - 32px);font-size:14px}",
    "#thmr-toast span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    "#thmr textarea{width:100%;min-height:60px;border:1px solid var(--r-line);border-radius:8px;background:transparent;color:var(--r-fg);padding:6px 8px;font-size:13px}",
    "mark.thmr-m{background:rgba(255,196,0,.42);color:inherit;border-radius:2px;padding:0 1px;cursor:pointer}",
    "mark.thmr-m.has-note{box-shadow:inset 0 -2px 0 rgba(194,98,10,.9)}",
    ".thmr-speaking{outline:2px solid rgba(240,149,74,.7);outline-offset:4px;border-radius:4px}",
    "#thmr-night{position:fixed;inset:0;pointer-events:none;z-index:2147482999;background:rgba(255,140,40,.13);mix-blend-mode:multiply}",
    "#thmr-head,#thmr-tip,#thmr-done,#thmr-map{--r-bg:#ffffff;--r-fg:#16212e;--r-mut:#5b6876;--r-line:#d5dbe2;--r-acc:#c2620a;--r-soft:#fbe9d6;--r-ok:#2e8a57}",
    "@media (prefers-color-scheme:dark){#thmr-head,#thmr-tip,#thmr-done,#thmr-map{--r-bg:#17202a;--r-fg:#e3e9ef;--r-mut:#93a1af;--r-line:#2a3644;--r-acc:#f0954a;--r-soft:#3a2716;--r-ok:#4fb27a}}",
    "html[data-theme=dark] #thmr-head,html[data-theme=dark] #thmr-tip,html[data-theme=dark] #thmr-done,html[data-theme=dark] #thmr-map{--r-bg:#17202a;--r-fg:#e3e9ef;--r-mut:#93a1af;--r-line:#2a3644;--r-acc:#f0954a;--r-soft:#3a2716;--r-ok:#4fb27a}",
    "html[data-theme=light] #thmr-head,html[data-theme=light] #thmr-tip,html[data-theme=light] #thmr-done,html[data-theme=light] #thmr-map{--r-bg:#ffffff;--r-fg:#16212e;--r-mut:#5b6876;--r-line:#d5dbe2;--r-acc:#c2620a;--r-soft:#fbe9d6;--r-ok:#2e8a57}",
    "#thmr-head,#thmr-head *,#thmr-tip,#thmr-tip *,#thmr-done,#thmr-done *{box-sizing:border-box;font-family:'Golos Text',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;letter-spacing:normal;text-transform:none}",
    "#thmr-head{--hb:#55606c;position:relative;z-index:40;background:var(--r-bg);color:var(--r-fg);border-bottom:1px solid var(--r-line);border-top:4px solid var(--hb);padding-top:env(safe-area-inset-top,0px)}",
    "#thmr-head .h-in{display:flex;align-items:center;gap:10px 14px;min-height:50px;padding-block:6px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));max-width:1280px;margin:0 auto}",
    "#thmr-head a,#thmr-head button{color:var(--r-fg);text-decoration:none;font-size:13px}",
    "#thmr-head .h-home{font-weight:700;color:var(--r-acc);white-space:nowrap}",
    "#thmr-head .h-title{min-width:0;display:flex;flex-direction:column;line-height:1.2;padding-left:14px;border-left:1px solid var(--r-line)}",
    "#thmr-head .h-title small{font-size:11px;color:var(--r-mut);font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:.06em}",
    "#thmr-head .h-title b{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "#thmr-head .h-sp{flex:1}",
    "#thmr-head .h-btn{border:1px solid var(--r-line);background:transparent;border-radius:999px;padding:5px 12px;cursor:pointer;white-space:nowrap}",
    "#thmr-head .h-btn[aria-pressed=true]{background:var(--r-soft);border-color:var(--r-acc);font-weight:600}",
    "#thmr-head .h-btn:focus-visible,#thmr-head a:focus-visible{outline:2px solid var(--r-acc);outline-offset:2px}",
    "#thmr-head .h-ring{position:relative;width:38px;height:38px;flex:0 0 38px}",
    "#thmr-head .h-ring svg{width:38px;height:38px;transform:rotate(-90deg)}",
    "#thmr-head .h-ring circle{fill:none;stroke-width:3.2}",
    "#thmr-head .h-ring .bg{stroke:var(--r-line)}",
    "#thmr-head .h-ring .fg{stroke:var(--r-acc);stroke-linecap:round;stroke-dasharray:0 100;transition:stroke-dasharray .9s cubic-bezier(.2,.8,.2,1)}",
    "#thmr-head .h-ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:10px;font-weight:700;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace}",
    "@media (max-width:640px){#thmr-head .h-title small{display:none}#thmr-head a.h-btn{display:none}#thmr-head .h-in{gap:8px 10px}#thmr-head .h-title{padding-left:10px}}",
    "#thmr-done{position:fixed;left:calc(16px + env(safe-area-inset-left,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:2147483000;display:flex;align-items:center;gap:10px;background:var(--r-bg);color:var(--r-fg);border:1px solid var(--r-line);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.2);padding:10px 14px 14px;max-width:min(360px,calc(100vw - 100px));overflow:hidden;animation:thmr-in .35s cubic-bezier(.2,.8,.2,1)}",
    "#thmr-done.out{opacity:0;transform:translateY(8px);transition:opacity .35s,transform .35s}",
    "#thmr-done svg{flex:0 0 26px;width:26px;height:26px}",
    "#thmr-done circle{fill:var(--r-ok);opacity:.16}",
    "#thmr-done path{fill:none;stroke:var(--r-ok);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:20;stroke-dashoffset:20;animation:thmr-draw .5s .15s ease forwards}",
    "#thmr-done .d-t{min-width:0;display:flex;flex-direction:column;font-size:13px;line-height:1.3}",
    "#thmr-done .d-t small{color:var(--r-mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "#thmr-done i{position:absolute;left:0;bottom:0;height:3px;background:var(--r-acc);width:var(--p1);animation:thmr-grow 1.1s .2s cubic-bezier(.2,.8,.2,1) both}",
    "@keyframes thmr-in{from{opacity:0;transform:translateY(10px)}}",
    "@keyframes thmr-draw{to{stroke-dashoffset:0}}",
    "@keyframes thmr-grow{from{width:var(--p0)}to{width:var(--p1)}}",
    ".thmr-term{border-bottom:1.5px dotted rgba(194,98,10,.75);cursor:help;border-radius:1px}",
    ".thmr-term:hover,.thmr-term:focus{background:rgba(240,149,74,.14);outline:none}",
    "html.thmr-noterms .thmr-term{border-bottom:none;cursor:inherit;background:none}",
    "#thmr-tip{position:absolute;z-index:2147483002;display:none;background:var(--r-bg);color:var(--r-fg);border:1px solid var(--r-line);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.22);padding:10px 12px;font-size:13px;line-height:1.35;width:max-content;max-width:min(320px,calc(100vw - 16px))}",
    "#thmr-tip div{display:flex;gap:8px;padding:2px 0}",
    "#thmr-tip span{flex:0 0 22px;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:10px;color:var(--r-mut);padding-top:2px}",
    "#thmr-tip a{display:block;margin-top:6px;color:var(--r-acc);text-decoration:none;font-size:12px}",
    "pre.thmr-lg-lt .lg-ip{color:#1d5fb4}pre.thmr-lg-lt .lg-ts{color:#6b4fa8}pre.thmr-lg-lt .lg-evt{color:#b45309;font-weight:700}pre.thmr-lg-lt .lg-hash{color:#0f766e}pre.thmr-lg-lt .lg-url,pre.thmr-lg-lt .lg-dom{color:#0e7490;text-decoration:underline dotted}pre.thmr-lg-lt .lg-bad{color:#b42318;font-weight:700}pre.thmr-lg-lt .lg-good{color:#15803d;font-weight:700}pre.thmr-lg-lt .lg-s2{color:#15803d}pre.thmr-lg-lt .lg-s4{color:#b45309;font-weight:700}pre.thmr-lg-lt .lg-s5{color:#b42318;font-weight:700}",
    "pre.thmr-lg-dk .lg-ip{color:#7cb7ff}pre.thmr-lg-dk .lg-ts{color:#c4a7ff}pre.thmr-lg-dk .lg-evt{color:#ffb35c;font-weight:700}pre.thmr-lg-dk .lg-hash{color:#5ad1c1}pre.thmr-lg-dk .lg-url,pre.thmr-lg-dk .lg-dom{color:#67d4f0;text-decoration:underline dotted}pre.thmr-lg-dk .lg-bad{color:#ff8a80;font-weight:700}pre.thmr-lg-dk .lg-good{color:#7ee2a0;font-weight:700}pre.thmr-lg-dk .lg-s2{color:#7ee2a0}pre.thmr-lg-dk .lg-s4{color:#ffb35c;font-weight:700}pre.thmr-lg-dk .lg-s5{color:#ff8a80;font-weight:700}",
    ".thmr-lg.lg-method{font-weight:700}.thmr-lg.lg-com{opacity:.62;font-style:italic}",
    "html.thmr-nologs .thmr-lg{color:inherit!important;font-weight:inherit!important;text-decoration:none!important;opacity:1!important;font-style:inherit!important}",
    "#thmr-map{position:fixed;right:calc(3px + env(safe-area-inset-right,0px));top:72px;bottom:92px;width:10px;z-index:2147482990;border-radius:5px;background:var(--r-line);opacity:.9}",
    "#thmr-map .seg{position:absolute;left:1px;right:1px;background:transparent;border-bottom:1px solid var(--r-bg);display:block}",
    "#thmr-map .seg.seen{background:var(--r-acc);opacity:.75}",
    "#thmr-map .seg:hover{background:var(--r-fg);opacity:.5}",
    "#thmr-map .bm{position:absolute;left:-3px;width:16px;height:4px;margin-top:-2px;background:var(--r-fg);border-radius:2px;pointer-events:none}",
    "#thmr-map .hl{position:absolute;left:-2px;width:5px;height:5px;margin-top:-2px;background:#e8b400;border-radius:50%;pointer-events:none}",
    "#thmr-map .vp{position:absolute;left:-3px;right:-3px;border:2px solid var(--r-fg);border-radius:4px;pointer-events:none;opacity:.55}",
    "@media (max-width:700px),(hover:none){#thmr-map{width:4px;top:auto;bottom:90px;height:40vh;pointer-events:none;opacity:.8}#thmr-map .bm{left:-2px;width:8px}#thmr-map .vp{left:-2px;right:-2px;border-width:1.5px}}",
    "html.thmr-focus .toc,html.thmr-focus #toc,html.thmr-focus aside.side,html.thmr-focus .topbar,html.thmr-focus .mtop,html.thmr-focus #menubtn,html.thmr-focus nav.progress,html.thmr-focus #pbar{display:none!important}",
    "html.thmr-focus .layout,html.thmr-focus .wrap{display:block!important}",
    "html.thmr-focus main.content,html.thmr-focus main{max-width:68ch!important;margin-left:auto!important;margin-right:auto!important;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}",
    "@media (prefers-reduced-motion:reduce){#thmr-done,#thmr-done *,#thmr-head .h-ring .fg{animation:none!important;transition:none!important}#thmr-done path{stroke-dashoffset:0}}",
    "@media (prefers-reduced-motion:reduce){#thmr *{transition:none!important}}"
  ].join("\n");
  document.head.appendChild(css);

  var ui = document.createElement("div");
  ui.id = "thmr";
  document.body.appendChild(ui);
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---------- текущая глава и «продолжить» ----------
  function currentChapter() {
    var cur = null;
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i].getBoundingClientRect().top < window.innerHeight * 0.35) cur = chapters[i]; else break;
    }
    return cur;
  }
  var scrollT = null;
  window.addEventListener("scroll", function () {
    if (scrollT) return;
    scrollT = setTimeout(function () {
      scrollT = null;
      var h = currentChapter();
      if (h) {
        var top = h.getBoundingClientRect().top + window.scrollY;
        st.pos = { id: h.id, title: chTitle(h), off: Math.round(window.scrollY - top) };
      } else {
        st.pos = null;
      }
      save();
    }, 600);
  }, { passive: true });

  function goTo(id, off) {
    var h = document.getElementById(id);
    if (!h) return;
    var top = h.getBoundingClientRect().top + window.scrollY + (off || 0);
    window.scrollTo({ top: Math.max(0, top - (off ? 0 : 70)) });
  }

  function toast(text, btnLabel, fn) {
    var old = document.getElementById("thmr-toast");
    if (old) old.remove();
    var t = el("div", { id: "thmr-toast", role: "status" });
    t.appendChild(el("span", null, esc(text)));
    if (btnLabel) {
      var b = el("button", { type: "button", class: "t-b acc" }, esc(btnLabel));
      b.onclick = function () { t.remove(); fn(); };
      t.appendChild(b);
    }
    var x = el("button", { type: "button", class: "t-x", "aria-label": "Закрыть" }, "×");
    x.onclick = function () { t.remove(); };
    t.appendChild(x);
    ui.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, btnLabel ? 12000 : 2500);
  }

  // ---------- квизы ----------
  function quizKey(q) {
    var all = quizEls();
    return "q" + Array.prototype.indexOf.call(all, q);
  }
  document.addEventListener("click", function (e) {
    var o = e.target.closest && e.target.closest(".qz-o, .quiz .opt");
    if (!o) return;
    var q = o.closest(".qz, .q");
    if (!q) return;
    var k = quizKey(q);
    if (!(k in st.quiz)) {
      st.quiz[k] = o.getAttribute("data-ok") === "1";
      if (!st.quiz[k]) {
        var wrong = get("thm-reader:wrong", []);
        var qt = q.querySelector(".qz-q, .qtext");
        wrong.push({ book: BOOK, key: k, q: qt ? qt.textContent.trim().slice(0, 220) : "", at: new Date().toISOString() });
        put("thm-reader:wrong", wrong.slice(-300));
      }
      save();
    }
  }, true);

  // ---------- время и серия дней ----------
  var lastAct = Date.now();
  ["scroll", "keydown", "pointerdown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true });
  });
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  setInterval(function () {
    var speaking = tts.on && !tts.paused;
    if (document.hidden || (!speaking && Date.now() - lastAct > 90000)) return;
    var days = get("thm-reader:days", {});
    days[today()] = (days[today()] || 0) + 15;
    put("thm-reader:days", days);
    st.readSecs += 15;
    save();
  }, 15000);

  // ---------- шрифт и ночной режим ----------
  function applyPrefs() {
    root.style.zoom = prefs.zoom && prefs.zoom !== 1 ? String(prefs.zoom) : "";
    setTimeout(function () { if (typeof paintMap === "function") paintMap(); }, 60);
    var n = document.getElementById("thmr-night");
    if (prefs.night) {
      if (!document.documentElement.getAttribute("data-thmr-prev")) document.documentElement.setAttribute("data-thmr-prev", document.documentElement.getAttribute("data-theme") || "none");
      document.documentElement.setAttribute("data-theme", "dark");
      if (!n) document.body.appendChild(el("div", { id: "thmr-night", "aria-hidden": "true" }));
    } else {
      var prev = document.documentElement.getAttribute("data-thmr-prev");
      if (prev) {
        if (prev === "none") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", prev);
        document.documentElement.removeAttribute("data-thmr-prev");
      }
      if (n) n.remove();
    }
    put("thm-reader:prefs", prefs);
  }

  // ---------- хайлайты ----------
  function textIndex() {
    var nodes = [], text = "";
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || p.closest("#thmr, #thmr-head, script, style, noscript")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = w.nextNode())) { nodes.push({ n: n, s: text.length }); text += n.nodeValue; }
    return { nodes: nodes, text: text };
  }
  function wrapRange(idx, start, end, mark) {
    var made = [];
    idx.nodes.forEach(function (it) {
      var ns = it.s, ne = it.s + it.n.nodeValue.length;
      if (ne <= start || ns >= end) return;
      var a = Math.max(start, ns) - ns, b = Math.min(end, ne) - ns;
      if (!it.n.nodeValue.slice(a, b).trim()) return;
      var r = document.createRange();
      r.setStart(it.n, a); r.setEnd(it.n, b);
      var m = document.createElement("mark");
      m.className = "thmr-m" + (mark.note ? " has-note" : "");
      m.dataset.mid = mark.id;
      if (mark.note) m.title = mark.note;
      try { r.surroundContents(m); made.push(m); } catch (e) {}
    });
    return made;
  }
  function paintMark(mark, idx) {
    idx = idx || textIndex();
    var from = 0, pos = -1;
    for (var i = 0; i <= (mark.nth || 0); i++) {
      pos = idx.text.indexOf(mark.text, from);
      if (pos < 0) return false;
      from = pos + 1;
    }
    return wrapRange(idx, pos, pos + mark.text.length, mark).length > 0;
  }
  function unpaint(id) {
    document.querySelectorAll('mark.thmr-m[data-mid="' + id + '"]').forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
  }
  function paintAll() {
    st.marks.slice().sort(function (a, b) { return (b.nth || 0) - (a.nth || 0); }).forEach(function (m) {
      var ok = paintMark(m);
      m.lost = !ok;
    });
  }

  var selBox = null;
  function hideSel() { if (selBox) { selBox.remove(); selBox = null; } }
  function onSelect() {
    hideSel();
    var s = window.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return;
    var r = s.getRangeAt(0);
    if (!root.contains(r.commonAncestorContainer) || (r.commonAncestorContainer.parentNode && r.commonAncestorContainer.parentNode.closest && r.commonAncestorContainer.parentNode.closest("#thmr"))) return;
    var txt = s.toString().replace(/\s+$/, "").replace(/^\s+/, "");
    if (txt.length < 3 || txt.length > 1500) return;
    var rect = r.getBoundingClientRect();
    selBox = el("div", { id: "thmr-sel" });
    var b1 = el("button", { type: "button", class: "t-b" }, "Выделить");
    var b2 = el("button", { type: "button", class: "t-b" }, "+ Заметка");
    selBox.appendChild(b1); selBox.appendChild(b2);
    selBox.style.top = (window.scrollY + rect.top - 46) + "px";
    selBox.style.left = Math.max(8, Math.min(window.scrollX + rect.left, window.scrollX + document.documentElement.clientWidth - 200)) + "px";
    ui.appendChild(selBox);
    function make(withNote) {
      // какое по счёту вхождение этого текста выделено
      var idx = textIndex(), before = 0, i;
      if (r.startContainer.nodeType === 3) {
        for (i = 0; i < idx.nodes.length; i++) if (idx.nodes[i].n === r.startContainer) { before = idx.nodes[i].s + r.startOffset; break; }
      } else {
        for (i = 0; i < idx.nodes.length; i++) if (r.comparePoint(idx.nodes[i].n, 0) >= 0) { before = idx.nodes[i].s; break; }
      }
      var nth = 0, p = idx.text.indexOf(txt);
      while (p >= 0 && p < before) { nth++; p = idx.text.indexOf(txt, p + 1); }
      if (p < 0) nth = Math.max(0, nth - 1);
      var h = null;
      chapters.forEach(function (c) { if (c.compareDocumentPosition(r.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING) h = c; });
      var mark = { id: "m" + Date.now().toString(36), text: txt, nth: nth, ch: h ? h.id : "", chTitle: h ? chTitle(h) : "", note: "", at: new Date().toISOString() };
      st.marks.push(mark);
      s.removeAllRanges();
      paintMark(mark);
      save();
      hideSel();
      if (withNote) { openPanel("marks", mark); var t = document.getElementById("thmr-note"); if (t) t.focus(); }
    }
    b1.onclick = function () { make(false); };
    b2.onclick = function () { make(true); };
  }
  document.addEventListener("mouseup", function (e) { if (e.target.closest && e.target.closest("#thmr")) return; setTimeout(onSelect, 10); });
  document.addEventListener("touchend", function (e) { if (e.target.closest && e.target.closest("#thmr")) return; setTimeout(onSelect, 350); });
  document.addEventListener("selectionchange", function () { var s = window.getSelection(); if (!s || s.isCollapsed) setTimeout(function () { var s2 = window.getSelection(); if (!s2 || s2.isCollapsed) hideSel(); }, 200); });
  document.addEventListener("click", function (e) {
    var m = e.target.closest && e.target.closest("mark.thmr-m");
    if (!m) return;
    var mk = st.marks.filter(function (x) { return x.id === m.dataset.mid; })[0];
    if (mk) openPanel("marks", mk);
  });

  // ---------- озвучка ----------
  var tts = { on: false, paused: false, items: [], i: 0, cur: null };
  // лучшие голоса выше: нейроголоса Edge (Natural), затем улучшенные голоса macOS/iOS, затем Google
  function voiceScore(v) {
    var n = v.name;
    if (/Natural|Neural/i.test(n)) return 100 + (/Svetlana/i.test(n) ? 2 : /Dariya|Dmitry/i.test(n) ? 1 : 0);
    if (/Premium/i.test(n)) return 80;
    if (/Enhanced|улучш/i.test(n)) return 70;
    if (/Google/i.test(n)) return 50;
    if (/Milena|Yuri/i.test(n)) return 40;
    return 10;
  }
  function ruVoices() {
    var vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    return vs.filter(function (v) { return /^ru/i.test(v.lang); }).sort(function (a, b) { return voiceScore(b) - voiceScore(a); });
  }
  function ruVoice() {
    var vs = ruVoices();
    return vs.filter(function (v) { return v.name === prefs.voice; })[0] || vs[0] || null;
  }
  if (window.speechSynthesis) speechSynthesis.addEventListener("voiceschanged", function () { renderPanel(); });
  function speakBlocks() {
    var start = currentChapter() || chapters[0];
    var blocks = Array.prototype.filter.call(root.querySelectorAll("h2, h3, p, li, blockquote"), function (b) {
      if (b.closest("#thmr, nav, aside, .toc, pre, details:not([open]), [hidden], .qz-opts, .opts")) return false;
      if (b.tagName === "LI" && b.querySelector("p")) return false;
      if (!b.offsetParent && b.tagName !== "H2") return false;
      return (b.textContent || "").trim().length > 1;
    });
    if (start) blocks = blocks.filter(function (b) { return b === start || (start.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); });
    return blocks;
  }
  // Нейроголос Piper (Руслан) работает в отдельном потоке assets/piper-worker.js.
  var PIPER_ID = "ru_RU-ruslan-medium", PIPER = "piper:" + PIPER_ID;
  var SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
  function usePiper() { return (prefs.voice || PIPER) === PIPER && typeof Worker !== "undefined" && !tts.piperBroken; }
  function chunks(text) {
    text = text.replace(/[←-⇿☀-➿\uD83C-􏰀-\uDFFF]/g, " ").replace(/\s+/g, " ").trim();
    if (text.length <= 260) return text ? [text] : [];
    var out = [], cur = "";
    text.split(/(?<=[.!?…;:])\s+/).forEach(function (sen) {
      while (sen.length > 260) { var cut = sen.lastIndexOf(" ", 240); if (cut < 80) cut = 240; out.push((cur + " " + sen.slice(0, cut)).trim()); cur = ""; sen = sen.slice(cut); }
      if ((cur + " " + sen).length > 260) { if (cur) out.push(cur.trim()); cur = sen; } else cur = (cur + " " + sen).trim();
    });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function worker() {
    if (tts.worker) return tts.worker;
    var w = new Worker(new URL("piper-worker.js", SCRIPT_SRC), { type: "module" });
    tts.worker = w; tts.reqs = {}; tts.nextId = 1; tts.modelReady = false; tts.dl = {};
    tts.status = "Загружаю голос Руслана…";
    w.onmessage = function (e) {
      var m = e.data || {};
      if (m.type === "progress") {
        if (/\.onnx$/.test(m.url || "") && m.total) tts.status = "Скачиваю голос Руслана: " + Math.round(m.loaded / m.total * 100) + "% (один раз, ~60 МБ)";
        renderPanel();
      } else if (m.type === "ready") {
        tts.modelReady = true; tts.status = ""; renderPanel();
      } else if (m.type === "audio") {
        var r = tts.reqs[m.id]; delete tts.reqs[m.id];
        if (r) r.ok(URL.createObjectURL(new Blob([m.buf], { type: "audio/wav" })));
      } else if (m.type === "error") {
        var q = tts.reqs[m.id]; delete tts.reqs[m.id];
        if (!tts.modelReady) { piperFail(m.message); return; }
        if (q) q.fail(m.message);
      }
    };
    w.onerror = function (e) { piperFail(e && e.message); };
    w.postMessage({ type: "init", voiceId: PIPER_ID });
    return w;
  }
  function piperFail(msg) {
    if (tts.piperBroken) return;
    tts.piperBroken = true; tts.status = "";
    try { tts.worker && tts.worker.terminate(); } catch (e) {}
    tts.worker = null;
    Object.keys(tts.reqs || {}).forEach(function (k) { tts.reqs[k].fail(msg); });
    var wasOn = tts.on;
    ttsStop();
    toast("Руслан не загрузился (при первом запуске нужен интернет). Читаю голосом браузера.");
    if (wasOn && window.speechSynthesis) ttsStart();
  }
  function synth(i) {
    var it = tts.items[i];
    if (!it) return null;
    if (!it.p) it.p = new Promise(function (ok, fail) {
      var id = tts.nextId++;
      tts.reqs[id] = { ok: ok, fail: fail };
      worker().postMessage({ type: "speak", id: id, text: it.text, voiceId: PIPER_ID });
    });
    it.p.catch(function () {});
    return it.p;
  }
  function mark(it) {
    if (tts.cur && tts.cur !== it.el) tts.cur.classList.remove("thmr-speaking");
    tts.cur = it.el;
    it.el.classList.add("thmr-speaking");
    var r = it.el.getBoundingClientRect();
    if (r.top < 60 || r.bottom > window.innerHeight - 90) it.el.scrollIntoView({ block: "center" });
  }
  function finish() {
    if (tts.cur) tts.cur.classList.remove("thmr-speaking");
    tts.on = false; tts.paused = false; tts.cur = null; renderPanel();
  }
  function playItem(i) {
    if (!tts.on) return;
    if (i >= tts.items.length) { finish(); return; }
    tts.i = i;
    var it = tts.items[i], run = tts.run;
    mark(it);
    if (tts.engine === "piper") {
      synth(i + 1); synth(i + 2);
      synth(i).then(function (url) {
        if (!tts.on || run !== tts.run || tts.i !== i) return;
        var a = tts.audio;
        a.src = url; a.playbackRate = prefs.rate || 1;
        a.onended = function () { URL.revokeObjectURL(url); if (tts.on && run === tts.run) playItem(i + 1); };
        var pr = a.play(); if (pr && pr.catch) pr.catch(function () { tts.paused = true; renderPanel(); });
      }, function () { if (tts.on && run === tts.run) playItem(i + 1); });
    } else {
      var u = new SpeechSynthesisUtterance(it.text);
      var v = ruVoice();
      if (v) u.voice = v;
      u.lang = "ru-RU"; u.rate = prefs.rate || 1;
      u.onend = function () { if (tts.on && run === tts.run) playItem(i + 1); };
      u.onerror = function () { if (tts.on && run === tts.run) playItem(i + 1); };
      speechSynthesis.speak(u);
    }
  }
  function ttsStart(fromIndex) {
    var piper = usePiper();
    if (!piper && !window.speechSynthesis) { toast("Этот браузер не умеет читать вслух"); return; }
    ttsStop(true);
    tts.engine = piper ? "piper" : "browser";
    tts.items = [];
    speakBlocks().forEach(function (b) {
      var txt = (b.textContent || "").replace(/\s+/g, " ").trim();
      (piper ? chunks(txt) : [txt]).forEach(function (t) { if (t) tts.items.push({ el: b, text: t }); });
    });
    tts.on = true; tts.paused = false; tts.run = (tts.run || 0) + 1;
    if (piper) {
      if (!tts.audio) tts.audio = new Audio();
      tts.audio.src = SILENT;
      var pr = tts.audio.play(); if (pr && pr.catch) pr.catch(function () {});
      worker();
    }
    playItem(fromIndex || 0);
    renderPanel();
  }
  function ttsStop(quiet) {
    tts.on = false; tts.paused = false; tts.run = (tts.run || 0) + 1;
    if (tts.audio) { tts.audio.onended = null; tts.audio.pause(); }
    if (window.speechSynthesis) speechSynthesis.cancel();
    (tts.items || []).forEach(function (it) { if (it.p) it.p.then(function (u) { URL.revokeObjectURL(u); }, function () {}); });
    tts.items = [];
    if (tts.cur) tts.cur.classList.remove("thmr-speaking");
    tts.cur = null;
    if (!quiet) renderPanel();
  }
  function ttsPause() {
    if (!tts.on) return;
    if (tts.engine === "piper") {
      if (tts.audio.paused) { tts.audio.play(); tts.paused = false; } else { tts.audio.pause(); tts.paused = true; }
    } else {
      if (speechSynthesis.paused) { speechSynthesis.resume(); tts.paused = false; } else { speechSynthesis.pause(); tts.paused = true; }
    }
    renderPanel();
  }

  // ---------- панель ----------
  var fab = el("button", { id: "thmr-fab", type: "button", "aria-label": "Читалка: закладки, заметки, озвучка, шрифт", "aria-expanded": "false" }, "Aa");
  ui.appendChild(fab);
  var panel = null, view = "main", editMark = null;
  fab.onclick = function () { if (panel) closePanel(); else openPanel("main"); };
  function closePanel() { if (panel) panel.remove(); panel = null; fab.setAttribute("aria-expanded", "false"); }
  function openPanel(v, mk) { view = v || "main"; editMark = mk || null; renderPanel(true); }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closePanel(); hideSel(); } });

  function renderPanel(force) {
    if (!panel && !force) return;
    if (!panel) { panel = el("div", { id: "thmr-panel", role: "dialog", "aria-label": "Читалка" }); ui.appendChild(panel); fab.setAttribute("aria-expanded", "true"); }
    var h = [];
    if (view === "marks") {
      h.push('<div class="t-row" style="justify-content:space-between"><span class="t-h">Мои выделения · ' + st.marks.length + '</span><button class="t-b" data-a="back">← Назад</button></div>');
      if (editMark) {
        h.push('<div><div class="t-mut">' + esc(editMark.chTitle) + '</div><div style="margin:4px 0 6px">«' + esc(editMark.text.slice(0, 200)) + (editMark.text.length > 200 ? "…" : "") + '»</div>' +
          '<textarea id="thmr-note" placeholder="Твоя заметка к этому месту">' + esc(editMark.note) + '</textarea>' +
          '<div class="t-row" style="margin-top:6px"><button class="t-b acc" data-a="note-save">Сохранить</button><button class="t-b" data-a="mark-del" data-id="' + esc(editMark.id) + '">Убрать выделение</button></div></div>');
      }
      if (!st.marks.length) h.push('<div class="t-mut">Выдели текст в учебнике, и появится кнопка «Выделить» или «+ Заметка».</div>');
      else h.push('<ul class="t-list">' + st.marks.map(function (m) {
        return '<li><a href="#" data-a="mark-go" data-id="' + esc(m.id) + '">«' + esc(m.text.slice(0, 90)) + (m.text.length > 90 ? "…" : "") + '»<small>' + esc(m.chTitle) + (m.note ? " · " + esc(m.note.slice(0, 80)) : "") + (m.lost ? " · текст изменился, не нашёл" : "") + '</small></a><button class="t-x" data-a="mark-del" data-id="' + esc(m.id) + '" aria-label="Удалить">×</button></li>';
      }).join("") + "</ul>");
    } else {
      var seen = chapters.filter(function (c) { return st.seen[c.id]; }).length;
      var pct = chapters.length ? Math.round(seen / chapters.length * 100) : 0;
      var qk = Object.keys(st.quiz), qok = qk.filter(function (k) { return st.quiz[k]; }).length;
      h.push('<div class="t-row" style="justify-content:space-between"><a class="t-home" href="../">← Полка</a><span class="t-mut">' + pct + "% · разделов " + seen + "/" + chapters.length + (quizEls().length ? " · квизы " + qok + "/" + quizEls().length : "") + '</span></div>');
      h.push('<div class="t-bar"><i style="width:' + pct + '%"></i></div>');
      h.push('<div class="t-h">Закладки</div>');
      h.push('<div class="t-row"><button class="t-b" data-a="bm-add">+ Закладка сюда</button></div>');
      if (st.bookmarks.length) h.push('<ul class="t-list">' + st.bookmarks.map(function (b, i) {
        return '<li><a href="#" data-a="bm-go" data-i="' + i + '">' + esc(b.title) + "</a><button class=\"t-x\" data-a=\"bm-del\" data-i=\"" + i + '" aria-label="Удалить закладку">×</button></li>';
      }).join("") + "</ul>");
      h.push('<div class="t-row" style="justify-content:space-between"><span class="t-h">Выделения и заметки</span><button class="t-b" data-a="marks">Открыть · ' + st.marks.length + "</button></div>");
      h.push('<div class="t-h">Озвучка</div>');
      if (!window.speechSynthesis && typeof Worker === "undefined") h.push('<div class="t-mut">Этот браузер не умеет читать вслух.</div>');
      else {
        h.push('<div class="t-row">' + (tts.on
          ? '<button class="t-b" data-a="tts-pause">' + (tts.paused ? "▶ Дальше" : "❚❚ Пауза") + '</button><button class="t-b" data-a="tts-stop">■ Стоп</button>'
          : '<button class="t-b acc" data-a="tts-start">▶ Читать с этой главы</button>') + "</div>");
        if (tts.status && tts.engine === "piper" && tts.on) h.push('<div class="t-mut">' + esc(tts.status) + "</div>");
        var vs = ruVoices(), cur = prefs.voice || PIPER;
        var opts = (typeof Worker !== "undefined" && !tts.piperBroken ? '<option value="' + PIPER + '"' + (cur === PIPER ? " selected" : "") + ">Руслан · нейроголос</option>" : "") +
          vs.map(function (v) { return '<option value="' + esc(v.name) + '"' + (cur === v.name ? " selected" : "") + ">" + esc(v.name.replace(/^Microsoft /, "").replace(/ - Russian \(Russia\)/, "")) + " · браузер</option>"; }).join("");
        if (opts) h.push('<label class="t-mut" for="thmr-voice" style="display:flex;flex-direction:column;gap:4px">Голос<select id="thmr-voice" style="font-size:13px;padding:6px;border-radius:8px;border:1px solid var(--r-line);background:transparent;color:var(--r-fg)">' + opts + "</select></label>");
        h.push('<div class="t-row"><span class="t-mut">Скорость</span>' + [0.8, 1, 1.2, 1.5].map(function (r) {
          return '<button class="t-b" data-a="rate" data-v="' + r + '" aria-pressed="' + (prefs.rate === r) + '">' + r + "×</button>";
        }).join("") + "</div>");
      }
      h.push('<div class="t-h">Чтение</div>');
      h.push('<div class="t-row"><button class="t-b" data-a="z-" aria-label="Мельче">A−</button><span class="t-mut">' + Math.round((prefs.zoom || 1) * 100) + '%</span><button class="t-b" data-a="z+" aria-label="Крупнее">A+</button>' +
        '<button class="t-b" data-a="night" aria-pressed="' + !!prefs.night + '">Ночной режим</button></div>');
      h.push('<div class="t-row"><button class="t-b" data-a="focus" aria-pressed="' + !!prefs.focus + '">Режим фокуса</button>' +
        '<button class="t-b" data-a="terms" aria-pressed="' + !!prefs.terms + '">Подсказки терминов</button>' +
        '<button class="t-b" data-a="logs" aria-pressed="' + !!prefs.logs + '">Подсветка логов</button></div>');
    }
    panel.innerHTML = h.join("");
  }

  ui.addEventListener("change", function (e) {
    if (e.target.id !== "thmr-voice") return;
    prefs.voice = e.target.value; put("thm-reader:prefs", prefs);
    if (tts.on) { var el0 = tts.items[tts.i] && tts.items[tts.i].el; ttsStart(); }
  });
  ui.addEventListener("click", function (e) {
    var b = e.target.closest("[data-a]");
    if (!b || !ui.contains(b)) return;
    var a = b.getAttribute("data-a");
    if (b.tagName === "A") e.preventDefault();
    if (a === "back") { view = "main"; editMark = null; }
    else if (a === "marks") { view = "marks"; editMark = null; }
    else if (a === "bm-add") {
      var c = currentChapter();
      var bmId = c ? c.id : "", bmTitle = c ? chTitle(c) : "Начало учебника";
      if (!st.bookmarks.some(function (x) { return x.id === bmId; })) {
        var off = c ? Math.round(window.scrollY - (c.getBoundingClientRect().top + window.scrollY)) : Math.round(window.scrollY);
        st.bookmarks.push({ id: bmId, title: bmTitle, off: off, at: new Date().toISOString() });
        save();
        var all = get("thm-reader:bookmarks", []);
        all.push({ book: BOOK, bookTitle: bookTitle(), id: bmId, title: bmTitle, at: new Date().toISOString() });
        put("thm-reader:bookmarks", all);
      }
    }
    else if (a === "bm-go") { var bm = st.bookmarks[+b.dataset.i]; if (bm) { if (bm.id) goTo(bm.id, bm.off); else window.scrollTo({ top: bm.off || 0 }); closePanel(); return; } }
    else if (a === "bm-del") {
      var gone = st.bookmarks.splice(+b.dataset.i, 1)[0]; save();
      if (gone) put("thm-reader:bookmarks", get("thm-reader:bookmarks", []).filter(function (x) { return !(x.book === BOOK && x.id === gone.id); }));
    }
    else if (a === "mark-go") {
      var m = document.querySelector('mark.thmr-m[data-mid="' + b.dataset.id + '"]');
      if (m) { m.scrollIntoView({ block: "center" }); closePanel(); return; }
      var mk = st.marks.filter(function (x) { return x.id === b.dataset.id; })[0];
      if (mk && mk.ch) { goTo(mk.ch); closePanel(); return; }
    }
    else if (a === "mark-del") {
      unpaint(b.dataset.id);
      st.marks = st.marks.filter(function (x) { return x.id !== b.dataset.id; });
      if (editMark && editMark.id === b.dataset.id) editMark = null;
      save();
    }
    else if (a === "note-save" && editMark) {
      var t = document.getElementById("thmr-note");
      editMark.note = t ? t.value.trim() : "";
      document.querySelectorAll('mark.thmr-m[data-mid="' + editMark.id + '"]').forEach(function (m) { m.classList.toggle("has-note", !!editMark.note); m.title = editMark.note; });
      save(); editMark = null;
    }
    else if (a === "tts-start") ttsStart();
    else if (a === "tts-stop") ttsStop();
    else if (a === "tts-pause") ttsPause();
    else if (a === "rate") { prefs.rate = +b.dataset.v; put("thm-reader:prefs", prefs); if (tts.on) { if (tts.engine === "piper") tts.audio.playbackRate = prefs.rate; else { var keep = tts.i; ttsStart(); } } }
    else if (a === "z-") { prefs.zoom = Math.max(0.8, Math.round(((prefs.zoom || 1) - 0.1) * 10) / 10); applyPrefs(); }
    else if (a === "z+") { prefs.zoom = Math.min(1.6, Math.round(((prefs.zoom || 1) + 0.1) * 10) / 10); applyPrefs(); }
    else if (a === "night") { prefs.night = !prefs.night; applyPrefs(); }
    else if (a === "focus") { prefs.focus = !prefs.focus; applyFocus(); }
    else if (a === "terms") { prefs.terms = !prefs.terms; applyToggles(); }
    else if (a === "logs") { prefs.logs = !prefs.logs; applyToggles(); }
    renderPanel();
  });


  // ---------- прочитанные разделы ----------
  // Раздел засчитывается, когда ты дошёл до следующего заголовка и провёл в разделе хоть немного времени
  // (примерно треть от времени спокойного чтения, от 4 до 90 секунд). Быстрая прокрутка не считается.
  var words = {};
  function measure() {
    chapters.forEach(function (h, i) {
      try {
        var r = document.createRange(); r.setStartBefore(h);
        if (chapters[i + 1]) r.setEndBefore(chapters[i + 1]); else r.setEndAfter(root.lastChild || root);
        words[h.id] = (r.toString().match(/\S+/g) || []).length;
      } catch (e) { words[h.id] = 100; }
    });
  }
  function need(id) { return Math.max(4, Math.min(90, Math.round((words[id] || 0) / 11))); }
  function seenCount() { return chapters.filter(function (c) { return st.seen[c.id]; }).length; }
  function markSeen(h) {
    if (st.seen[h.id]) return;
    var before = seenCount();
    st.seen[h.id] = 1;
    var n = before + 1;
    announce(h, before, n);
    if (n >= chapters.length && !st.doneAt) { st.doneAt = new Date().toISOString(); celebrate(); }
    save(); updateHead(true); paintMap();
  }
  function checkSeen() {
    var vh = window.innerHeight, atEnd = vh + window.scrollY >= document.documentElement.scrollHeight - 80;
    chapters.forEach(function (h, i) {
      if (st.seen[h.id] || (st.dwell[h.id] || 0) < need(h.id)) return;
      var next = chapters[i + 1];
      if (next ? next.getBoundingClientRect().top < vh * 0.9 : atEnd) markSeen(h);
    });
  }
  setInterval(function () {
    var speaking = tts.on && !tts.paused;
    if (document.hidden || (!speaking && Date.now() - lastAct > 90000)) return;
    var h = currentChapter() || (window.scrollY < 200 ? chapters[0] : null);
    if (!h) return;
    st.dwell[h.id] = (st.dwell[h.id] || 0) + 1;
    checkSeen();
  }, 1000);
  window.addEventListener("scroll", function () { if (!checkSeen.t) checkSeen.t = setTimeout(function () { checkSeen.t = null; checkSeen(); }, 250); }, { passive: true });

  function announce(h, before, n) {
    var old = document.getElementById("thmr-done"); if (old) old.remove();
    var p0 = Math.round(before / chapters.length * 100), p1 = Math.round(n / chapters.length * 100);
    var p = el("div", { id: "thmr-done", role: "status" },
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7 12.5l3.2 3.2L17 9"/></svg>' +
      '<span class="d-t"><b>Раздел прочитан · ' + n + "/" + chapters.length + '</b><small>' + esc(chTitle(h)) + '</small></span>' +
      '<i style="--p0:' + p0 + '%;--p1:' + p1 + '%"></i>');
    ui.appendChild(p);
    setTimeout(function () { p.classList.add("out"); setTimeout(function () { p.remove(); }, 400); }, 2800);
  }
  function loadFx(cb) {
    if (window.THMFX) return cb();
    var sc = document.createElement("script"); sc.src = new URL("fx.js", SCRIPT_SRC).href; sc.onload = cb; document.head.appendChild(sc);
  }
  function celebrate() { loadFx(function () { THMFX.confetti(); THMFX.toast("Учебник дочитан до конца!"); }); }

  // ---------- единая шапка ----------
  var BIND = { "01 Pre Security": "#2f6b5a", "02 Cyber Security 101": "#2c4f7c", "03 SOC Level 1": "#8a3b2e", "04 SOC Level 2": "#5a3f78", "05 Defending Azure": "#1f6f86" };
  var hd = null;
  function head() {
    hd = el("div", { id: "thmr-head" });
    hd.innerHTML = '<div class="h-in"><a class="h-home" href="../">← THM Полка</a><span class="h-title"><small></small><b>' + esc(bookTitle()) + '</b></span>' +
      '<span class="h-sp"></span><a class="h-btn" href="../search.html">Поиск</a><button type="button" class="h-btn" data-h="focus" aria-pressed="false">Фокус</button>' +
      '<span class="h-ring" title="Прочитано разделов"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="bg" cx="18" cy="18" r="15.9"/><circle class="fg" cx="18" cy="18" r="15.9"/></svg><b>0%</b></span></div>';
    document.body.insertBefore(hd, document.body.firstChild);
    hd.addEventListener("click", function (e) {
      var b = e.target.closest("[data-h]"); if (!b) return;
      if (b.dataset.h === "focus") { prefs.focus = !prefs.focus; applyFocus(); renderPanel(); }
    });
    fetch(new URL("../books.json", location.href)).then(function (r) { return r.json(); }).then(function (list) {
      var m = list.filter(function (b) { return b.id === BOOK; })[0]; if (!m) return;
      hd.querySelector(".h-title b").textContent = m.title;
      hd.querySelector(".h-title small").textContent = (m.path || "").replace(/^\d+\s+/, "");
      if (BIND[m.path]) hd.style.setProperty("--hb", BIND[m.path]);
    }).catch(function () {});
  }
  function updateHead(anim) {
    if (!hd) return;
    var pct = chapters.length ? Math.round(seenCount() / chapters.length * 100) : 0;
    var fg = hd.querySelector(".fg"); fg.style.strokeDasharray = pct + " 100";
    if (!anim) fg.style.transition = "none"; else fg.style.transition = "";
    hd.querySelector(".h-ring b").textContent = pct + "%";
    hd.querySelector(".h-ring").title = "Прочитано разделов: " + seenCount() + " из " + chapters.length;
  }

  // ---------- режим фокуса и переключатели ----------
  function applyFocus() {
    document.documentElement.classList.toggle("thmr-focus", !!prefs.focus);
    if (hd) hd.querySelector('[data-h="focus"]').setAttribute("aria-pressed", String(!!prefs.focus));
    put("thm-reader:prefs", prefs);
    setTimeout(paintMap, 80);
  }
  function applyToggles() {
    document.documentElement.classList.toggle("thmr-noterms", !prefs.terms);
    document.documentElement.classList.toggle("thmr-nologs", !prefs.logs);
    if (!prefs.terms) hideTip();
    put("thm-reader:prefs", prefs);
  }
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (e.metaKey || e.ctrlKey || e.altKey || (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable))) return;
    if (e.key === "f" || e.key === "а") { prefs.focus = !prefs.focus; applyFocus(); renderPanel(); }
  });

  // ---------- подсветка логов ----------
  var LOG = null;
  try {
    LOG = new RegExp([
      "(?<url>\\bhttps?:\\/\\/[^\\s\"'<>]+)",
      "(?<ts>\\b\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?(?:Z|[+-]\\d{2}:?\\d{2})?|\\[\\d{2}\\/[A-Z][a-z]{2}\\/\\d{4}:\\d{2}:\\d{2}:\\d{2} [+-]\\d{4}\\]|\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) {1,2}\\d{1,2} \\d{2}:\\d{2}:\\d{2}\\b|\\b\\d{2}:\\d{2}:\\d{2}\\b)",
      "(?<ip>\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)(?::\\d{1,5})?\\b)",
      "(?<hash>\\b(?:[a-fA-F0-9]{64}|[a-fA-F0-9]{40}|[a-fA-F0-9]{32})\\b)",
      "(?<evt>\\b(?:EventID|Event ID|EventCode|event_id|Event)[ :=]*\\d{1,5}\\b|\\b(?:4624|4625|4634|4647|4648|4657|4663|4672|4688|4697|4698|4699|4702|4719|4720|4722|4723|4724|4725|4726|4728|4732|4738|4740|4756|4768|4769|4771|4776|4798|4799|5140|5145|5156|1102|7045|7036|7040)\\b)",
      "(?<bad>\\b(?:Failed|FAILED|failed|failure|Failure|denied|Denied|DENIED|Invalid|invalid|error|Error|ERROR|BLOCKED|Blocked|blocked|ALERT)\\b)",
      "(?<good>\\b(?:Accepted|accepted|Success|success|SUCCESS|Succeeded|succeeded|Allowed|ALLOWED|allowed)\\b)",
      "(?<method>\\b(?:GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|CONNECT)\\b)",
      "(?<status>(?<=\" )[1-5]\\d{2}\\b)",
      "(?<dom>\\b[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:com|net|org|de|ru|io|thm|example|local|corp|lan|info|biz|xyz|top|app|dev|onion)\\b)",
      "(?<com>(?:^|(?<=\\s))#\\s.*$)"
    ].join("|"), "gm");
  } catch (e) { LOG = null; }
  function darkBg(node) {
    for (var x = node; x && x.nodeType === 1; x = x.parentElement) {
      var c = getComputedStyle(x).backgroundColor, m = c && c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
      if (m && (m[4] == null || +m[4] > 0.3)) return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) < 110;
    }
    return false;
  }
  function logs() {
    if (!LOG) return;
    Array.prototype.forEach.call(root.querySelectorAll("pre"), function (pre) {
      var code = pre.querySelector("code");
      if (code && /\blanguage-/.test(code.className)) return;
      if (pre.closest(".fb, .fld, #thmr") || pre.classList.contains("hljs")) return;
      var targets = [];
      Array.prototype.forEach.call(pre.childNodes, function (n) { if (n.nodeType === 3) targets.push(n); });
      if (code) Array.prototype.forEach.call(code.childNodes, function (n) { if (n.nodeType === 3) targets.push(n); });
      var any = false;
      targets.forEach(function (n) {
        var t = n.nodeValue, last = 0, frag = document.createDocumentFragment(), m;
        LOG.lastIndex = 0;
        while ((m = LOG.exec(t))) {
          if (!m[0]) { LOG.lastIndex++; continue; }
          var g = m.groups, k = Object.keys(g).filter(function (x) { return g[x] != null; })[0];
          if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
          var sp = document.createElement("span");
          sp.className = "thmr-lg lg-" + k + (k === "status" ? " lg-s" + m[0][0] : "");
          sp.textContent = m[0]; frag.appendChild(sp);
          last = m.index + m[0].length; any = true;
        }
        if (last === 0) return;
        if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
        n.parentNode.replaceChild(frag, n);
      });
      if (any) pre.classList.add(darkBg(pre) ? "thmr-lg-dk" : "thmr-lg-lt");
    });
  }

  // ---------- подсказки терминов ----------
  var GLOS = [], tip = null, tipFor = null, tipT = null;
  function rxEsc(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function terms() {
    fetch(new URL("../data/glossary.json", location.href)).then(function (r) { return r.json(); }).then(function (list) {
      GLOS = list;
      var map = {}, keys = [];
      // слишком общие слова: перевод очевиден, а встречаются они на каждой странице
      var STOP = " banner bias cache certificate command container directory documentation encoding encryption file form header hexadecimal index layer method network octet packet patch permissions pipe port process protocol query recommendation redirect repository routing salt scope service signal snapshot socket syntax timeline topology trust ";
      list.forEach(function (g, i) {
        if (STOP.indexOf(" " + String(g.en || "").trim().toLowerCase() + " ") >= 0) return;
        [g.en, g.ru].forEach(function (t, j) {
          t = (t || "").trim();
          // только термины, которые реально стоит перевести: многословные или длинные, плюс аббревиатуры от 4 букв
          if (t.length < 4 || /[()\/]/.test(t)) return;
          var multi = /\s/.test(t);
          if (j === 0 && !multi && t.length < 6 && !/^[A-Z0-9]{4,}$/.test(t)) return;
          if (j === 1 && !multi && t.length < 9) return;
          var k = t.toLowerCase(); if (map[k] == null) { map[k] = i; keys.push(t); }
        });
      });
      if (!keys.length) return;
      keys.sort(function (a, b) { return b.length - a.length; });
      var rx;
      try { rx = new RegExp("(^|[^\\p{L}\\p{N}_-])(" + keys.map(rxEsc).join("|") + ")(?=$|[^\\p{L}\\p{N}_-])", "giu"); } catch (e) { return; }
      // каждый термин подсвечивается один раз на главу (h1), а если глав-h1 нет — один раз на раздел
      var hasH1 = chapters.some(function (c) { return c.tagName === "H1"; });
      var heads = new Set(chapters.filter(function (c) { return !hasH1 || c.tagName === "H1"; })), glosTables = new Set();
      Array.prototype.forEach.call(root.querySelectorAll("table"), function (t) {
        var th = t.querySelector("th"); if (th && /^\s*EN\s*$/.test(th.textContent)) glosTables.add(t);
      });
      var SKIP = "PRE,CODE,KBD,SAMP,A,BUTTON,H1,H2,H3,H4,H5,H6,SVG,INPUT,TEXTAREA,SELECT,SCRIPT,STYLE,NAV,ASIDE,LABEL,SUMMARY".split(",");
      var used = {}, jobs = [];
      var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (n.nodeType === 1) {
            if (heads.has(n)) used = {};
            if (SKIP.indexOf(n.tagName) >= 0 || glosTables.has(n) || n.id === "thmr" || n.id === "thmr-head") return NodeFilter.FILTER_REJECT;
            var c = n.classList;
            if (c && (c.contains("qz") || c.contains("quiz") || c.contains("fld") || c.contains("fb") || c.contains("tr") || c.contains("triage") || c.contains("ck") || c.contains("toc") || c.contains("kc") || c.contains("thmr-term"))) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var n;
      while ((n = w.nextNode())) {
        var t = n.nodeValue, m, found = [];
        if (!t || t.length < 3) continue;
        rx.lastIndex = 0;
        while ((m = rx.exec(t))) {
          var key = m[2].toLowerCase(), gi = map[key];
          if (gi == null || used[gi]) continue;
          used[gi] = 1;
          found.push({ at: m.index + m[1].length, len: m[2].length, gi: gi });
        }
        if (found.length) jobs.push({ n: n, f: found });
      }
      jobs.forEach(function (j) {
        j.f.sort(function (a, b) { return b.at - a.at; }).forEach(function (f) {
          var node = j.n;
          if (f.at + f.len < node.nodeValue.length) node.splitText(f.at + f.len);
          var mid = f.at > 0 ? node.splitText(f.at) : node;
          var sp = document.createElement("span");
          sp.className = "thmr-term"; sp.tabIndex = 0; sp.dataset.g = f.gi;
          sp.setAttribute("role", "button"); sp.setAttribute("aria-label", mid.nodeValue + ": перевод");
          mid.parentNode.replaceChild(sp, mid); sp.appendChild(mid);
        });
      });
      paintMap();
    }).catch(function () {});
  }
  function showTip(sp) {
    if (!prefs.terms) return;
    var g = GLOS[+sp.dataset.g]; if (!g) return;
    clearTimeout(tipT);
    if (!tip) { tip = el("div", { id: "thmr-tip", role: "tooltip" }); ui.appendChild(tip); }
    tipFor = sp;
    tip.innerHTML = '<div><span>EN</span><b>' + esc(g.en) + '</b></div><div><span>RU</span>' + esc(g.ru) + '</div><div><span>DE</span>' + esc(g.de) + '</div>' +
      '<a href="../glossary.html?q=' + encodeURIComponent(g.en) + '">весь глоссарий →</a>';
    tip.style.display = "block";
    var r = sp.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = Math.max(8, Math.min(r.left + r.width / 2 - tw / 2, document.documentElement.clientWidth - tw - 8));
    var y = r.top - th - 8; if (y < 8) y = r.bottom + 8;
    tip.style.left = (x + window.scrollX) + "px"; tip.style.top = (y + window.scrollY) + "px";
  }
  function hideTip() { if (tip) tip.style.display = "none"; tipFor = null; }
  document.addEventListener("mouseover", function (e) {
    var sp = e.target.closest && e.target.closest(".thmr-term");
    if (sp) showTip(sp);
    else if (tipFor && !(e.target.closest && e.target.closest("#thmr-tip"))) { clearTimeout(tipT); tipT = setTimeout(hideTip, 250); }
  });
  document.addEventListener("click", function (e) {
    var sp = e.target.closest && e.target.closest(".thmr-term");
    if (sp) { if (tipFor === sp) hideTip(); else showTip(sp); return; }
    if (tipFor && !(e.target.closest && e.target.closest("#thmr-tip"))) hideTip();
  });
  document.addEventListener("focusin", function (e) { if (e.target.classList && e.target.classList.contains("thmr-term")) showTip(e.target); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hideTip(); });
  window.addEventListener("scroll", function () { if (tipFor && !matchMedia("(hover:hover)").matches) hideTip(); }, { passive: true });

  // ---------- мини-карта учебника ----------
  var map = null, vp = null;
  function buildMap() {
    map = el("div", { id: "thmr-map", role: "navigation", "aria-label": "Карта учебника: прочитанные разделы, закладки и выделения" });
    ui.appendChild(map);
    paintMap();
    if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(buildMap.t); buildMap.t = setTimeout(paintMap, 200); }).observe(document.body);
    window.addEventListener("scroll", function () { if (!moveVp.r) moveVp.r = requestAnimationFrame(function () { moveVp.r = 0; moveVp(); }); }, { passive: true });
  }
  function docTop(x) { return x.getBoundingClientRect().top + window.scrollY; }
  function paintMap() {
    if (!map) return;
    var H = document.documentElement.scrollHeight || 1, h = [];
    chapters.forEach(function (c, i) {
      var top = docTop(c), end = chapters[i + 1] ? docTop(chapters[i + 1]) : H;
      h.push('<a class="seg' + (st.seen[c.id] ? " seen" : "") + (st.pos && st.pos.id === c.id ? " cur" : "") + '" href="#' + encodeURIComponent(c.id) + '" style="top:' + (top / H * 100).toFixed(2) + '%;height:' + Math.max(0.3, (end - top) / H * 100).toFixed(2) + '%" title="' + esc(chTitle(c)) + (st.seen[c.id] ? " · прочитано" : "") + '" tabindex="-1"></a>');
    });
    st.bookmarks.forEach(function (b) {
      var c = b.id && document.getElementById(b.id); var y = c ? docTop(c) + (b.off || 0) : (b.off || 0);
      h.push('<span class="bm" style="top:' + (y / H * 100).toFixed(2) + '%" title="Закладка: ' + esc(b.title) + '"></span>');
    });
    var seenM = {};
    Array.prototype.forEach.call(document.querySelectorAll("mark.thmr-m"), function (m) {
      if (seenM[m.dataset.mid]) return; seenM[m.dataset.mid] = 1;
      h.push('<span class="hl" style="top:' + (docTop(m) / H * 100).toFixed(2) + '%"></span>');
    });
    h.push('<i class="vp"></i>');
    map.innerHTML = h.join("");
    vp = map.querySelector(".vp");
    moveVp();
  }
  function moveVp() {
    if (!vp) return;
    var H = document.documentElement.scrollHeight || 1;
    vp.style.top = (window.scrollY / H * 100) + "%";
    vp.style.height = Math.max(1.5, window.innerHeight / H * 100) + "%";
  }

  // ---------- старт ----------
  function start() {
    head();
    applyPrefs();
    applyFocus();
    applyToggles();
    logs();
    paintAll();
    measure();
    buildMap();
    terms();
    save();
    updateHead(false);
    if (!location.hash && st.pos && st.pos.id && document.getElementById(st.pos.id) && chapters.indexOf(document.getElementById(st.pos.id)) > 0) {
      var p = st.pos;
      toast("Продолжить: " + p.title, "Продолжить", function () { goTo(p.id, p.off); });
    }
    if (window.speechSynthesis) speechSynthesis.getVoices();
    window.addEventListener("pagehide", function () { if (tts.on) ttsStop(); });
  }
  if (document.readyState === "complete") start(); else window.addEventListener("load", start);
})();
