/* Общее для справочных страниц: навигация, список учебников, ссылки на разделы, отметка «прочитано». */
(function () {
  var PAGES = [
    ["index.html", "Полка"], ["path.html", "Мой путь"], ["search.html", "Поиск"], ["glossary.html", "Глоссарий"],
    ["mitre.html", "MITRE ATT&CK"], ["ports.html", "Порты"], ["tools.html", "Инструменты"]
  ];
  var here = location.pathname.split("/").pop() || "index.html";
  var nav = document.querySelector("nav.site");
  if (nav) nav.innerHTML = PAGES.map(function (p, i) {
    return '<a href="' + p[0] + '"' + (i === 0 ? ' class="home"' : "") + (p[0] === here ? ' aria-current="page"' : "") + ">" + (i === 0 ? "← " : "") + p[1] + "</a>";
  }).join("");

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  var readCache = {};
  function isRead(book, sec) {
    if (!(book in readCache)) readCache[book] = (get("thm-reader:" + book, {}) || {}).seen || {};
    return !!(sec && readCache[book][sec]);
  }
  var titles = {};
  var booksP = fetch("books.json").then(function (r) { return r.json(); }).then(function (list) {
    list.forEach(function (b) { titles[b.id] = b.title; });
    return list;
  }).catch(function () { return []; });
  function link(ref, label) {
    var href = "books/" + encodeURIComponent(ref.book) + ".html" + (ref.sec ? "#" + encodeURIComponent(ref.sec) : "");
    return '<a href="' + href + '"' + (isRead(ref.book, ref.sec) ? ' class="read" title="Раздел прочитан"' : "") + ">" + esc(label || ((titles[ref.book] || ref.book) + " · " + ref.title)) + "</a>";
  }
  function refs(list, max) {
    max = max || 6;
    var h = list.slice(0, max).map(function (r) { return link(r); }).join("");
    if (list.length > max) h += '<span class="count">ещё ' + (list.length - max) + "</span>";
    return '<div class="refs">' + h + "</div>";
  }
  function norm(s) { return String(s || "").toLowerCase().replace(/ё/g, "е"); }
  function data(name) { return fetch("data/" + name).then(function (r) { if (!r.ok) throw 0; return r.json(); }); }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
  window.Site = { esc: esc, get: get, isRead: isRead, books: booksP, titles: titles, link: link, refs: refs, norm: norm, data: data };
})();
