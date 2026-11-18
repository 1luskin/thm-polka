#!/usr/bin/env python3
"""Сверка учебника со скиллом thm-textbook (шаг 5): главы по порядку и «Минимуму на подтему»,
непоясненные термины, объём против эталона, блоки учебника, квизы, ATT&CK, вёрстка.

Запуск:
  python3 tools/check_book.py books/<id>.html                # весь учебник
  python3 tools/check_book.py books/<id>.html --chapter 2    # одна глава (после её написания)
  python3 tools/check_book.py books/<id>.html --partial      # учебник в работе: блоки учебника не проверять
  --known "термин1,термин2"   — термины, уже объяснённые раньше (прошлые главы/учебники)
  --terms                      — показать и найденные объяснения терминов, не только проблемы

Выход 1, если есть проблемы. Термины — кандидаты: список проверяет человек, но каждый пункт надо
либо объяснить в тексте, либо добавить в STOP (если это не термин).
"""
import json, re, sys, pathlib, html as H

ROOT = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
page = pathlib.Path(args[0]).read_text()
ONLY = int(args[args.index("--chapter") + 1]) if "--chapter" in args else None
PARTIAL = "--partial" in args or ONLY is not None
SHOW_TERMS = "--terms" in args
KNOWN_EXTRA = [x.strip() for x in args[args.index("--known") + 1].split(",")] if "--known" in args else []

main = page[page.index('<main class="content">'): page.index("</main>")]
parts = re.split(r'(?=<h1 id="s\d+")', main)
sections = []  # (title, html)
for p in parts:
    m = re.match(r"<h1[^>]*>(.*?)</h1>", p, re.S)
    if m:
        sections.append((H.unescape(re.sub("<[^>]+>", "", m.group(1))).strip(), p))
heads = {t: c for t, c in sections}


def strip_code(s):
    s = re.sub(r"<script.*?</script>", " ", s, flags=re.S)
    s = re.sub(r"<(pre|code)[^>]*>.*?</\1>", " ", s, flags=re.S)
    return s


def text(s, keep_code=False):
    s = re.sub(r"<script.*?</script>", " ", s, flags=re.S)
    if not keep_code:
        s = re.sub(r"<pre[^>]*>.*?</pre>", " ", s, flags=re.S)
    s = re.sub(r"<(br|/p|/li|/h\d|/tr|/td|/th|/div)[^>]*>", "\n", s)
    return re.sub(r"[ \t]+", " ", H.unescape(re.sub("<[^>]+>", " ", s)))


def words(s):
    return len(text(s, keep_code=True).split())


problems, notes = [], []

# ---------- эталон ----------
ET = (ROOT / "tools/etalon-glava.md").read_text()
et_body = re.sub(r"^>.*$", "", ET, flags=re.M)
et_ch = et_body[et_body.index("# Глава 1"):]
SERVICE = re.compile(r"Аналогия|Ты на смене|Сначала слова|Копнуть глубже|Выжимка|Термин|Связи|Мини-квиз|Как сказать|Сделай сам|В тикет|Вживую")
et_subs = [s for s in re.findall(r"^## (.+)$", et_ch, flags=re.M) if not SERVICE.search(s)]
ET_PER_SUB = len(et_ch.split()) // max(1, len(et_subs))

# ---------- главы ----------
ORDER = ["Ты на смене", "Аналогия", "Сначала слова", "Вживую", "Копнуть глубже", "Мини-квиз", "Выжимка", "Термины", "Связи"]
# на подтему проверяем «зачем на смене» и наличие механизма (вывод/пример);
# «если не получилось», «ошибка новичка», «В тикет», «Сделай сам» — на уровне главы
SUB_NA = r"<strong>На смене[:.]?</strong>"
SUB_MECH = r"<pre|<strong>Как устроено"
CH_NEED = [
    ("«Если не получилось» хотя бы раз", r"<strong>Если не получилось[:.]?</strong>", 1),
    ("«Ошибка новичка» хотя бы раз", r"<strong>Ошибк[аи] новичк\w*[:.]?</strong>", 1),
    ("строка «В тикет»", r"<strong>В тикет[:.]?</strong>", 1),
    ("«Сделай сам»", r">Сделай сам<", 1),
]


def chapter_rows():
    n = 0
    for title, c in sections:
        if not title.startswith("Глава"):
            continue
        n += 1
        if ONLY and n != ONLY:
            continue
        yield n, title, c


print(f"Эталон: {ET_PER_SUB} слов на подтему ({len(et_subs)} подтем)")
print("Глава | важн | верд | порядок | подтем | слов | на подтему | квизов | проблемы")
for n, title, c in chapter_rows():
    cp = []
    lvl = re.search(r'class="ch-level" data-l="(\w+)"', c)
    lvl = lvl.group(1) if lvl else None
    if not lvl:
        cp.append("нет плашки важности")
    room = "(" in title
    verdict = re.search(r'class="thm-verdict" data-v="(\w+)"', c)
    if room and not verdict:
        cp.append("нет плашки вердикта")
    # h2 по порядку
    h2s = [(H.unescape(re.sub("<[^>]+>", "", m.group(1))).strip(), m.start()) for m in re.finditer(r"<h2[^>]*>(.*?)</h2>", c, re.S)]
    names = [h for h, _ in h2s]
    pos = []
    for k in ORDER:
        idx = next((i for i, h in enumerate(names) if h.startswith(k)), None)
        if idx is None:
            if k == "Мини-квиз" and lvl != "must" and 'class="qz"' not in c:
                continue
            cp.append(f"нет «{k}»")
        else:
            pos.append((k, idx))
    head_order = [k for k, _ in sorted(pos, key=lambda x: x[1])]
    want = [k for k in ORDER if k in head_order]
    # «Вживую» и подтемы между «Словами» и «Копнуть глубже»; остальное — строго по списку
    if head_order != want:
        cp.append("порядок блоков: " + " → ".join(head_order))
    subs = []
    for i, (h, st) in enumerate(h2s):
        if SERVICE.search(h):
            continue
        en = h2s[i + 1][1] if i + 1 < len(h2s) else len(c)
        subs.append((h, c[st:en]))
    # на подтему: «зачем на смене» + механизм (вывод или «Как устроено»)
    for h, sc in subs:
        if not re.search(SUB_NA, sc):
            cp.append(f"«{h[:38]}»: нет «На смене:»")
        if not re.search(SUB_MECH, sc):
            cp.append(f"«{h[:38]}»: нет механизма (вывод команды / «Как устроено»)")
    # на уровне главы
    for nm, rx, cnt in CH_NEED:
        if len(re.findall(rx, c)) < cnt:
            cp.append(f"нет: {nm}")
    if len(subs) > 6:
        mid_q = [m.start() for m in re.finditer(r'class="qz"', c)]
        first_sub = h2s[[h for h, _ in h2s].index(subs[0][0])][1]
        last_sub_end = c.find("Копнуть глубже")
        if not any(first_sub < q < last_sub_end for q in mid_q):
            cp.append(f"{len(subs)} подтем > 6 и нет мини-квиза посередине")
    # выжимка 3–5 пунктов
    vy = re.search(r"<h2[^>]*>Выжимка</h2>(.*?)(?=<h2|$)", c, re.S)
    if vy:
        k = len(re.findall(r"<li>", vy.group(1)))
        if not 3 <= k <= 5:
            cp.append(f"в выжимке {k} пунктов (нужно 3–5)")
    # термины свёрнуты
    tm = re.search(r"<h2[^>]*>Термины[^<]*</h2>(.*?)(?=<h2|$)", c, re.S)
    if tm and not re.search(r"<details>\s*<summary>Термины EN/RU/DE</summary>.*?<th>EN</th>\s*<th>RU</th>\s*<th>DE</th>", tm.group(1), re.S):
        cp.append("термины не в <details> «Термины EN/RU/DE» с шапкой EN|RU|DE")
    if "Копнуть глубже" in names:
        kg = re.search(r"<h2[^>]*>Копнуть глубже[^<]*</h2>(.*?)(?=<h2|$)", c, re.S)
        if kg and "<details>" not in kg.group(1):
            cp.append("«Копнуть глубже» не в <details>")
    nq = c.count('class="qz"')
    if lvl == "must" and nq < 2:
        cp.append("мини-квиз у must: меньше 2 вопросов")
    w = words(c)
    per = w // max(1, len(subs))
    # каждая подтема — не тоньше половины эталона (среднее прячет тонкие разделы)
    for h, sc in subs:
        sw = words(sc)
        if (lvl == "must" or (verdict and verdict.group(1) == "skip")) and sw < ET_PER_SUB * 0.5:
            cp.append(f"«{h[:38]}»: тонко, {sw} слов при эталоне {ET_PER_SUB} — объяснить глубже по эталону")
    # словарик не длиннее средней подтемы
    sl = next(((h, st) for h, st in h2s if h.startswith("Сначала слова")), None)
    if sl and subs:
        i = [h for h, _ in h2s].index(sl[0])
        en = h2s[i + 1][1] if i + 1 < len(h2s) else len(c)
        slw = words(c[sl[1]:en])
        avg_sub = sum(words(sc) for _, sc in subs) // len(subs)
        if slw > avg_sub:
            cp.append(f"«Сначала слова» ({slw} слов) длиннее средней подтемы ({avg_sub}) — подтемы недописаны или словарик раздут")
    if (lvl == "must" or (verdict and verdict.group(1) == "skip")) and per < ET_PER_SUB * 0.8:
        cp.append(f"коротко: {per} слов на подтему при эталоне {ET_PER_SUB} — дописать по «Минимуму»")
    print(f"{n}. {title[:40]} | {lvl} | {verdict.group(1) if verdict else '—'} | {'✓' if head_order == want else '✗'} | {len(subs)} | {w} | {per} | {nq} | {len(cp)}")
    for p in cp:
        problems.append(f"гл.{n}: {p}")

# ---------- термины ----------
LAT_STOP = set("""I II III IV V VI A B C D E F G H K L M N O P Q R S T U W X Y Z OK ID IDs RU EN DE TP FP L1 L2 L3
Enter Tab Ctrl Cmd Shift Esc Space Spacebar Alt Win Del Backspace Return Option Command Control CTRL
""".split())
STOP_FILE = ROOT / "tools/check_terms_stop.txt"
if STOP_FILE.exists():
    LAT_STOP |= {l.strip() for l in STOP_FILE.read_text().splitlines() if l.strip() and not l.startswith("#")}
RU_TECH = """ядро служб процесс путь порт учётк учетк лог журнал дистрибутив домен хэш хеш сессия сессии права ключ сертификат
сервер терминал оболочк консол команд вывод параметр аргумент переменн конвейер фильтр реестр драйвер протокол
сокет прокси шлюз маск подсет маршрут интерпретатор скрипт сценари цикл условие алиас псевдоним модуль объект свойств
метод кодировк шифр подпис токен привилеги администратор-домена контроллер политик аудит событи кэш буфер поток
идентификатор дескриптор разрешени исполняем расширени каталог корень приглашени флаг ключ""".split()
GLOSS = (ROOT / "tools/check_known.txt")
KNOWN = set(KNOWN_EXTRA)
if GLOSS.exists():
    KNOWN |= {l.strip() for l in GLOSS.read_text().splitlines() if l.strip() and not l.startswith("#")}

EXPL = re.compile(r"^\s*(?:\(|—|–|-\s|:|,\s*(?:то есть|т\. е\.|это)|это\b|значит|называ|означа|по-русски|переводится)", re.I)
EXPL_BEFORE = re.compile(r"(?:называется|называют|зовут|это и есть|по-английски)\s*[«\"]?$", re.I)


SEEN = {}  # термин -> где впервые


def scan_terms(sec_html, label):
    sec_html = re.sub(r'<(\w+)[^>]*lang="de"[^>]*>.*?</\1>', " ", sec_html, flags=re.S)
    sec_html = re.sub(r'<details>\s*<summary>Термины[^<]*</summary>.*?</details>', " ", sec_html, flags=re.S)
    sec_html = re.sub(r'<h2[^>]*>Связи</h2>.*', " ", sec_html, flags=re.S)
    t = text(strip_code(sec_html))
    slova = set()
    for m in re.finditer(r"<p><strong>([^<]{1,80})</strong>", sec_html):
        slova.add(H.unescape(m.group(1)).strip(" .:"))
    dfn = {H.unescape(x) for x in re.findall(r"<dfn>(.*?)</dfn>", sec_html)}
    cands = []
    for m in re.finditer(r"(?<![\w-])([A-Z][a-z]+[A-Z]\w*|[A-Z]{2,}\w*|[A-Z][a-z]{2,}|[a-z]{3,}ing)(?![\w-])", t):
        cands.append((m.group(1), m.start()))
    low = t.lower()
    for stem in RU_TECH:
        m = re.search(r"(?<![а-яё])" + stem, low)
        if m:
            cands.append((stem, m.start()))
    out = []
    local = set()
    for term, at in sorted(cands, key=lambda x: x[1]):
        if term in LAT_STOP or term in local or term in SEEN:
            continue
        local.add(term)
        SEEN[term] = label
        after = t[at + len(term): at + len(term) + 90]
        before = t[max(0, at - 40): at]
        ok = (any(term.lower() in s.lower() for s in slova) or term in dfn or EXPL.search(after)
              or EXPL_BEFORE.search(before) or "— это" in t[at: at + 160])
        known = term in KNOWN or any(term.lower() == k.lower() for k in KNOWN)
        if not ok and not known:
            out.append((term, "не объяснён при первом появлении",
                        t[max(0, at - 60): at + 80].replace("\n", " ")))
        elif SHOW_TERMS:
            notes.append(f"{label}: {term} — объяснён: «{t[at: at + 70].strip()}»")
    return out


print("\nНепоясненные термины (кандидаты, по порядку книги):")
ch_i = 0
nterm = 0
for title, c in sections:
    is_ch = title.startswith("Глава")
    ch_i += is_ch
    res = scan_terms(c, title[:24])
    if ONLY and not (is_ch and ch_i == ONLY):
        continue
    for term, why, ctx in res:
        nterm += 1
        print(f" - [{title[:24]}] {term}: {why} — «{ctx.strip()}»")
        problems.append(f"термин «{term}» ({title[:24]}): {why}")
if not nterm:
    print(" — нет")

# ---------- блоки учебника ----------
q_why = re.findall(r'<button type="button" class="qz-o" data-ok="\d" data-why="([^"]*)"', main)
if any(len(w.strip()) < 8 for w in q_why):
    problems.append(f"квизы: {sum(1 for w in q_why if len(w.strip()) < 8)} вариантов без пояснения")
for m in re.finditer(r'<figure class="thv"[^>]*>.*?<script type="application/json">(.*?)</script>', main, re.S):
    try:
        json.loads(m.group(1))
    except Exception as e:
        problems.append(f"битый JSON в thv: {e}")
if main.count("<table") != main.count('<div class="tablewrap"><table'):
    problems.append("не все таблицы в tablewrap")
if re.search(r"(?<!\S)\[\d+(?:,\s*\d+)*\]", text(strip_code(re.sub(r'<figure class="fb".*?</figure>', " ", main, flags=re.S)))):
    problems.append("ссылки [n] в тексте")
for bad, msg in [('class="thv-ill"', "иллюстрация (убрана из учебников)"), ("Как сказать на смене", "немецкие фразы в главах (убраны)"),
                 (">Пролог", "сквозной сюжет/пролог (убран)"), ("Карта MITRE", "отдельный блок MITRE (убран)"),
                 ("по данным ", "«по данным …» в тексте"), ('>Источники<', "раздел «Источники» (убран)")]:
    if bad in main:
        problems.append(msg)
if "\\|" in main or re.search(r"(?<![\\\w])\\(?=[ *_|])", text(strip_code(main))):
    notes.append("возможны артефакты вёрстки: лишние «\\»")

if not PARTIAL:
    def qn(t):
        return heads[t].count('class="qz"') if t in heads else 0
    BOOK = [
        ("шапка: маршрут", "Маршрут:" in main),
        ("Вспомни прошлое 3–5", 3 <= qn("Вспомни прошлое") <= 5),
        ("разбор строки ≥1", 'class="fb' in main),
        ("Самопроверка 8–10", 8 <= qn("Самопроверка") <= 10),
        ("Практика: триаж", any(t.startswith("Практика") and 'class="tr"' in c for t, c in sections)),
        ("Практика: отчёт по-немецки", any(t.startswith("Практика") and re.search(r"Was.*Wann.*Woher.*Auswirkung.*Empfehlung", text(c), re.S) for t, c in sections)),
        ("Шпаргалка", any(t.startswith("Шпаргалка") for t, _ in sections)),
        ("Отзыв: 3 вопроса", "Отзыв" in heads and len(re.findall(r"<li>", heads["Отзыв"])) >= 3),
    ]
    print()
    for n, ok in BOOK:
        print(("✓ " if ok else "✗ ") + n)
        if not ok:
            problems.append(n)
    # маршрут совпадает с плашками
    route = main[main.find("Маршрут:"): main.find('<h1 id="s1"')]
    for n, title, c in chapter_rows():
        v = re.search(r'class="thm-verdict" data-v="(\w+)"', c)
        if v and {"go": "🧪", "maybe": "🤔", "skip": "⏭"}[v.group(1)] not in route:
            problems.append(f"маршрут в шапке не совпадает с вердиктом гл.{n}")

# ---------- слова-сигналы ----------
for w in ["важно", "запомни", "ключевое", "обязательно"]:
    for m in re.finditer(w, text(strip_code(main)), re.I):
        ctx = text(strip_code(main))[max(0, m.start() - 50): m.start() + 90].replace("\n", " ")
        notes.append(f"«{w}»: проверь, что рядом есть объяснение — «{ctx.strip()}»")

# ---------- ATT&CK ----------
att = json.load(open(ROOT / "tools/attack/enterprise-compact.json"))
tech = att["techniques"]
lookup = tech if isinstance(tech, dict) else {t.get("id"): t for t in tech}
for tid in sorted(set(re.findall(r"\bT\d{4}(?:\.\d{3})?\b", text(main, keep_code=True)))):
    t = lookup.get(tid)
    if t is None:
        problems.append(f"{tid}: нет в ATT&CK {att.get('version')}")
    elif isinstance(t, dict) and t.get("status") == "revoked":
        problems.append(f"{tid}: отозвана, теперь {t.get('by')}")

print("\nЗаметки (проверить глазами):")
for n in notes[:80]:
    print(" ·", n)
print("\nИтог:", "всё на месте" if not problems else f"{len(problems)} проблем")
for p in problems:
    print(" -", p)
sys.exit(1 if problems else 0)
