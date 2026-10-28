/* Офлайн-режим полки. Онлайн: страница полки и список учебников берутся свежими из сети,
   остальное отдаётся из кэша и тихо обновляется. Офлайн: всё из кэша. */
const CACHE = "thm-polka-v10";
const CORE = ["./", "index.html", "books.json", "path.html", "assets/progress.js", "assets/fx.js", "data/chapters.json", "data/times.json", "search.html", "glossary.html", "mitre.html", "ports.html", "tools.html", "assets/site.css", "assets/site.js", "data/search.json", "data/glossary.json", "data/mitre.json", "data/ports.json", "data/tools.json", "assets/reader.js", "assets/viz.js", "assets/icons.js", "assets/world.json", "assets/piper-worker.js", "manifest.webmanifest", "assets/favicon.svg", "assets/icon-192.png", "assets/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    try {
      const list = await (await fetch("books.json", { cache: "no-store" })).json();
      await Promise.all(list.filter((b) => b.url && !/^https?:/.test(b.url)).map((b) => c.add(b.url).catch(() => {})));
    } catch (err) {}
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const path = new URL(req.url).pathname;
  const fresh = req.mode === "navigate" && !/\/books\//.test(path) || /books\.json$|\/data\//.test(path);
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    if (fresh) {
      try {
        const r = await fetch(req, { cache: "no-store" });
        if (r.ok) c.put(req, r.clone());
        return r;
      } catch (err) {
        return (await c.match(req, { ignoreSearch: true })) || (await c.match("index.html")) || Response.error();
      }
    }
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || Response.error();
  })());
});
