/* THM Полка — визуал внутри учебников. Подгружается читалкой (reader.js).
   В учебнике визуал задаётся коротким блоком:
     <figure class="thv" data-v="ТИП"><figcaption><b>Заголовок</b><span>источник / пометка</span></figcaption>
       <script type="application/json">{ …данные… }</script></figure>
   Типы: timeline, hours, topn, baseline, heat, ptree, graph, scene, route, seq, chain, layers,
         decode, diff, siem, event, matrix, severity, ui, map. Плюс обложки глав (автоматически).
   Описание форматов данных — в README репозитория (раздел «Визуал в учебниках»). */
(function () {
  "use strict";
  if (window.__thv) return;
  window.__thv = true;
  var BASE = (document.currentScript && document.currentScript.src) || new URL("../assets/viz.js", location.href).href;
  var ICONS = window.THV_ICONS || {};

  // ---------- стили ----------
  var css = document.createElement("style");
  css.textContent = [
    ".thv,.thv-cover{--v-bg:#ffffff;--v-bg2:#f4f6f8;--v-fg:#16212e;--v-mut:#5b6876;--v-line:#d5dbe2;--v-acc:#c2620a;--v-soft:#fbe9d6;--v-bad:#c0392b;--v-bad-s:#fbe3e0;--v-good:#2e8a57;--v-good-s:#dff2e7;--v-info:#2f6fb5;--v-info-s:#e1ecf8;--v-warn:#b7791f}",
    "@media (prefers-color-scheme:dark){html:not([data-theme=light]) :is(.thv,.thv-cover){--v-bg:#17202a;--v-bg2:#1d2833;--v-fg:#e3e9ef;--v-mut:#93a1af;--v-line:#2c3947;--v-acc:#f0954a;--v-soft:#3a2716;--v-bad:#ef7a72;--v-bad-s:#3a1d1a;--v-good:#5cc28a;--v-good-s:#15301f;--v-info:#6ea8ec;--v-info-s:#172a40;--v-warn:#e3b04e}}",
    "html[data-theme=dark] :is(.thv,.thv-cover){--v-bg:#17202a;--v-bg2:#1d2833;--v-fg:#e3e9ef;--v-mut:#93a1af;--v-line:#2c3947;--v-acc:#f0954a;--v-soft:#3a2716;--v-bad:#ef7a72;--v-bad-s:#3a1d1a;--v-good:#5cc28a;--v-good-s:#15301f;--v-info:#6ea8ec;--v-info-s:#172a40;--v-warn:#e3b04e}",
    "html.thmr-soft :is(.thv,.thv-cover){--v-bg:#25211c;--v-bg2:#2b2620;--v-line:#3a332a;--v-fg:#e3d9c8;--v-mut:#a89a85}",
    "html.thmr-paper :is(.thv,.thv-cover){--v-bg:#faf4e6;--v-bg2:#f1e8d4;--v-line:#d9cbad;--v-fg:#3b2f22;--v-mut:#6e5e4a}",
    ".thv{margin:1.6em 0;padding:14px 16px 16px;background:var(--v-bg);color:var(--v-fg);border:1px solid var(--v-line);border-radius:12px;font:14px/1.45 'Golos Text',-apple-system,'Segoe UI',system-ui,sans-serif;max-width:100%;box-sizing:border-box;overflow:hidden}",
    ".thv *{box-sizing:border-box}",
    "figure.thv,figure.thv figcaption{text-align:left!important;display:block}",
    "figure.thv figcaption{display:flex!important;font-style:normal}",
    ".thv .ui td{max-width:460px;overflow:hidden;text-overflow:ellipsis}",
    ".thv>script{display:none}",
    ".thv figcaption{display:flex;flex-direction:column;gap:2px;margin-bottom:12px}",
    ".thv figcaption b{font-size:15px;font-weight:600}",
    ".thv figcaption span{font-size:12px;color:var(--v-mut)}",
    ".thv .v-scroll{overflow-x:auto;max-width:100%}",
    ".thv svg{display:block;max-width:100%}",
    ".thv svg text{fill:var(--v-mut);font:11px 'JetBrains Mono',ui-monospace,Menlo,monospace}",
    ".thv .mono,.thv code{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:12.5px}",
    ".thv .v-legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:var(--v-mut);margin-top:8px}",
    ".thv .v-legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}",
    ".thv button.v-b{font:inherit;font-size:13px;border:1px solid var(--v-line);background:var(--v-bg2);color:var(--v-fg);border-radius:8px;padding:5px 11px;cursor:pointer}",
    ".thv button.v-b:hover{border-color:var(--v-acc)}",
    ".thv button.v-b[aria-pressed=true],.thv button.v-b.on{background:var(--v-soft);border-color:var(--v-acc);font-weight:600}",
    ".thv button:focus-visible,.thv select:focus-visible,.thv input:focus-visible{outline:2px solid var(--v-acc);outline-offset:2px}",
    ".thv .v-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}",
    ".thv .v-note{margin-top:10px;padding:10px 12px;border-radius:8px;background:var(--v-bg2);font-size:13.5px;min-height:1em}",
    // topn
    ".thv .tn{display:grid;grid-template-columns:minmax(0,max-content) 1fr auto;gap:6px 10px;align-items:center}",
    ".thv .tn .l{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:46vw}",
    ".thv .tn .b{height:14px;border-radius:3px;background:var(--v-info);min-width:2px}",
    ".thv .tn .b.bad{background:var(--v-bad)}.thv .tn .b.good{background:var(--v-good)}.thv .tn .b.acc{background:var(--v-acc)}",
    ".thv .tn .n{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:12.5px;text-align:right;font-variant-numeric:tabular-nums}",
    // heat
    ".thv .hm{display:grid;gap:2px;font-size:10px;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;color:var(--v-mut);min-width:max-content}",
    ".thv .hm i{display:block;width:100%;min-width:14px;height:16px;border-radius:2px;background:var(--v-bg2)}",
    // ptree
    ".thv .pt ul{list-style:none;margin:0;padding-left:22px;border-left:1.5px dashed var(--v-line)}",
    ".thv .pt>ul{border-left:none;padding-left:0}",
    ".thv .pt li{margin:6px 0;position:relative}",
    ".thv .pt li::before{content:'';position:absolute;left:-22px;top:15px;width:18px;border-top:1.5px dashed var(--v-line)}",
    ".thv .pt>ul>li::before{display:none}",
    ".thv .pt .nd{display:inline-flex;flex-direction:column;gap:2px;padding:6px 10px;border:1px solid var(--v-line);border-radius:8px;background:var(--v-bg2);cursor:pointer;max-width:100%;text-align:left;font:inherit;color:inherit}",
    ".thv .pt .nd b{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:13px}",
    ".thv .pt .nd small{color:var(--v-mut);font-size:12px}",
    ".thv .pt .nd.bad{border-color:var(--v-bad);background:var(--v-bad-s)}",
    ".thv .pt .nd .cmd{display:none;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:12px;white-space:pre-wrap;word-break:break-all;margin-top:4px}",
    ".thv .pt .nd.open .cmd{display:block}",
    // chain
    ".thv .ch{display:flex;gap:0;overflow-x:auto;padding:4px 2px 2px}",
    ".thv .ch button{flex:1 0 96px;font:inherit;font-size:12px;line-height:1.25;border:none;background:none;color:var(--v-fg);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;padding:0 4px;position:relative}",
    ".thv .ch button::before{content:'';position:absolute;top:11px;left:0;right:0;height:3px;background:var(--v-line);z-index:0}",
    ".thv .ch button.done::before{background:var(--v-bad)}",
    ".thv .ch button:first-child::before{left:50%}.thv .ch button:last-child::before{right:50%}",
    ".thv .ch .dot{position:relative;z-index:1;width:22px;height:22px;border-radius:50%;border:3px solid var(--v-line);background:var(--v-bg)}",
    ".thv .ch .done .dot{background:var(--v-bad);border-color:var(--v-bad)}",
    ".thv .ch .cur .dot{border-color:var(--v-bad);box-shadow:0 0 0 5px var(--v-bad-s)}",
    ".thv .ch button[aria-pressed=true] span{font-weight:700}",
    // layers
    ".thv .ly{display:flex;height:44px;border-radius:8px;overflow:hidden;border:1px solid var(--v-line)}",
    ".thv .ly button{border:none;border-right:1px solid var(--v-bg);font:inherit;font-size:12px;color:#fff;cursor:pointer;min-width:44px;padding:0 4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}",
    ".thv .ly button[aria-pressed=true]{box-shadow:inset 0 -4px 0 rgba(0,0,0,.35);font-weight:700}",
    ".thv table.v-t{border-collapse:collapse;width:100%;font-size:13px}",
    ".thv table.v-t th,.thv table.v-t td{border-bottom:1px solid var(--v-line);padding:6px 8px;text-align:left;vertical-align:top}",
    ".thv table.v-t th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--v-mut);font-weight:600;background:var(--v-bg2);position:sticky;top:0}",
    ".thv table.v-t td.mono{white-space:nowrap}",
    // decode
    ".thv .dc{display:flex;flex-direction:column;gap:8px}",
    ".thv .dc .st{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start}",
    ".thv .dc .op{font-size:11px;font-weight:700;color:var(--v-acc);background:var(--v-soft);border-radius:999px;padding:3px 9px;white-space:nowrap}",
    ".thv .dc .val{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:12.5px;background:var(--v-bg2);border-radius:6px;padding:7px 9px;word-break:break-all;white-space:pre-wrap;animation:thv-in .35s ease}",
    "@keyframes thv-in{from{opacity:0;transform:translateY(-4px)}}",
    // diff
    ".thv .df{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
    "@media (max-width:640px){.thv .df{grid-template-columns:1fr}}",
    ".thv .df h4{margin:0 0 6px;font-size:12px;color:var(--v-mut);font-weight:600}",
    ".thv .df pre{margin:0;font:12px/1.6 'JetBrains Mono',ui-monospace,Menlo,monospace;background:var(--v-bg2);border-radius:8px;padding:8px 0;overflow-x:auto}",
    ".thv .df pre div{padding:0 10px;white-space:pre}",
    ".thv .df .add{background:var(--v-good-s)}.thv .df .del{background:var(--v-bad-s)}",
    ".thv .df .add::before{content:'+ ';color:var(--v-good)}.thv .df .del::before{content:'− ';color:var(--v-bad)}.thv .df .eq::before{content:'  '}",
    // siem
    ".thv .sm-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px}",
    ".thv .sm-top input,.thv .sm-top select,.thv select.v-sel{font:inherit;font-size:13px;color:var(--v-fg);background:var(--v-bg2);border:1px solid var(--v-line);border-radius:8px;padding:6px 9px}",
    ".thv .sm-top input{flex:1 1 200px;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace}",
    ".thv .sm-wrap{max-height:340px;overflow:auto;border:1px solid var(--v-line);border-radius:8px}",
    ".thv .sm-wrap td{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:12px;white-space:nowrap}",
    ".thv mark.v-hit{background:rgba(240,149,74,.35);color:inherit;border-radius:2px}",
    // event card
    ".thv .ev-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}",
    ".thv .ev{border:1px solid var(--v-line);border-radius:12px;overflow:hidden;background:var(--v-bg2);display:flex;flex-direction:column}",
    ".thv .ev .top{display:flex;gap:12px;align-items:center;padding:12px 14px;background:linear-gradient(135deg,var(--k,var(--v-info)),color-mix(in srgb,var(--k,var(--v-info)) 60%,#000));color:#fff}",
    ".thv .ev .id{font:700 30px/1 'JetBrains Mono',ui-monospace,Menlo,monospace;letter-spacing:-.02em}",
    ".thv .ev .nm{font-size:13px;line-height:1.25}.thv .ev .nm small{display:block;opacity:.85;font-size:11px;margin-top:2px}",
    ".thv .ev dl{margin:0;padding:10px 14px;display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:12.5px}",
    ".thv .ev dt{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;color:var(--v-mut);font-size:11.5px}",
    ".thv .ev dd{margin:0;word-break:break-word}",
    ".thv .ev .look{margin:0 14px 12px;padding:8px 10px;border-left:3px solid var(--k,var(--v-info));background:var(--v-bg);font-size:12.5px;border-radius:0 6px 6px 0}",
    // matrix
    ".thv table.mx td.c{text-align:center;font-size:15px}",
    ".thv table.mx .y,.thv table.mx .p,.thv table.mx .n{display:inline-block;width:14px;height:14px;border-radius:50%;vertical-align:middle;font-size:0}",
    ".thv table.mx .y{background:var(--v-good)}.thv table.mx .p{background:linear-gradient(90deg,var(--v-warn) 50%,transparent 50%);border:2px solid var(--v-warn)}.thv table.mx .n{width:6px;height:6px;background:var(--v-line)}",
    // severity
    ".thv .sv{display:grid;gap:10px}",
    ".thv .sv .f{display:flex;flex-direction:column;gap:5px}",
    ".thv .sv .f>span{font-size:12.5px;color:var(--v-mut)}",
    ".thv .sv .g{height:12px;border-radius:6px;background:linear-gradient(90deg,var(--v-good),var(--v-warn),var(--v-bad));position:relative;margin-top:6px}",
    ".thv .sv .g i{position:absolute;top:-5px;width:4px;height:22px;border-radius:2px;background:var(--v-fg);transition:left .35s cubic-bezier(.2,.8,.2,1)}",
    ".thv .sv .res{display:flex;align-items:baseline;gap:10px;font-size:14px}",
    ".thv .sv .res b{font-size:20px}",
    // ui mockups
    ".thv .ui{border:1px solid var(--v-line);border-radius:8px;overflow:hidden;font-size:12px;background:var(--v-bg)}",
    ".thv .ui .bar{display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--v-bg2);border-bottom:1px solid var(--v-line);font-size:12px;color:var(--v-mut)}",
    ".thv .ui .bar i{width:10px;height:10px;border-radius:50%;background:var(--v-line);display:inline-block}",
    ".thv .ui .bar b{color:var(--v-fg);margin-left:6px;font-weight:600}",
    ".thv .ui table.v-t td,.thv .ui table.v-t th{padding:4px 8px;font-size:12px}",
    ".thv .ui tr.sel td{background:var(--v-info-s)}",
    ".thv .ui tbody tr{cursor:pointer}",
    ".thv .ui .q{margin:8px 10px;padding:7px 10px;border:1px solid var(--v-line);border-radius:6px;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:12.5px;background:var(--v-bg2);word-break:break-all}",
    ".thv .ui .det{border-top:1px solid var(--v-line);padding:8px 10px;font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:12px;white-space:pre-wrap;background:var(--v-bg2);max-height:220px;overflow:auto}",
    ".thv .ui .ws td{color:#111}",
    // scene / graph
    ".thv .gr-ctl{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}",
    // map
    ".thv .mp{display:grid;grid-template-columns:minmax(0,3fr) minmax(170px,1fr);gap:14px;align-items:start}",
    "@media (max-width:640px){.thv .mp{grid-template-columns:1fr}}",
    ".thv .mp path{stroke:var(--v-bg);stroke-width:.4}",
    // covers
    ".thv-cover{display:block;margin:2.2em 0 .6em;border-radius:14px;overflow:hidden;height:92px;position:relative;background:var(--cv,#2c4f7c);color:#fff}",
    ".thv-cover svg{position:absolute;inset:0;width:100%;height:100%}",
    ".thv-cover .cn{position:absolute;left:18px;bottom:8px;font:700 54px/1 'Unbounded','Golos Text',system-ui,sans-serif;opacity:.95;letter-spacing:-.03em}",
    ".thv-cover .ci{position:absolute;right:18px;top:50%;transform:translateY(-50%);width:54px;height:54px;opacity:.9}",
    ".thv-cover .ci svg{position:static;width:54px;height:54px;fill:none;stroke:#fff;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}",
    "html.thv-nocovers .thv-cover{display:none}",
    ".thv-ill{margin:1.4em 0;border-radius:14px;overflow:hidden;border:1px solid rgba(127,127,127,.25)}",
    ".thv-ill img{display:block;width:100%;height:auto}",
    ".thv-ill figcaption{font-size:12px;padding:6px 12px;opacity:.75}",
    "@media (prefers-reduced-motion:reduce){.thv *{animation:none!important;transition:none!important}}"
  ].join("\n");
  document.head.appendChild(css);

  // ---------- помощники ----------
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString("ru-RU"); }
  function icon(name, size, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" width="' + (size || 24) + '" height="' + (size || 24) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.file || "") + "</svg>";
  }
  function iconG(name, x, y, size) {
    var k = size / 24;
    return '<g transform="translate(' + x + "," + y + ") scale(" + k.toFixed(3) + ')" fill="none" stroke="currentColor" stroke-width="' + (1.8 / Math.max(1, k * 0.9)).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS.file || "") + "</g>";
  }
  function kindColor(k) { return k === "bad" ? "var(--v-bad)" : k === "good" ? "var(--v-good)" : k === "acc" ? "var(--v-acc)" : k === "warn" ? "var(--v-warn)" : "var(--v-info)"; }
  function niceMax(m) { if (m <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  function width(el) { return Math.max(260, Math.floor(el.clientWidth || el.parentNode.clientWidth || 600)); }

  // ---------- 1. таймлайн ----------
  function timeline(el, d) {
    var W = width(el), H = 190, L = 40, R = 10, T = 26, B = 28, pts = d.points || [], n = pts.length || 1;
    var max = niceMax(Math.max.apply(null, pts.map(function (p) { return p[1]; }).concat([1])));
    var bw = (W - L - R) / n, s = [];
    s.push('<svg width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(d.unit || "") + '">');
    [0, 0.5, 1].forEach(function (f) { var y = T + (H - T - B) * (1 - f); s.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="var(--v-line)" stroke-dasharray="' + (f ? "3 3" : "") + '"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + fmt(max * f) + "</text>"); });
    var every = Math.ceil(n / Math.max(4, Math.floor((W - L) / 64)));
    pts.forEach(function (p, i) {
      var h = (H - T - B) * p[1] / max, x = L + i * bw;
      s.push('<rect x="' + (x + bw * 0.12).toFixed(1) + '" y="' + (H - B - h).toFixed(1) + '" width="' + Math.max(1, bw * 0.76).toFixed(1) + '" height="' + Math.max(p[1] ? 1 : 0, h).toFixed(1) + '" rx="1.5" fill="' + kindColor(p[2] || d.kind) + '"><title>' + esc(p[0]) + ": " + fmt(p[1]) + " " + esc(d.unit || "") + "</title></rect>");
      if (i % every === 0) s.push('<text x="' + (x + bw / 2) + '" y="' + (H - 9) + '" text-anchor="middle">' + esc(p[0]) + "</text>");
    });
    (d.marks || []).forEach(function (m) {
      var x = L + (m.i + 0.5) * bw, anchor = x > W * 0.7 ? "end" : "start";
      s.push('<line x1="' + x + '" x2="' + x + '" y1="' + (T - 8) + '" y2="' + (H - B) + '" stroke="' + kindColor(m.kind || "good") + '" stroke-width="2" stroke-dasharray="4 3"/>');
      s.push('<text x="' + (x + (anchor === "end" ? -5 : 5)) + '" y="' + (T - 10) + '" text-anchor="' + anchor + '" style="fill:' + kindColor(m.kind || "good") + ';font-weight:700">' + esc(m.text) + "</text>");
    });
    s.push("</svg>");
    el.innerHTML = s.join("") + (d.legend ? '<div class="v-legend">' + d.legend.map(function (l) { return '<span><i style="background:' + kindColor(l[1]) + '"></i>' + esc(l[0]) + "</span>"; }).join("") + "</div>" : "");
  }

  // ---------- 2. активность по часам ----------
  function hours(el, d) {
    var v = d.values || [], pts = v.map(function (x, h) { return [String(h).padStart(2, "0"), x, (h < 7 || h >= 22) ? "bad" : null]; });
    var W = width(el), H = 170, L = 40, R = 10, T = 12, B = 26, max = niceMax(Math.max.apply(null, v.concat([1]))), bw = (W - L - R) / 24, s = [];
    s.push('<svg width="' + W + '" height="' + H + '" role="img" aria-label="Активность по часам">');
    s.push('<rect x="' + L + '" y="' + T + '" width="' + (bw * 7) + '" height="' + (H - T - B) + '" fill="var(--v-bad-s)"/><rect x="' + (L + bw * 22) + '" y="' + T + '" width="' + (bw * 2) + '" height="' + (H - T - B) + '" fill="var(--v-bad-s)"/>');
    [0, 0.5, 1].forEach(function (f) { var y = T + (H - T - B) * (1 - f); s.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="var(--v-line)"' + (f ? ' stroke-dasharray="3 3"' : "") + '/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + fmt(max * f) + "</text>"); });
    pts.forEach(function (p, i) {
      var h = (H - T - B) * p[1] / max, x = L + i * bw;
      s.push('<rect x="' + (x + bw * 0.14).toFixed(1) + '" y="' + (H - B - h).toFixed(1) + '" width="' + (bw * 0.72).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="1.5" fill="' + (p[2] ? "var(--v-bad)" : "var(--v-info)") + '"><title>' + p[0] + ":00 — " + fmt(p[1]) + " " + esc(d.unit || "") + "</title></rect>");
      if (i % 3 === 0) s.push('<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + p[0] + "</text>");
    });
    s.push("</svg>");
    el.innerHTML = s.join("") + '<div class="v-legend"><span><i style="background:var(--v-bad-s);border:1px solid var(--v-bad)"></i>ночь 22:00–07:00 — время, когда обычный сотрудник не работает</span>' + (d.tz ? "<span>время: " + esc(d.tz) + "</span>" : "") + "</div>";
  }

  // ---------- 3. топ-N ----------
  function topn(el, d) {
    var it = d.items || [], max = Math.max.apply(null, it.map(function (x) { return x[1]; }).concat([1]));
    el.innerHTML = '<div class="tn">' + it.map(function (x) {
      return '<span class="l" title="' + esc(x[0]) + '">' + esc(x[0]) + '</span><span class="b ' + (x[2] || "") + '" style="width:' + (x[1] / max * 100).toFixed(1) + '%"></span><span class="n">' + fmt(x[1]) + "</span>";
    }).join("") + "</div>" + (d.unit ? '<div class="v-legend"><span>' + esc(d.unit) + "</span></div>" : "");
  }

  // ---------- 4. норма и сегодня ----------
  function baseline(el, d) {
    var W = width(el), H = 200, L = 46, R = 12, T = 14, B = 28, n = d.labels.length;
    var max = niceMax(Math.max.apply(null, d.hi.concat(d.v, [1]))), sx = (W - L - R) / Math.max(1, n - 1);
    function X(i) { return L + i * sx; } function Y(v) { return T + (H - T - B) * (1 - v / max); }
    var s = ['<svg width="' + W + '" height="' + H + '" role="img" aria-label="Норма и сегодня">'];
    [0, 0.5, 1].forEach(function (f) { var y = Y(max * f); s.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="var(--v-line)"' + (f ? ' stroke-dasharray="3 3"' : "") + '/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + fmt(max * f) + "</text>"); });
    var band = d.hi.map(function (v, i) { return X(i) + "," + Y(v); }).concat(d.lo.map(function (v, i) { return X(i) + "," + Y(v); }).reverse()).join(" ");
    s.push('<polygon points="' + band + '" fill="var(--v-info-s)" stroke="none"/>');
    s.push('<polyline points="' + d.v.map(function (v, i) { return X(i) + "," + Y(v); }).join(" ") + '" fill="none" stroke="var(--v-fg)" stroke-width="2"/>');
    var every = Math.ceil(n / Math.max(4, Math.floor((W - L) / 56)));
    d.v.forEach(function (v, i) {
      var out = v > d.hi[i] || v < d.lo[i];
      if (out) s.push('<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="4.5" fill="var(--v-bad)"><title>' + esc(d.labels[i]) + ": " + fmt(v) + " — вне нормы (" + fmt(d.lo[i]) + "–" + fmt(d.hi[i]) + ")</title></circle>");
      if (i % every === 0) s.push('<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(d.labels[i]) + "</text>");
    });
    s.push("</svg>");
    el.innerHTML = s.join("") + '<div class="v-legend"><span><i style="background:var(--v-info-s);border:1px solid var(--v-info)"></i>' + esc(d.bandLabel || "обычный уровень") + '</span><span><i style="background:var(--v-fg)"></i>' + esc(d.lineLabel || "сегодня") + '</span><span><i style="background:var(--v-bad);border-radius:50%"></i>вне нормы</span></div>';
  }

  // ---------- 5. тепловая карта ----------
  function heat(el, d) {
    var max = 1; d.values.forEach(function (r) { r.forEach(function (v) { if (v > max) max = v; }); });
    var cols = d.cols.length, h = ['<div class="v-scroll"><div class="hm" style="grid-template-columns:auto repeat(' + cols + ',minmax(14px,1fr))"><span></span>'];
    d.cols.forEach(function (c, i) { h.push("<span style=\"text-align:center\">" + (i % (d.colStep || 3) === 0 ? esc(c) : "") + "</span>"); });
    d.rows.forEach(function (r, ri) {
      h.push("<span style=\"padding-right:6px\">" + esc(r) + "</span>");
      d.values[ri].forEach(function (v, ci) {
        var p = v ? Math.round(18 + 82 * Math.sqrt(v / max)) : 0;
        h.push('<i title="' + esc(r + ", " + d.cols[ci] + ": " + fmt(v) + " " + (d.unit || "")) + '" style="' + (p ? "background:color-mix(in srgb,var(--v-acc) " + p + "%,var(--v-bg2))" : "") + '"></i>');
      });
    });
    h.push("</div></div>");
    el.innerHTML = h.join("") + '<div class="v-legend"><span>меньше</span>' + [0, 30, 55, 80, 100].map(function (p) { return '<span><i style="background:' + (p ? "color-mix(in srgb,var(--v-acc) " + p + "%,var(--v-bg2))" : "var(--v-bg2)") + '"></i></span>'; }).join("") + "<span>больше · " + esc(d.unit || "") + "</span></div>";
  }

  // ---------- 6. дерево процессов ----------
  function ptree(el, d) {
    function node(n) {
      return "<li><button type=\"button\" class=\"nd" + (n.bad ? " bad" : "") + '"><b>' + esc(n.n) + "</b>" + (n.u || n.note ? "<small>" + esc([n.u, n.note].filter(Boolean).join(" · ")) + "</small>" : "") + (n.cmd ? '<span class="cmd">' + esc(n.cmd) + "</span>" : "") + "</button>" +
        (n.c && n.c.length ? "<ul>" + n.c.map(node).join("") + "</ul>" : "") + "</li>";
    }
    el.innerHTML = '<div class="pt"><ul>' + node(d.root) + '</ul></div><div class="v-legend"><span>Нажми на процесс — покажу командную строку.</span><span><i style="background:var(--v-bad)"></i>подозрительное звено</span></div>';
    el.addEventListener("click", function (e) { var b = e.target.closest(".nd"); if (b) b.classList.toggle("open"); });
  }

  // ---------- 7, 19a, 8. граф, сцена из иконок, маршрут пакета ----------
  function layout(d, W) {
    var nodes = d.nodes, byId = {}, cols = [];
    nodes.forEach(function (n) { byId[n.id] = n; });
    if (d.zones) {
      d.zones.forEach(function (z, i) { cols[i] = nodes.filter(function (n) { return n.zone === z.id; }); });
    } else if (d.row) {
      cols = nodes.map(function (n) { return [n]; });
    } else {
      var depth = {}, edges = d.edges || [];
      nodes.forEach(function (n) { depth[n.id] = 0; });
      for (var k = 0; k < nodes.length; k++) edges.forEach(function (e) { if (byId[e[0]] && byId[e[1]] && depth[e[1]] < depth[e[0]] + 1) depth[e[1]] = depth[e[0]] + 1; });
      nodes.forEach(function (n) { (cols[depth[n.id]] = cols[depth[n.id]] || []).push(n); });
      cols = cols.filter(Boolean);
    }
    var vertical = (W - 20) / cols.length < 96, NW = vertical ? Math.min(150, (W - 30) / Math.max(1, Math.max.apply(null, cols.map(function (c) { return c.length; }))) - 10) : Math.min(124, (W - 20) / cols.length - 14), NH = 70;
    var maxRows = Math.max.apply(null, cols.map(function (c) { return c.length; }));
    var gx = vertical ? 0 : (W - 20) / cols.length, gy = 96;
    var H = vertical ? cols.length * 110 + 30 : Math.max(1, maxRows) * gy + (d.zones ? 44 : 20);
    cols.forEach(function (c, ci) {
      c.forEach(function (n, ri) {
        if (vertical) { var span = (W - 20) / c.length; n._x = 10 + span * (ri + 0.5); n._y = 30 + ci * 110 + NH / 2; }
        else { n._x = 10 + gx * (ci + 0.5); n._y = (d.zones ? 40 : 10) + (H - (d.zones ? 50 : 20)) / c.length * (ri + 0.5); }
      });
    });
    return { byId: byId, cols: cols, W: W, H: H, NW: NW, NH: NH, vertical: vertical, gx: gx };
  }
  function graphSvg(d, lo, active) {
    var s = ['<svg width="' + lo.W + '" height="' + lo.H + '" role="img" aria-label="Схема"><defs><marker id="thv-ar" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--v-mut)"/></marker><marker id="thv-arb" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--v-bad)"/></marker></defs>'];
    if (d.zones && !lo.vertical) d.zones.forEach(function (z, i) {
      var x = 10 + lo.gx * i;
      s.push('<rect x="' + (x + 4) + '" y="4" width="' + (lo.gx - 8) + '" height="' + (lo.H - 8) + '" rx="10" fill="' + (z.kind === "bad" ? "var(--v-bad-s)" : "var(--v-bg2)") + '" stroke="var(--v-line)" stroke-dasharray="4 4"/><text x="' + (x + lo.gx / 2) + '" y="24" text-anchor="middle" style="font-weight:700;fill:var(--v-fg)">' + esc(z.label) + "</text>");
    });
    (d.edges || []).forEach(function (e, i) {
      var a = lo.byId[e[0]], b = lo.byId[e[1]]; if (!a || !b) return;
      var bad = e[3] === "bad", on = active != null && active === i;
      var x1 = a._x, y1 = a._y, x2 = b._x, y2 = b._y, dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var off = lo.vertical ? lo.NH / 2 + 4 : lo.NW / 2 + 4;
      if (Math.abs(dy) > Math.abs(dx) * 1.2) off = lo.NH / 2 + 4;
      var sx = x1 + dx / len * off, sy = y1 + dy / len * off, ex = x2 - dx / len * off, ey = y2 - dy / len * off;
      s.push('<path id="thv-e' + i + '" d="M' + sx + "," + sy + " L" + ex + "," + ey + '" stroke="' + (bad || on ? "var(--v-bad)" : "var(--v-mut)") + '" stroke-width="' + (on ? 3 : 1.8) + '"' + (e[3] === "dash" ? ' stroke-dasharray="5 4"' : "") + ' fill="none" marker-end="url(#' + (bad || on ? "thv-arb" : "thv-ar") + ')"/>');
      if (e[2]) s.push('<text x="' + ((sx + ex) / 2) + '" y="' + ((sy + ey) / 2 - 6) + '" text-anchor="middle" style="fill:' + (bad ? "var(--v-bad)" : "var(--v-fg)") + ';paint-order:stroke;stroke:var(--v-bg);stroke-width:4px">' + esc(e[2]) + "</text>");
    });
    d.nodes.forEach(function (n) {
      var c = n.kind === "bad" ? "var(--v-bad)" : n.kind === "good" ? "var(--v-good)" : n.kind === "acc" ? "var(--v-acc)" : "var(--v-fg)";
      var bg = n.kind === "bad" ? "var(--v-bad-s)" : n.kind === "good" ? "var(--v-good-s)" : "var(--v-bg)";
      s.push('<g transform="translate(' + (n._x - lo.NW / 2) + "," + (n._y - lo.NH / 2) + ')"><rect width="' + lo.NW + '" height="' + lo.NH + '" rx="10" fill="' + bg + '" stroke="' + (n.kind ? c : "var(--v-line)") + '" stroke-width="1.5"/>' +
        '<g style="color:' + c + '">' + iconG(n.icon || "file", lo.NW / 2 - 13, 7, 26) + "</g>" +
        '<text x="' + lo.NW / 2 + '" y="49" text-anchor="middle" style="fill:var(--v-fg);font:600 11.5px \'Golos Text\',system-ui,sans-serif">' + esc(n.label) + "</text>" +
        (n.sub ? '<text x="' + lo.NW / 2 + '" y="63" text-anchor="middle" style="font-size:10px">' + esc(n.sub) + "</text>" : "") + "</g>");
    });
    s.push('<circle id="thv-pkt" r="7" fill="var(--v-acc)" stroke="var(--v-bg)" stroke-width="2" style="display:none"/></svg>');
    return s.join("");
  }
  function graph(el, d) { el.innerHTML = '<div class="v-scroll">' + graphSvg(d, layout(d, width(el))) + "</div>"; }
  function route(el, d) {
    var step = el._step || 0, edges = [], key = {};
    d.steps.forEach(function (s) { var k = s.from + ">" + s.to; if (!(k in key)) { key[k] = edges.length; edges.push([s.from, s.to, "", s.kind]); } s._e = key[k]; });
    var dd = { nodes: d.nodes, edges: edges, row: !d.zones, zones: d.zones };
    var lo = layout(dd, width(el)), st = d.steps[step];
    el.innerHTML = '<div class="v-scroll">' + graphSvg(dd, lo, st._e) + '</div><div class="v-note"><b>Шаг ' + (step + 1) + " из " + d.steps.length + ".</b> " + esc(st.text) + '</div><div class="gr-ctl"><button class="v-b" data-r="prev"' + (step ? "" : " disabled") + '>← Назад</button><button class="v-b on" data-r="next"' + (step < d.steps.length - 1 ? "" : " disabled") + '>Далее →</button><button class="v-b" data-r="play">▶ Проиграть всё</button></div>';
    var path = el.querySelector("#thv-e" + st._e), pkt = el.querySelector("#thv-pkt");
    if (path && pkt && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var L = path.getTotalLength(), t0 = performance.now(); pkt.style.display = "";
      (function fr(t) { var k = Math.min(1, (t - t0) / 900), p = path.getPointAtLength(L * k); pkt.setAttribute("cx", p.x); pkt.setAttribute("cy", p.y); if (k < 1 && el.isConnected) requestAnimationFrame(fr); })(t0);
    }
    if (!el._bound) {
      el._bound = true;
      el.addEventListener("click", function (e) {
        var b = e.target.closest("[data-r]"); if (!b) return;
        clearInterval(el._play);
        if (b.dataset.r === "prev") el._step = Math.max(0, (el._step || 0) - 1);
        else if (b.dataset.r === "next") el._step = Math.min(d.steps.length - 1, (el._step || 0) + 1);
        else { el._step = 0; el._play = setInterval(function () { if (el._step >= d.steps.length - 1) { clearInterval(el._play); return; } el._step++; route(el, d); }, 1700); }
        route(el, d);
      });
    }
  }

  // ---------- 9. диаграмма последовательности ----------
  function seq(el, d) {
    var k = el._k == null ? 0 : el._k, A = d.actors, W = Math.max(width(el), A.length * 120), gap = (W - 20) / A.length, top = 46, row = 46, H = top + d.msgs.length * row + 20;
    function X(i) { return 10 + gap * (i + 0.5); }
    var s = ['<svg width="' + W + '" height="' + H + '" role="img" aria-label="Диаграмма обмена сообщениями"><defs><marker id="thv-sq" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--v-fg)"/></marker></defs>'];
    A.forEach(function (a, i) {
      s.push('<rect x="' + (X(i) - 54) + '" y="6" width="108" height="28" rx="8" fill="var(--v-bg2)" stroke="var(--v-line)"/><text x="' + X(i) + '" y="24" text-anchor="middle" style="fill:var(--v-fg);font-weight:700">' + esc(a) + '</text><line x1="' + X(i) + '" x2="' + X(i) + '" y1="34" y2="' + (H - 8) + '" stroke="var(--v-line)" stroke-dasharray="4 4"/>');
    });
    d.msgs.forEach(function (m, i) {
      if (i > k) { var gy = top + i * row + 18; s.push('<line x1="' + X(m.f) + '" x2="' + X(m.t) + '" y1="' + gy + '" y2="' + gy + '" stroke="var(--v-line)" stroke-width="1.5" stroke-dasharray="2 5"/>'); return; }
      var y = top + i * row + 18, x1 = X(m.f), x2 = X(m.t), c = m.kind === "bad" ? "var(--v-bad)" : m.kind === "good" ? "var(--v-good)" : "var(--v-fg)";
      s.push('<line x1="' + x1 + '" x2="' + (x2 + (x2 > x1 ? -3 : 3)) + '" y1="' + y + '" y2="' + y + '" stroke="' + c + '" stroke-width="' + (i === k ? 2.6 : 1.6) + '"' + (m.dash ? ' stroke-dasharray="5 4"' : "") + ' marker-end="url(#thv-sq)"/>');
      s.push('<text x="' + ((x1 + x2) / 2) + '" y="' + (y - 7) + '" text-anchor="middle" style="fill:' + c + ";" + (i === k ? "font-weight:700" : "") + '">' + esc(m.text) + "</text>");
    });
    s.push("</svg>");
    var cur = d.msgs[k];
    el.innerHTML = '<div class="v-scroll">' + s.join("") + "</div>" + '<div class="v-note">' + (cur.note ? "<b>" + (k + 1) + ".</b> " + esc(cur.note) : "") + '</div><div class="gr-ctl"><button class="v-b" data-s="prev"' + (k ? "" : " disabled") + '>← Назад</button><button class="v-b on" data-s="next"' + (k < d.msgs.length - 1 ? "" : " disabled") + '>Следующее сообщение →</button><button class="v-b" data-s="all">Показать всё</button></div>';
    if (!el._bound) {
      el._bound = true;
      el.addEventListener("click", function (e) {
        var b = e.target.closest("[data-s]"); if (!b) return;
        el._k = b.dataset.s === "prev" ? Math.max(0, (el._k || 0) - 1) : b.dataset.s === "next" ? Math.min(d.msgs.length - 1, (el._k || 0) + 1) : d.msgs.length - 1;
        seq(el, d);
      });
    }
  }

  // ---------- 10. kill chain с прогрессом ----------
  function chain(el, d) {
    var sel = el._sel == null ? Math.max(0, d.stages.map(function (x) { return x.state; }).lastIndexOf("cur")) : el._sel;
    el.innerHTML = '<div class="ch" role="tablist">' + d.stages.map(function (x, i) {
      return '<button type="button" role="tab" class="' + (x.state || "") + '" aria-pressed="' + (i === sel) + '" data-i="' + i + '"><span class="dot"></span><span>' + esc(x.name) + "</span>" + (x.ru ? '<small style="color:var(--v-mut)">' + esc(x.ru) + "</small>" : "") + "</button>";
    }).join("") + '</div><div class="v-note">' + esc(d.stages[sel].note || "") + '</div><div class="v-legend"><span><i style="background:var(--v-bad)"></i>атакующий уже прошёл этот этап</span><span><i style="background:var(--v-bg);border:3px solid var(--v-bad);border-radius:50%"></i>где он сейчас</span><span><i style="background:var(--v-line)"></i>ещё впереди</span></div>';
    if (!el._bound) { el._bound = true; el.addEventListener("click", function (e) { var b = e.target.closest("[data-i]"); if (b) { el._sel = +b.dataset.i; chain(el, d); } }); }
  }

  // ---------- 11. пакет по слоям ----------
  var LCOL = ["#5a3f78", "#2c4f7c", "#1f6f86", "#2f6b5a", "#8a3b2e", "#7a5a12"];
  function layers(el, d) {
    var sel = el._sel || 0, total = d.layers.reduce(function (a, l) { return a + (l.bytes || 1); }, 0), L = d.layers[sel];
    el.innerHTML = '<div class="ly" role="tablist">' + d.layers.map(function (l, i) {
      return '<button type="button" role="tab" aria-pressed="' + (i === sel) + '" data-i="' + i + '" style="flex:' + (l.bytes || 1) + ' 1 0;background:' + (l.color || LCOL[i % LCOL.length]) + '" title="' + esc(l.name) + ", " + l.bytes + ' байт">' + esc(l.name) + "</button>";
    }).join("") + '</div><div class="v-legend"><span>Ширина полосы — размер слоя: ' + fmt(total) + " байт всего.</span><span>Нажми на слой.</span></div>" +
      '<div class="v-note"><b>' + esc(L.name) + "</b> · " + fmt(L.bytes) + " байт" + (L.note ? " — " + esc(L.note) : "") + "</div>" +
      (L.fields ? '<div class="v-scroll"><table class="v-t"><thead><tr><th>Поле</th><th>Значение</th><th>Что значит</th></tr></thead><tbody>' + L.fields.map(function (f) { return '<tr><td class="mono">' + esc(f[0]) + '</td><td class="mono">' + esc(f[1]) + "</td><td>" + esc(f[2] || "") + "</td></tr>"; }).join("") + "</tbody></table></div>" : "");
    if (!el._bound) { el._bound = true; el.addEventListener("click", function (e) { var b = e.target.closest("[data-i]"); if (b) { el._sel = +b.dataset.i; layers(el, d); } }); }
  }

  // ---------- 12. декодирование по шагам ----------
  function decode(el, d) {
    var k = el._k || 0;
    el.innerHTML = '<div class="dc"><div class="st"><span class="op" style="background:var(--v-bg2);color:var(--v-mut)">ВХОД</span><div class="val">' + esc(d.input) + "</div></div>" +
      d.steps.slice(0, k).map(function (s) { return '<div class="st"><span class="op">' + esc(s.op) + '</span><div class="val">' + esc(s.out) + (s.note ? '<div style="font-family:inherit;color:var(--v-mut);margin-top:4px;font-size:12px;white-space:normal">' + esc(s.note) + "</div>" : "") + "</div></div>"; }).join("") +
      '</div><div class="gr-ctl"><button class="v-b on" data-k="next"' + (k < d.steps.length ? "" : " disabled") + ">" + (k < d.steps.length ? "Шаг " + (k + 1) + ": " + esc(d.steps[k].op) + " →" : "Готово") + '</button><button class="v-b" data-k="reset"' + (k ? "" : " disabled") + ">Сначала</button></div>";
    if (!el._bound) { el._bound = true; el.addEventListener("click", function (e) { var b = e.target.closest("[data-k]"); if (!b) return; el._k = b.dataset.k === "next" ? Math.min(d.steps.length, (el._k || 0) + 1) : 0; decode(el, d); }); }
  }

  // ---------- 13. до / после ----------
  function diffLines(a, b) {
    var n = a.length, m = b.length, dp = [];
    for (var i = 0; i <= n; i++) { dp[i] = []; for (var j = 0; j <= m; j++) dp[i][j] = 0; }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    var L = [], R = []; i = 0; j = 0;
    while (i < n && j < m) { if (a[i] === b[j]) { L.push(["eq", a[i]]); R.push(["eq", b[j]]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { L.push(["del", a[i++]]); } else { R.push(["add", b[j++]]); } }
    while (i < n) L.push(["del", a[i++]]); while (j < m) R.push(["add", b[j++]]);
    return [L, R];
  }
  function diff(el, d) {
    var r = diffLines(d.a.lines, d.b.lines);
    function col(t, rows) { return "<div><h4>" + esc(t) + "</h4><pre>" + rows.map(function (x) { return '<div class="' + x[0] + '">' + esc(x[1]) + "</div>"; }).join("") + "</pre></div>"; }
    el.innerHTML = '<div class="df">' + col(d.a.title, r[0]) + col(d.b.title, r[1]) + '</div><div class="v-legend"><span><i style="background:var(--v-bad-s);border:1px solid var(--v-bad)"></i>было, исчезло</span><span><i style="background:var(--v-good-s);border:1px solid var(--v-good)"></i>появилось</span></div>';
  }

  // ---------- 14. мини-SIEM ----------
  function siem(el, d) {
    var fcols = d.filter || [];
    el.innerHTML = '<div class="sm-top"><input type="search" aria-label="Поиск по событиям" placeholder="' + esc(d.placeholder || "поиск: IP, пользователь, слово…") + '">' +
      fcols.map(function (ci) { var vals = {}; d.rows.forEach(function (r) { vals[r[ci]] = (vals[r[ci]] || 0) + 1; }); return '<select data-c="' + ci + '" aria-label="' + esc(d.cols[ci]) + '"><option value="">' + esc(d.cols[ci]) + ": все</option>" + Object.keys(vals).sort(function (a, b) { return vals[b] - vals[a]; }).map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + " (" + vals[v] + ")</option>"; }).join("") + "</select>"; }).join("") +
      '<span class="mono" data-cnt style="color:var(--v-mut)"></span></div><div class="sm-wrap"><table class="v-t"><thead><tr>' + d.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody></tbody></table></div>" +
      (d.tasks ? '<div class="v-note"><b>Попробуй:</b> ' + d.tasks.map(esc).join(" · ") + "</div>" : "");
    var inp = el.querySelector("input"), tb = el.querySelector("tbody"), cnt = el.querySelector("[data-cnt]");
    function run() {
      var q = inp.value.trim().toLowerCase(), f = {};
      el.querySelectorAll("select[data-c]").forEach(function (s) { if (s.value) f[s.dataset.c] = s.value; });
      var rows = d.rows.filter(function (r) { for (var c in f) if (String(r[c]) !== f[c]) return false; return !q || r.join(" ").toLowerCase().indexOf(q) >= 0; });
      cnt.textContent = fmt(rows.length) + " из " + fmt(d.rows.length) + " событий";
      var rx = q ? new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi") : null;
      tb.innerHTML = rows.slice(0, 300).map(function (r) { return "<tr>" + r.map(function (v) { var h = esc(v); return "<td>" + (rx ? h.replace(rx, '<mark class="v-hit">$1</mark>') : h) + "</td>"; }).join("") + "</tr>"; }).join("") + (rows.length > 300 ? '<tr><td colspan="' + d.cols.length + '" style="color:var(--v-mut)">… показаны первые 300</td></tr>' : "");
    }
    inp.addEventListener("input", run); el.querySelectorAll("select").forEach(function (s) { s.addEventListener("change", run); });
    if (d.q) inp.value = d.q;
    run();
  }

  // ---------- 15. карточки Event ID ----------
  function event(el, d) {
    var list = Array.isArray(d) ? d : d.cards || [d];
    el.innerHTML = '<div class="ev-grid">' + list.map(function (c) {
      return '<article class="ev" style="--k:' + kindColor(c.kind) + '"><div class="top"><span class="id">' + esc(c.id) + '</span><span class="nm">' + esc(c.name) + "<small>" + esc(c.log || "") + "</small></span></div>" +
        (c.fields ? "<dl>" + c.fields.map(function (f) { return "<dt>" + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd>"; }).join("") + "</dl>" : "") +
        (c.look ? '<div class="look"><b>На что смотреть:</b> ' + esc(c.look) + "</div>" : "") + "</article>";
    }).join("") + "</div>";
  }

  // ---------- 16. матрица «где видно» ----------
  function matrix(el, d) {
    var sym = [['<span class="n">·</span>', "не видно"], ['<span class="p">◐</span>', "частично"], ['<span class="y">●</span>', "хорошо видно"]];
    el.innerHTML = '<div class="v-scroll"><table class="v-t mx"><thead><tr><th>Что ищем</th>' + d.cols.map(function (c) { return '<th style="text-align:center">' + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      d.rows.map(function (r) { return "<tr><td>" + esc(r.name) + (r.id ? ' <span class="mono" style="color:var(--v-mut)">' + esc(r.id) + "</span>" : "") + "</td>" + r.v.map(function (v, i) { return '<td class="c" title="' + esc(d.cols[i] + ": " + sym[v][1]) + '">' + sym[v][0] + "</td>"; }).join("") + "</tr>"; }).join("") +
      '</tbody></table></div><div class="v-legend">' + sym.slice().reverse().map(function (s) { return "<span>" + s[0] + " " + s[1] + "</span>"; }).join("") + "</div>";
  }

  // ---------- 17. калькулятор приоритета ----------
  function severity(el, d) {
    var sel = el._sel || d.factors.map(function (f) { return f.def || 0; });
    var score = d.factors.reduce(function (a, f, i) { return a + f.opts[sel[i]][1]; }, 0);
    // «шлагбаум»: если у фактора с gate выбран вариант с 0 баллов, итог обнуляется (например, уязвимого продукта у нас нет)
    var gated = d.factors.some(function (f, i) { return f.gate && f.opts[sel[i]][1] === 0; });
    if (gated) score = 0;
    var max = d.factors.reduce(function (a, f) { return a + Math.max.apply(null, f.opts.map(function (o) { return o[1]; })); }, 0);
    var lvl = d.levels.filter(function (l) { return score >= l[0]; }).pop() || d.levels[0];
    el.innerHTML = '<div class="sv">' + d.factors.map(function (f, i) {
      return '<div class="f"><span>' + esc(f.name) + '</span><div class="v-row">' + f.opts.map(function (o, j) { return '<button type="button" class="v-b" data-f="' + i + '" data-o="' + j + '" aria-pressed="' + (sel[i] === j) + '">' + esc(o[0]) + "</button>"; }).join("") + "</div></div>";
    }).join("") + '<div class="g"><i style="left:calc(' + (score / max * 100).toFixed(1) + '% - 2px)"></i></div><div class="res">Приоритет: <b style="color:' + kindColor(lvl[2]) + '">' + esc(lvl[1]) + '</b><span style="color:var(--v-mut)">' + score + " из " + max + " баллов</span></div>" + (lvl[3] ? '<div class="v-note">' + esc(lvl[3]) + "</div>" : "") + "</div>";
    if (!el._bound) { el._bound = true; el.addEventListener("click", function (e) { var b = e.target.closest("[data-f]"); if (!b) return; var s = (el._sel || d.factors.map(function (f) { return f.def || 0; })).slice(); s[+b.dataset.f] = +b.dataset.o; el._sel = s; severity(el, d); }); }
  }

  // ---------- 18. интерфейсы инструментов ----------
  function ui(el, d) {
    var sel = el._sel == null ? (d.sel || 0) : el._sel, h = "";
    var bar = '<div class="bar"><i></i><i></i><i></i><b>' + esc(d.title || d.app) + "</b></div>";
    function table(cls) {
      return '<div class="v-scroll" style="max-height:260px"><table class="v-t' + (cls ? " " + cls : "") + '"><thead><tr>' + d.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        d.rows.map(function (r, i) { var bg = d.colors && d.colors[i] ? ' style="background:' + d.colors[i] + '"' : ""; return '<tr data-i="' + i + '" class="' + (i === sel ? "sel" : "") + '"' + bg + ">" + r.map(function (v) { return '<td class="mono">' + esc(v) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
    }
    if (d.app === "splunk") {
      var hm = Math.max.apply(null, (d.hist || [1]).concat([1]));
      h = bar + '<div class="q">' + esc(d.query) + '</div><div style="padding:0 10px 4px;color:var(--v-mut)">' + esc(d.count || "") + '</div><div style="display:flex;gap:2px;align-items:flex-end;height:44px;padding:0 10px 8px">' + (d.hist || []).map(function (v) { return '<span style="flex:1;background:var(--v-good);height:' + Math.max(2, v / hm * 100) + '%;border-radius:1px"></span>'; }).join("") + "</div>" + table();
    } else if (d.app === "wireshark") {
      h = bar + (d.filter ? '<div class="q" style="background:var(--v-good-s)">' + esc(d.filter) + "</div>" : "") + table("ws");
    } else {
      h = bar + table();
    }
    var det = d.detail && d.detail[sel];
    if (det) h += '<div class="det">' + esc(Array.isArray(det) ? det.join("\n") : det) + "</div>";
    el.innerHTML = '<div class="ui">' + h + "</div>" + (d.detail ? '<div class="v-legend"><span>Нажми на строку — покажу подробности.</span></div>' : "");
    if (!el._bound) { el._bound = true; el.addEventListener("click", function (e) { var r = e.target.closest("tr[data-i]"); if (r && d.detail) { el._sel = +r.dataset.i; ui(el, d); } }); }
  }

  // ---------- 20. карта мира ----------
  var worldP = null;
  function map(el, d) {
    if (!worldP) worldP = fetch(new URL("world.json", BASE)).then(function (r) { return r.json(); });
    el.innerHTML = '<div class="v-legend">Загружаю карту…</div>';
    worldP.then(function (w) {
      var c = d.counts || {}, max = Math.max.apply(null, Object.values(c).concat([1])), top = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
      var names = d.names || {};
      var paths = Object.keys(w.p).map(function (k) {
        var v = c[k] || 0, pct = v ? Math.round(25 + 75 * Math.sqrt(v / max)) : 0;
        return '<path d="' + w.p[k] + '" fill="' + (pct ? "color-mix(in srgb,var(--v-bad) " + pct + "%,var(--v-bg2))" : "var(--v-bg2)") + '"><title>' + esc((names[k] || k) + (v ? ": " + fmt(v) + " " + (d.unit || "") : "")) + "</title></path>";
      }).join("");
      el.innerHTML = '<div class="mp"><svg viewBox="0 0 ' + w.w + " " + w.h + '" role="img" aria-label="Карта источников">' + paths + '</svg><div class="tn" style="grid-template-columns:auto 1fr auto">' +
        top.slice(0, 8).map(function (k) { return '<span class="l">' + esc(names[k] || k) + '</span><span class="b bad" style="width:' + (c[k] / max * 100).toFixed(1) + '%"></span><span class="n">' + fmt(c[k]) + "</span>"; }).join("") + "</div></div>" +
        '<div class="v-legend"><span>' + esc(d.unit || "") + "</span>" + (d.attr ? "<span>" + esc(d.attr) + "</span>" : "") + "</div>";
    }).catch(function () { el.innerHTML = '<div class="v-legend">Карта не загрузилась.</div>'; });
  }

  // ---------- обложки глав (19b) ----------
  var KW = [[/dns|домен/i, "dns"], [/http|веб|web|сайт/i, "browser"], [/linux|терминал|bash|ssh/i, "terminal"], [/windows|реестр|registry/i, "desktop"], [/active directory|домен|kerberos|\bad\b/i, "dc"],
    [/сет|network|lan|osi|пакет|packet|tcp|ip\b/i, "router"], [/лог|log|журнал|событ/i, "log"], [/атак|offensive|взлом|attack/i, "attacker"], [/защит|defen|оборон/i, "shield"], [/поиск|search|osint|оператор/i, "search"],
    [/фишинг|почт|mail|письм/i, "mail"], [/шифр|крипт|ключ|crypt|hash|хеш/i, "key"], [/уязвим|vuln|cve|эксплойт/i, "bug"], [/smb|файл|file/i, "file"], [/sql|баз[аы] данных|database/i, "db"], [/облак|cloud|azure/i, "cloud"], [/вспомни|recall/i, "search"], [/сюжет|инцидент|алерт|смен/i, "alert"]];
  var BIND = { "01": "#2f6b5a", "02": "#2c4f7c", "03": "#8a3b2e", "04": "#5a3f78", "05": "#1f6f86" };
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rnd(seed) { return function () { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function coverSvg(title, seed) {
    var r = rnd(seed), s = ['<svg viewBox="0 0 600 92" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'], kind = seed % 3;
    if (kind === 0) for (var i = 0; i < 26; i++) { var x = r() * 600, y = r() * 92, w = 20 + r() * 120; s.push('<rect x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + (2 + r() * 5).toFixed(1) + '" rx="2" fill="#fff" opacity="' + (0.06 + r() * 0.16).toFixed(2) + '"/>'); }
    else if (kind === 1) for (i = 0; i < 18; i++) { var cx = r() * 600, cy = r() * 92, rr = 6 + r() * 40; s.push('<circle cx="' + cx.toFixed(0) + '" cy="' + cy.toFixed(0) + '" r="' + rr.toFixed(0) + '" fill="none" stroke="#fff" stroke-width="' + (1 + r() * 2).toFixed(1) + '" opacity="' + (0.07 + r() * 0.15).toFixed(2) + '"/>'); }
    else { var pts = []; for (i = 0; i < 14; i++) pts.push([r() * 600, r() * 92]); pts.forEach(function (p, i) { pts.slice(i + 1).forEach(function (q) { if (Math.abs(p[0] - q[0]) < 120) s.push('<line x1="' + p[0].toFixed(0) + '" y1="' + p[1].toFixed(0) + '" x2="' + q[0].toFixed(0) + '" y2="' + q[1].toFixed(0) + '" stroke="#fff" opacity=".14"/>'); }); s.push('<circle cx="' + p[0].toFixed(0) + '" cy="' + p[1].toFixed(0) + '" r="3" fill="#fff" opacity=".35"/>'); }); }
    s.push('<rect width="600" height="92" fill="url(#thv-cg)"/><defs><linearGradient id="thv-cg" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs></svg>');
    return s.join("");
  }
  function covers(root, pathColor) {
    var heads = Array.prototype.filter.call(root.querySelectorAll("h1[id]"), function (h) { return !h.closest("nav,aside,.toc,.side,#thmr-head"); });
    if (!heads.length) heads = Array.prototype.filter.call(root.querySelectorAll("h2[id]"), function (h) { return !h.closest("nav,aside,.toc,.side") && /^\s*(Глава\s+\d+|\d{1,2}\b)/.test(h.textContent); });
    var n = 0;
    heads.forEach(function (h) {
      if (h.previousElementSibling && h.previousElementSibling.classList.contains("thv-cover")) return;
      var t = (h.textContent || "").replace(/\s+/g, " ").trim(), m = t.match(/(?:Глава|ЧАСТЬ)\s+([IVX]+|\d+)|^(\d{1,2})\b/i);
      var num = m ? (m[1] || m[2]) : null;
      if (!num || /Термин|Связи|MITRE|Вопрос|Проверь|Самопроверк|Практик|Реестр|Шпаргалк|Источник|Отзыв/i.test(t)) return;
      var ic = "file"; for (var i = 0; i < KW.length; i++) if (KW[i][0].test(t)) { ic = KW[i][1]; break; }
      var c = document.createElement("div");
      c.className = "thv-cover"; c.setAttribute("aria-hidden", "true");
      c.style.setProperty("--cv", pathColor);
      c.innerHTML = coverSvg(t, hash(t)) + '<span class="cn">' + String(num).replace(/^0/, "") + '</span><span class="ci">' + icon(ic, 54) + "</span>";
      h.parentNode.insertBefore(c, h); n++;
    });
    return n;
  }

  // ---------- запуск ----------
  var R = { timeline: timeline, hours: hours, topn: topn, baseline: baseline, heat: heat, ptree: ptree, graph: graph, scene: graph, route: route, seq: seq, chain: chain, layers: layers, decode: decode, diff: diff, siem: siem, event: event, matrix: matrix, severity: severity, ui: ui, map: map };
  var RESIZE = { timeline: 1, hours: 1, baseline: 1, graph: 1, scene: 1, route: 1, seq: 1 };
  function render(fig) {
    var type = fig.getAttribute("data-v"), fn = R[type], js = fig.querySelector('script[type="application/json"]');
    if (!fn || !js) return;
    var data; try { data = JSON.parse(js.textContent); } catch (e) { return; }
    var body = fig.querySelector(".thv-body");
    if (!body) { body = document.createElement("div"); body.className = "thv-body"; fig.appendChild(body); }
    try { fn(body, data); } catch (e) { body.innerHTML = '<div class="v-legend">Не получилось нарисовать этот блок.</div>'; }
    if (RESIZE[type] && window.ResizeObserver && !fig._ro) {
      var w0 = fig.clientWidth;
      fig._ro = new ResizeObserver(function () { if (Math.abs(fig.clientWidth - w0) < 8) return; w0 = fig.clientWidth; clearTimeout(fig._t); fig._t = setTimeout(function () { fn(body, data); }, 120); });
      fig._ro.observe(fig);
    }
  }
  window.THV = {
    renderAll: function (root) { Array.prototype.forEach.call((root || document).querySelectorAll("figure.thv[data-v]"), render); },
    covers: covers, icon: icon
  };
})();
