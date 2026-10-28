#!/usr/bin/env python3
"""Подключает к сайту общие куски. Запускать после добавления или правки учебника:  python3 tools/inject.py
- в каждый учебник books/*.html: читалку (assets/reader.js), офлайн-режим и превью ссылки (Open Graph);
- в страницы сайта (index.html и справочники): превью ссылки.
Повторный запуск безопасен: всё вставляется между метками и заменяется целиком."""
import html, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://1luskin.github.io/thm-polka/"
OG_START, OG_END = "<!--thm-og:start-->", "<!--thm-og:end-->"
RD_START, RD_END = "<!--thm-reader:start-->", "<!--thm-reader:end-->"
OLD_RD = re.compile(r"<!--thm-reader-->.*?navigator\.serviceWorker\.register\('\.\./sw\.js'\)\.catch\(function\(\)\{\}\);</script>", re.S)

READER = (
    RD_START
    + '<link rel="manifest" href="../manifest.webmanifest">'
    + '<meta name="theme-color" content="#16212e">'
    + '<script src="../assets/reader.js" defer></script>'
    + "<script>if('serviceWorker' in navigator)navigator.serviceWorker.register('../sw.js').catch(function(){});</script>"
    + RD_END
)


def og(title, desc, url, image):
    e = lambda x: html.escape(x, quote=True)
    return (
        OG_START
        + f'<meta name="description" content="{e(desc)}">'
        + '<meta property="og:type" content="website"><meta property="og:site_name" content="THM Полка"><meta property="og:locale" content="ru_RU">'
        + f'<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}">'
        + f'<meta property="og:url" content="{e(url)}"><meta property="og:image" content="{e(image)}">'
        + '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
        + '<meta name="twitter:card" content="summary_large_image">'
        + '<link rel="icon" href="/thm-polka/assets/favicon.svg" type="image/svg+xml"><link rel="icon" href="/thm-polka/favicon.ico" sizes="32x32">'
        + '<link rel="apple-touch-icon" href="/thm-polka/assets/apple-touch-icon.png">'
        + OG_END
    )


def put_head(s, block):
    """Ставит блок превью между метками; если меток нет — сразу после <title>…</title> (или в начало <head>)."""
    if OG_START in s:
        return re.sub(re.escape(OG_START) + ".*?" + re.escape(OG_END), lambda m: block, s, count=1, flags=re.S)
    m = re.search(r"</title>", s, re.I)
    if m:
        return s[: m.end()] + block + s[m.end():]
    m = re.search(r"<head[^>]*>", s, re.I)
    return s[: m.end()] + block + s[m.end():] if m else block + s


def put_body(s, block):
    s = OLD_RD.sub("", s)
    if RD_START in s:
        return re.sub(re.escape(RD_START) + ".*?" + re.escape(RD_END), lambda m: block, s, count=1, flags=re.S)
    i = s.rfind("</body>")
    return s[:i] + block + s[i:] if i >= 0 else s + block


books = json.loads((ROOT / "books.json").read_text(encoding="utf8"))
changed = 0
for b in books:
    f = ROOT / b["url"]
    if not f.exists() or not b["url"].startswith("books/"):
        continue
    s0 = f.read_text(encoding="utf8")
    desc = (b.get("path", "").split(" ", 1)[-1] + " · " if b.get("path") else "") + (b.get("rooms") or "Учебник с полки THM на пути в SOC Analyst L1")
    s = put_head(s0, og("Учебник: " + b["title"], desc, SITE + b["url"], SITE + f"assets/og/{b['id']}.png"))
    s = put_body(s, READER)
    if s != s0:
        f.write_text(s, encoding="utf8")
        changed += 1
        print("обновил:", f.name)

PAGES = {
    "index.html": ("THM Полка", "Учебники по TryHackMe на пути в SOC Analyst L1: полка с прогрессом, поиск, глоссарий EN/RU/DE, карта MITRE ATT&CK."),
    "path.html": ("Мой путь · THM Полка", "Лента учёбы на пути в SOC: учебники, разборы, бейджи и дни занятий."),
    "search.html": ("Поиск · THM Полка", "Поиск по всем учебникам сразу: Event ID, команды, термины, порты."),
    "glossary.html": ("Глоссарий EN · RU · DE · THM Полка", "Термины SOC и кибербезопасности на английском, русском и немецком."),
    "mitre.html": ("Карта MITRE ATT&CK · THM Полка", "Матрица Enterprise ATT&CK: какие техники разобраны в учебниках и где."),
    "ports.html": ("Порты для SOC · THM Полка", "Порты, которые видит SOC-аналитик, с подсказками и ссылками на учебники."),
    "tools.html": ("Инструменты · THM Полка", "Инструменты SOC-аналитика из учебников: репутация, сеть, Windows, SIEM."),
}
for name, (title, desc) in PAGES.items():
    f = ROOT / name
    if not f.exists():
        continue
    s0 = f.read_text(encoding="utf8")
    url = SITE if name == "index.html" else SITE + name
    s = put_head(s0, og(title, desc, url, SITE + "assets/og/site.png"))
    if s != s0:
        f.write_text(s, encoding="utf8")
        changed += 1
        print("обновил:", name)
print("готово, изменено файлов:", changed)
