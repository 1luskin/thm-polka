#!/usr/bin/env python3
"""Сверка учебника со скиллом thm-textbook: таблица «глава × блок», блоки учебника, объём глав, ID ATT&CK.

Запуск: python3 tools/check_book.py books/<id>.html [--legacy "Глава 6,Глава 7"]
--legacy — главы, оставленные из старой версии: для них блоки показываются, но в ошибки не идут.
"""
import json, re, sys, pathlib, html as H

ROOT = pathlib.Path(__file__).resolve().parent.parent
page = pathlib.Path(sys.argv[1]).read_text()
legacy = []
if "--legacy" in sys.argv:
    legacy = [x.strip() for x in sys.argv[sys.argv.index("--legacy") + 1].split(",")]

main = page[page.index('<main class="content">'): page.index("</main>")]
parts = re.split(r'(?=<h1 id="s\d+")', main)
heads = {re.sub("<[^>]+>", "", re.match(r"<h1[^>]*>(.*?)</h1>", p, re.S).group(1)): p for p in parts if p.startswith("<h1")}


def text(s):
    s = re.sub(r"<script.*?</script>", " ", s, flags=re.S)
    return H.unescape(re.sub("<[^>]+>", " ", s))


def words(s):
    return len(text(s).split())


CH = [
    ("плашка важности", lambda c: 'class="ch-level"' in c),
    ("Ты на смене", lambda c: ">Ты на смене<" in c),
    ("Сначала слова", lambda c: "Сначала слова" in c),
    ("Копнуть глубже", lambda c: "<details>" in c),
    ("EN|RU|DE", lambda c: re.search(r"<th>EN</th>\s*<th>RU</th>\s*<th>DE</th>", c) is not None),
    ("немецкий", lambda c: "Как сказать на смене" in c),
    ("выжимка", lambda c: ">Выжимка<" in c),
    ("связи", lambda c: ">Связи<" in c),
    ("квиз (must)", lambda c: 'data-l="must"' not in c or 'class="qz"' in c),
]
problems = []
print("Глава | " + " | ".join(n for n, _ in CH) + " | вердикт | слов | слов/подтему")
for h, c in heads.items():
    if not h.startswith("Глава"):
        continue
    is_legacy = any(h.startswith(l) for l in legacy)
    row = []
    for n, f in CH:
        ok = f(c)
        row.append("✓" if ok else "✗")
        if not ok and not is_legacy:
            problems.append(f"{h[:40]}: нет «{n}»")
    room = "(" in h
    v = 'class="thm-verdict"' in c
    row.append("✓" if v else ("—" if not room else "✗"))
    subs = len(re.findall(r"<h2", c)) or 1
    print(f"{h[:34]}{' [старая]' if is_legacy else ''} | " + " | ".join(row) + f" | {words(c)} | {words(c)//subs}")

BOOK = [
    ("маршрут в шапке", "Маршрут:" in main),
    ("иллюстрация", 'class="thv-ill"' in main),
    ("чеклист", 'class="ck"' in main),
    ("Вспомни прошлое", "Вспомни прошлое" in heads),
    ("пролог/сюжет", any(h.startswith("Пролог") for h in heads)),
    ("Самопроверка 12–20", "Самопроверка" in heads and 12 <= heads["Самопроверка"].count('class="qz"') <= 20),
    ("Практика", any(h.startswith("Практика") for h in heads)),
    ("Шпаргалка", any(h.startswith("Шпаргалка") for h in heads)),
    ("Отзыв", "Отзыв" in heads),
    ("разбор строки ≥1", 'class="fb' in main),
    ("thv 3–6", 3 <= len(re.findall(r'<figure class="thv"', main)) <= 6),
    ("нет раздела Источники", "Источники" not in heads),
    ("нет ссылок [n]", not re.search(r"\[\d+(?:,\s*\d+)*\]", text(main))),
    ("все таблицы в tablewrap", main.count("<table") == main.count('<div class="tablewrap"><table')),
]
print()
for n, ok in BOOK:
    print(("✓ " if ok else "✗ ") + n)
    if not ok:
        problems.append(n)

# JSON визуальных блоков
for m in re.finditer(r'<figure class="thv"[^>]*>.*?<script type="application/json">(.*?)</script>', main, re.S):
    try:
        json.loads(m.group(1))
    except Exception as e:
        problems.append(f"битый JSON в thv: {e}")

# ID техник ATT&CK
att = json.load(open(ROOT / "tools/attack/enterprise-compact.json"))
tech = att["techniques"]
lookup = tech if isinstance(tech, dict) else {t.get("id"): t for t in tech}
for tid in sorted(set(re.findall(r"\bT\d{4}(?:\.\d{3})?\b", text(main)))):
    t = lookup.get(tid)
    if t is None:
        problems.append(f"{tid}: нет в ATT&CK {att.get('version')}")
    elif isinstance(t, dict) and t.get("status") == "revoked":
        ctx = re.search(rf".{{0,60}}{re.escape(tid)}.{{0,60}}", text(main))
        note = ctx.group(0) if ctx else ""
        if not re.search(r"раньше|ранее|стар", note):
            problems.append(f"{tid}: отозвана, теперь {t.get('by')} — «{note.strip()}»")

print("\nИтог:", "всё на месте" if not problems else f"{len(problems)} проблем")
for p in problems:
    print(" -", p)
sys.exit(1 if problems else 0)
