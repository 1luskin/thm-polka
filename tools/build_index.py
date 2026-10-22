#!/usr/bin/env python3
"""Собирает справочные данные сайта из учебников в books/.
Запуск после добавления или правки учебника:  python3 tools/build_index.py
Пишет: data/search.json, data/chapters.json, data/glossary.json, data/mitre.json, data/ports.json, data/tools.json"""
import json, pathlib, re, sys
from bs4 import BeautifulSoup, NavigableString, Comment

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from refdata import PORTS, TOOLS

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
SKIP = {"script", "style", "noscript", "svg", "nav", "aside", "template"}
SKIP_CLASS = {"toc", "side", "topbar", "mtop", "progress"}


HEADS = ["h1", "h2"]  # разделы учебника — заголовки h1/h2 с id (их же считает читалка)


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


def skipped(tag):
    for p in [tag] + list(tag.parents):
        if getattr(p, "name", None) in SKIP:
            return True
        cls = p.get("class") if hasattr(p, "get") else None
        if cls and SKIP_CLASS.intersection(cls):
            return True
        if getattr(p, "get", None) and p.get("id") == "thmr":
            return True
    return False


def sections(soup):
    """Делит учебник на разделы по h2 с id. Раздел до первого h2 — «Начало»."""
    root = soup.select_one("main.content") or soup.select_one("main") or soup.select_one(".wrap") or soup.body
    out = [{"id": "", "title": "Начало", "parts": [], "el": []}]
    for node in root.descendants:
        if getattr(node, "name", None) in HEADS and node.get("id") and not skipped(node):
            out.append({"id": node["id"], "title": norm(node.get_text(" ")), "parts": [], "el": [node]})
            continue
        if isinstance(node, NavigableString) and not isinstance(node, Comment):
            if node.parent and node.parent.name in HEADS and node.parent.get("id"):
                continue
            if skipped(node.parent):
                continue
            out[-1]["parts"].append(str(node))
    for s in out:
        s["text"] = norm(" ".join(s.pop("parts")))
    return root, [s for s in out if s["text"] or s["id"]]


def section_of(el, root):
    """id ближайшего заголовка раздела перед элементом."""
    h = el.find_previous(HEADS, id=True)
    while h is not None and skipped(h):
        h = h.find_previous(HEADS, id=True)
    return (h["id"], norm(h.get_text(" "))) if h is not None else ("", "Начало")


books = json.loads((ROOT / "books.json").read_text(encoding="utf8"))
attack = json.loads((ROOT / "tools/attack/enterprise-compact.json").read_text(encoding="utf8"))
tech = {t["id"]: t for t in attack["techniques"]}

search, glossary, mitre_seen, ports_seen, tools_seen, chapters = [], {}, {}, {}, {}, {}


def chapters_of(soup):
    """Главы учебника для бусин на полке: [{t: название, s: [id разделов]}].
    Разделы — все h1/h2 с id (их же считает читалка). Глава — пункт верхнего уровня оглавления (.toc a.t1),
    иначе каждый h1 с id, а если и их нет — каждый раздел сам себе глава."""
    h2s = [h for h in soup.find_all(HEADS, id=True) if not skipped(h)]
    ids = [h["id"] for h in h2s]
    pos = {h["id"]: i for i, h in enumerate(h2s)}
    starts = []
    for a in soup.select(".toc a.t1, #toc a.t1"):
        href = a.get("href", "")
        if not href.startswith("#"):
            continue
        el = soup.find(id=href[1:])
        if el is None:
            continue
        if el.get("id") not in pos:
            el = el.find_next(HEADS, id=True)
        if el is not None and el.get("id") in pos:
            starts.append(pos[el["id"]])
    if not starts:
        starts = [i for i, h in enumerate(h2s) if h.name == "h1"]
    starts = sorted(set(starts))
    if not starts:
        return [{"t": norm(h.get_text(" ")), "s": [h["id"]]} for h in h2s]
    out = []
    if starts[0] > 0:
        out.append({"t": "Начало", "s": ids[: starts[0]]})
    for n, st in enumerate(starts):
        end = starts[n + 1] if n + 1 < len(starts) else len(ids)
        out.append({"t": norm(h2s[st].get_text(" ")), "s": ids[st:end]})
    return out
PORT_RX = [
    r"[Пп]орт(?:а|у|ом|е|ы|ов|ам|ах)?\s*(?:№\s*)?(\d{1,5})",
    r"\b[Pp]orts?\s+(\d{1,5})",
    r"\b(\d{1,5})/(?:tcp|udp|TCP|UDP)\b",
    r"\b(?:TCP|UDP)[/ ](\d{1,5})\b",
]


def port_key(n):
    for p in PORTS:
        for part in re.split(r",\s*", p[0]):
            a, _, b = part.partition("–")
            if int(a) <= n <= int(b or a):
                return p[0]
    return None


def add(dic, key, ref):
    lst = dic.setdefault(key, [])
    if not any(r["book"] == ref["book"] and r["sec"] == ref["sec"] for r in lst):
        lst.append(ref)


for b in books:
    path = ROOT / b["url"]
    if not path.exists():
        continue
    soup = BeautifulSoup(path.read_text(encoding="utf8"), "lxml")
    chapters[b["id"]] = chapters_of(soup)
    root, secs = sections(soup)
    for s in secs:
        ref = {"book": b["id"], "sec": s["id"], "title": s["title"]}
        search.append({"b": b["id"], "s": s["id"], "t": s["title"], "x": s["text"][:20000]})
        for tid in set(re.findall(r"\bT\d{4}(?:\.\d{3})?\b", s["text"])):
            if tid in tech:
                add(mitre_seen, tid, ref)
        for rx in PORT_RX:
            for m in re.findall(rx, s["text"]):
                k = port_key(int(m))
                if k:
                    add(ports_seen, k, ref)
        for name, rx, *_ in TOOLS:
            if re.search(rx, s["text"]):
                add(tools_seen, name, ref)
    # глоссарий: таблицы EN / RU / DE
    for t in root.find_all("table"):
        heads = [norm(th.get_text(" ")) for th in t.find_all("th")]
        if heads[:3] != ["EN", "RU", "DE"]:
            continue
        sid, stitle = section_of(t, root)
        for tr in t.find_all("tr"):
            cells = [norm(td.get_text(" ")) for td in tr.find_all("td")]
            if len(cells) < 3 or not cells[0]:
                continue
            key = cells[0].lower()
            g = glossary.setdefault(key, {"en": cells[0], "ru": cells[1], "de": cells[2], "refs": []})
            if not any(r["book"] == b["id"] and r["sec"] == sid for r in g["refs"]):
                g["refs"].append({"book": b["id"], "sec": sid, "title": stitle})
            if len(cells[1]) > len(g["ru"]):
                g["ru"] = cells[1]
            if len(cells[2]) > len(g["de"]):
                g["de"] = cells[2]


def dump(name, obj):
    (DATA / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    print(f"{name}: {(DATA / name).stat().st_size // 1024} КБ")


dump("search.json", search)
dump("chapters.json", chapters)
dump("glossary.json", sorted(glossary.values(), key=lambda g: g["en"].lower()))

# MITRE: полная матрица текущей версии + где встречалось в учебниках
used = set(mitre_seen)
for tid in list(used):
    if "." in tid:
        used.add(tid.split(".")[0])
dump("mitre.json", {
    "version": attack["version"], "modified": attack["modified"], "tactics": attack["tactics"],
    "techniques": [t for t in attack["techniques"] if not t.get("status") or t["id"] in used],
    "seen": mitre_seen,
})
dump("ports.json", [{"port": p[0], "proto": p[1], "service": p[2], "note": p[3], "refs": ports_seen.get(p[0], [])} for p in PORTS])
dump("tools.json", [{"name": t[0], "url": t[2], "cat": t[3], "note": t[4], "refs": tools_seen.get(t[0], [])} for t in TOOLS if t[0] in tools_seen])
print("глоссарий терминов:", len(glossary), "| техник ATT&CK в учебниках:", len(mitre_seen), "| портов:", len(ports_seen), "| инструментов:", len(tools_seen))
