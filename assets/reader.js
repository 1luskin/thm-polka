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
  var prefs = get("thm-reader:prefs", { night: false, zoom: 1, rate: 1 });
  function save() { st.lastOpen = new Date().toISOString(); put(KEY, st); summary(); }

  // ---------- структура учебника ----------
  var root = document.querySelector("main.content") || document.querySelector("main") || document.querySelector(".wrap") || document.body;
  var chapters = Array.prototype.filter.call(document.querySelectorAll("h2[id]"), function (h) {
    return !h.closest("nav,aside,.toc,.side,#thmr");
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
        st.seen[h.id] = 1;
        var top = h.getBoundingClientRect().top + window.scrollY;
        st.pos = { id: h.id, title: chTitle(h), off: Math.round(window.scrollY - top) };
      } else {
        st.pos = null;
      }
      // дочитал до самого низа — последняя глава тоже прочитана
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 40 && chapters.length) st.seen[chapters[chapters.length - 1].id] = 1;
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
        if (!p || p.closest("#thmr, script, style, noscript")) return NodeFilter.FILTER_REJECT;
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
    renderPanel();
  });

  // ---------- старт ----------
  function start() {
    applyPrefs();
    paintAll();
    save();
    if (!location.hash && st.pos && st.pos.id && document.getElementById(st.pos.id) && chapters.indexOf(document.getElementById(st.pos.id)) > 0) {
      var p = st.pos;
      toast("Продолжить: " + p.title, "Продолжить", function () { goTo(p.id, p.off); });
    }
    if (window.speechSynthesis) speechSynthesis.getVoices();
    window.addEventListener("pagehide", function () { if (tts.on) ttsStop(); });
  }
  if (document.readyState === "complete") start(); else window.addEventListener("load", start);
})();
