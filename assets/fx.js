/* Конфетти и тосты для полки и учебников. window.THMFX.confetti(), window.THMFX.toast(text) */
(function () {
  "use strict";
  if (window.THMFX) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COLORS = ["#f0954a", "#c2620a", "#d9b26a", "#2f6b5a", "#2c4f7c", "#8a3b2e", "#5a3f78", "#1f6f86", "#eef1f4"];

  function confetti(opts) {
    if (reduce) return;
    opts = opts || {};
    var cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483600";
    document.body.appendChild(cv);
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    var ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
    var n = opts.count || 140, parts = [], ox = opts.x != null ? opts.x : W / 2, oy = opts.y != null ? opts.y : H * 0.35;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1, sp = 6 + Math.random() * 9;
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 5 + Math.random() * 6, h: 3 + Math.random() * 5,
        r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35, c: COLORS[i % COLORS.length], life: 0 });
    }
    var t0 = performance.now(), dur = 2600;
    (function frame(t) {
      var k = (t - t0) / dur;
      ctx.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.vy += 0.28; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k * k); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); ctx.restore();
      });
      if (k < 1) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  var box = null;
  function toast(text, ms) {
    if (!box) {
      box = document.createElement("div");
      box.setAttribute("role", "status");
      box.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);top:calc(16px + env(safe-area-inset-top,0px));z-index:2147483601;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;max-width:calc(100vw - 32px)";
      document.body.appendChild(box);
    }
    var el = document.createElement("div");
    el.textContent = text;
    el.style.cssText = "background:#16212e;color:#eef1f4;border:1px solid #f0954a;border-radius:999px;padding:9px 16px;font:600 14px/1.3 'Golos Text',system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.25);transition:opacity .3s,transform .3s;opacity:0;transform:translateY(-6px)";
    box.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = "1"; el.style.transform = "none"; });
    setTimeout(function () { el.style.opacity = "0"; setTimeout(function () { el.remove(); }, 350); }, ms || 3200);
  }

  window.THMFX = { confetti: confetti, toast: toast };
})();
