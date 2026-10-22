/* Общий слой данных прогресса для полки и «Моего пути».
   Всё хранится в localStorage этого сайта, ключи начинаются с "thm-" (их же переносит «Экспорт»):
   thm-reader:<id>      — состояние учебника из читалки (seen, quiz, marks, bookmarks, pos, readSecs, firstOpen, doneAt)
   thm-reader:summary   — сводка по учебникам от читалки
   thm-reader:days      — секунды чтения по дням
   thm-timer:state      — идущий таймер THM
   thm-timer:days       — секунды THM по дням
   thm-timer:sessions   — журнал занятий THM
   thm-polka-v1         — статусы, оценки и заметки с полки
   thm-badges           — когда получен каждый бейдж */
(function () {
  "use strict";
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function pad(n) { return String(n).padStart(2, "0"); }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseDay(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtDur(s) {
    s = Math.round(s || 0);
    if (s < 60) return s ? "< 1 мин" : "0 мин";
    var h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    if (m === 60) { h++; m = 0; }
    return h ? (h + " ч" + (m ? " " + m + " мин" : "")) : (m + " мин");
  }
  function fmtClock(s) { s = Math.max(0, Math.floor(s)); return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s % 3600 / 60)) + ":" + pad(s % 60); }
  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  // ---------- дни занятий: чтение + THM ----------
  function days() {
    var r = get("thm-reader:days", {}), t = get("thm-timer:days", {}), out = {};
    Object.keys(r).forEach(function (k) { (out[k] = out[k] || { read: 0, thm: 0 }).read += r[k] || 0; });
    Object.keys(t).forEach(function (k) { (out[k] = out[k] || { read: 0, thm: 0 }).thm += t[k] || 0; });
    return out;
  }
  var ACTIVE = 60; // день засчитывается в серию, если занимался хотя бы минуту
  function streak() {
    var d = days(), cur = 0, best = 0, run = 0, keys = Object.keys(d).filter(function (k) { return d[k].read + d[k].thm >= ACTIVE; }).sort();
    var prev = null;
    keys.forEach(function (k) {
      var day = parseDay(k);
      run = prev && Math.round((day - prev) / 864e5) === 1 ? run + 1 : 1;
      best = Math.max(best, run); prev = day;
    });
    var x = new Date();
    if (!(d[dayKey(x)] && d[dayKey(x)].read + d[dayKey(x)].thm >= ACTIVE)) x.setDate(x.getDate() - 1);
    while (d[dayKey(x)] && d[dayKey(x)].read + d[dayKey(x)].thm >= ACTIVE) { cur++; x.setDate(x.getDate() - 1); }
    var t = d[dayKey()] || { read: 0, thm: 0 };
    return { cur: cur, best: Math.max(best, cur), today: t.read + t.thm, todayRead: t.read, todayThm: t.thm };
  }
  function totals(nDays) {
    var d = days(), from = null, s = { read: 0, thm: 0 };
    if (nDays) { from = new Date(); from.setDate(from.getDate() - nDays + 1); from = dayKey(from); }
    Object.keys(d).forEach(function (k) { if (!from || k >= from) { s.read += d[k].read; s.thm += d[k].thm; } });
    s.all = s.read + s.thm;
    return s;
  }

  // ---------- учебник ----------
  function book(id) { return get("thm-reader:" + id, {}) || {}; }
  /* chapters — массив глав из data/chapters.json: [{t, s:[id разделов]}] */
  function bookProgress(id, chapters) {
    var st = book(id), seen = st.seen || {}, pos = st.pos && st.pos.id, total = 0, n = 0;
    var beads = (chapters || []).map(function (c) {
      var k = c.s.filter(function (x) { return seen[x]; }).length;
      total += c.s.length; n += k;
      return { t: c.t, n: c.s.length, seen: k, first: c.s[0], cur: !!(pos && c.s.indexOf(pos) >= 0) };
    });
    var sum = get("thm-reader:summary", {})[id] || {};
    var q = st.quiz || {}, qk = Object.keys(q);
    return {
      total: total, seen: n, pct: total ? Math.round(n / total * 100) : 0, beads: beads,
      quizTotal: sum.quizTotal || 0, quizDone: qk.length, quizOk: qk.filter(function (k) { return q[k]; }).length,
      readSecs: st.readSecs || 0, lastOpen: st.lastOpen || "", lastCh: st.pos && st.pos.title || "",
      marks: (st.marks || []).length, bookmarks: (st.bookmarks || []).length,
      firstOpen: st.firstOpen || "", doneAt: st.doneAt || ""
    };
  }

  // ---------- таймер THM ----------
  var TK = "thm-timer:state";
  function tState() { return get(TK, { running: false, startedAt: 0, firstStart: 0, acc: 0, book: "" }); }
  function tElapsed(s) { s = s || tState(); return s.acc + (s.running ? (Date.now() - s.startedAt) / 1000 : 0); }
  function tStart(bookId) {
    var s = tState();
    if (s.running) return s;
    s.running = true; s.startedAt = Date.now(); if (!s.firstStart) s.firstStart = s.startedAt;
    if (bookId != null) s.book = bookId;
    put(TK, s); return s;
  }
  function tPause() { var s = tState(); if (!s.running) return s; s.acc = tElapsed(s); s.running = false; put(TK, s); return s; }
  function tSetBook(b) { var s = tState(); s.book = b; put(TK, s); }
  function addThm(secs, bookId, end, start) {
    secs = Math.round(secs); if (secs < 1) return;
    end = end || new Date(); start = start || new Date(end - secs * 1000);
    // если занятие перешло через полночь, делим время между днями пропорционально
    var d = get("thm-timer:days", {});
    if (!(start < end)) start = new Date(end - secs * 1000);
    var span = (end - start) / 1000, cur = new Date(start), left = secs;
    while (cur < end && left > 0) {
      var next = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      var segEnd = next < end ? next : end;
      var share = segEnd >= end ? left : Math.min(left, Math.round(secs * ((segEnd - cur) / 1000) / span));
      if (share > 0) d[dayKey(cur)] = (d[dayKey(cur)] || 0) + share;
      left -= share; cur = segEnd;
    }
    put("thm-timer:days", d);
    var log = get("thm-timer:sessions", []);
    log.push({ start: start.toISOString(), end: end.toISOString(), secs: secs, book: bookId || "" });
    put("thm-timer:sessions", log.slice(-2000));
  }
  function tStop(secsOverride) {
    var s = tState(), secs = secsOverride != null ? secsOverride : tElapsed(s);
    addThm(secs, s.book, new Date(), s.firstStart ? new Date(s.firstStart) : null);
    put(TK, { running: false, startedAt: 0, firstStart: 0, acc: 0, book: s.book });
    return secs;
  }
  function tReset() { var s = tState(); put(TK, { running: false, startedAt: 0, firstStart: 0, acc: 0, book: s.book }); }
  function thmByBook() {
    var out = {};
    get("thm-timer:sessions", []).forEach(function (x) { if (x.book) out[x.book] = (out[x.book] || 0) + x.secs; });
    return out;
  }

  // ---------- полка (статусы, оценки) ----------
  function shelf() { return get("thm-polka-v1", { state: {}, added: [], removed: [] }); }

  // ---------- бейджи ----------
  function stats(books, chaptersMap) {
    var done = 0, pathAll = {}, sniper = false, quizDone = 0, marks = 0, passed = 0, sh = shelf();
    books.forEach(function (b) {
      var p = bookProgress(b.id, chaptersMap[b.id]);
      var fin = p.total > 0 && p.seen >= p.total;
      if (fin) done++;
      var key = b.path || "";
      pathAll[key] = pathAll[key] || { n: 0, done: 0 }; pathAll[key].n++; if (fin) pathAll[key].done++;
      if (p.quizTotal > 0 && p.quizDone >= p.quizTotal && p.quizOk >= p.quizTotal) sniper = true;
      quizDone += p.quizDone; marks += p.marks;
      if ((sh.state[b.id] || {}).status === "passed") passed++;
    });
    var path = Object.keys(pathAll).some(function (k) { return k !== "Вне курса" && pathAll[k].n > 0 && pathAll[k].done >= pathAll[k].n; });
    var tot = totals(), s = streak();
    return { done: done, path: path, sniper: sniper, quizDone: quizDone, marks: marks, passed: passed, readSecs: tot.read, thmSecs: tot.thm, allSecs: tot.all, best: s.best };
  }
  var BADGES = [
    { id: "first", g: "1", t: "Первый шаг", d: "Первая минута в учебнике", v: function (s) { return [Math.min(s.readSecs, 60), 60]; } },
    { id: "book1", g: "1", t: "Первый учебник", d: "Дочитать учебник до конца", v: function (s) { return [s.done, 1]; } },
    { id: "book3", g: "3", t: "Три учебника", d: "Дочитать три учебника", v: function (s) { return [s.done, 3]; } },
    { id: "path", g: "→", t: "Путь пройден", d: "Дочитать все учебники одного пути THM", v: function (s) { return [s.path ? 1 : 0, 1]; } },
    { id: "streak3", g: "3д", t: "Три дня подряд", d: "Заниматься три дня без пропуска", v: function (s) { return [s.best, 3]; } },
    { id: "streak7", g: "7д", t: "Неделя без пропусков", d: "Серия из семи дней", v: function (s) { return [s.best, 7]; } },
    { id: "streak30", g: "30д", t: "Месяц без пропусков", d: "Серия из тридцати дней", v: function (s) { return [s.best, 30]; } },
    { id: "h10", g: "10ч", t: "10 часов", d: "Всего 10 часов учёбы: чтение и THM", v: function (s) { return [Math.floor(s.allSecs / 3600), 10]; } },
    { id: "h50", g: "50ч", t: "50 часов", d: "Всего 50 часов учёбы", v: function (s) { return [Math.floor(s.allSecs / 3600), 50]; } },
    { id: "thm5", g: "THM", t: "Практик", d: "5 часов в комнатах THM по таймеру", v: function (s) { return [Math.floor(s.thmSecs / 3600), 5]; } },
    { id: "sniper", g: "✓", t: "Снайпер", d: "Все квизы учебника верно с первой попытки", v: function (s) { return [s.sniper ? 1 : 0, 1]; } },
    { id: "quiz50", g: "50", t: "50 квизов", d: "Ответить на 50 квизов", v: function (s) { return [s.quizDone, 50]; } },
    { id: "marker", g: "Aa", t: "Маркер", d: "10 выделений в учебниках", v: function (s) { return [s.marks, 10]; } },
    { id: "razbor", g: "★", t: "Разбор сдан", d: "Первый учебник со статусом «разбор сдан»", v: function (s) { return [s.passed, 1]; } }
  ];
  function badges(books, chaptersMap) {
    var s = stats(books, chaptersMap), got = get("thm-badges", {}), fresh = [];
    var list = BADGES.map(function (b) {
      var v = b.v(s), earned = v[0] >= v[1];
      if (earned && !got[b.id]) { got[b.id] = new Date().toISOString(); fresh.push(b); }
      return { id: b.id, g: b.g, t: b.t, d: b.d, have: Math.min(v[0], v[1]), need: v[1], earned: !!got[b.id], at: got[b.id] || "" };
    });
    if (fresh.length) put("thm-badges", got);
    return { list: list, fresh: fresh };
  }

  window.TP = {
    get: get, put: put, dayKey: dayKey, parseDay: parseDay, fmtDur: fmtDur, fmtClock: fmtClock, plural: plural,
    days: days, streak: streak, totals: totals, book: book, bookProgress: bookProgress, shelf: shelf,
    timer: { state: tState, elapsed: tElapsed, start: tStart, pause: tPause, stop: tStop, reset: tReset, setBook: tSetBook, add: addThm, byBook: thmByBook },
    badges: badges
  };
})();
