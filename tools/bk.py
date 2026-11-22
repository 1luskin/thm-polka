#!/usr/bin/env python3
"""Разрезать учебник на куски по h1/h2 и собрать обратно.

  python3 bk.py split books/x.html work/x     # куски + order.txt
  python3 bk.py build books/x.html work/x     # собрать из кусков в books/x.html
Сборка перенумеровывает id s1..sN, пересобирает оглавление (nav.toc) и список глав (.ck-list).
"""
import re, sys, pathlib, html as H

cmd, book, wd = sys.argv[1], pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
page = book.read_text()
a = page.index('<main class="content">') + len('<main class="content">')
b = page.index("</main>")
pre, main, post = page[:a], page[a:b], page[b:]


def plain(s):
    return H.unescape(re.sub("<[^>]+>", "", s)).strip()


if cmd == "split":
    wd.mkdir(parents=True, exist_ok=True)
    pieces = re.split(r'(?=<h[12] id="s\d+")', main)
    order = []
    ch = 0
    for i, p in enumerate(pieces):
        m = re.match(r'<h([12]) id="s\d+"[^>]*>(.*?)</h\1>', p, re.S)
        if not m:
            name = "000_head.html"
        else:
            lvl, t = m.group(1), plain(m.group(2))
            if lvl == "1":
                ch += 1
            slug = re.sub(r"[^a-zа-яё0-9]+", "-", t.lower())[:28].strip("-")
            name = f"{i:03d}_{'h1' if lvl == '1' else 'h2'}_{slug}.html"
        (wd / name).write_text(p)
        order.append(name)
    (wd / "order.txt").write_text("\n".join(order) + "\n")
    print(len(order), "кусков в", wd)
    sys.exit()

# ---------- build ----------
order = [l.strip() for l in (wd / "order.txt").read_text().splitlines() if l.strip() and not l.startswith("#")]
body = "".join((wd / n).read_text().rstrip() + "\n" for n in order)
# перенумеровать id
mapping, heads, n = {}, [], 0


def renum(m):
    global n
    n += 1
    old, new = m.group(2), f"s{n}"
    mapping.setdefault(old, new)
    return f'<h{m.group(1)} id="{new}"'


body = re.sub(r'<h([12]) id="([\w-]+)"', renum, body)
_qn = [0]
def _q(m):
    _qn[0] += 1
    return f'<div class="qz" data-q="{_qn[0]}"'
body = re.sub(r'<div class="qz" data-q="\d+"', _q, body)
for m in re.finditer(r'<h([12]) id="(s\d+)"[^>]*>(.*?)</h\1>', body, re.S):
    heads.append((m.group(1), m.group(2), plain(m.group(3))))
# внутренние ссылки на старые id (кроме заголовков, они уже новые) — только если явно помечены data-old
body = re.sub(r'href="#(s\d+)"', lambda m: f'href="#{mapping.get(m.group(1), m.group(1))}"', body)


def short(t, k=31):
    return t if len(t) <= k + 1 else t[:k] + "…"


toc = ['  <nav class="toc" id="toc" aria-label="Содержание">', '    <div class="toc-h">Содержание</div>']
for lvl, i, t in heads:
    toc.append(f'    <a class="t{lvl}" href="#{i}">{H.escape(short(t), quote=False)}</a>')
toc.append("  </nav>")
pre = re.sub(r'  <nav class="toc".*?</nav>', "\n".join(toc), pre, flags=re.S)
chap = [(i, t) for lvl, i, t in heads if lvl == "1" and t.startswith("Глава")]
btns = "".join(
    f'<button type="button" class="ck-i" data-id="{i}"><span class="ck-box" aria-hidden="true"></span>'
    f'<span>{H.escape(re.sub(r" [(].*$", "", t), quote=False)}</span></button>' for i, t in chap)
body = re.sub(r'(<div class="ck-list">).*?(</div><div class="ck-bar">)', lambda m: m.group(1) + btns + m.group(2), body, flags=re.S)
body = re.sub(r'(<div class="ck-n"><span>0</span> из )\d+', lambda m: m.group(1) + str(len(chap)), body)
book.write_text(pre + "\n" + body + "  " + post)
print("собрано:", len(heads), "заголовков,", len(chap), "глав")
