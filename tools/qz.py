#!/usr/bin/env python3
"""Квизы из компактной записи в HTML учебника.

  python3 qz.py in.q out.html

Формат in.q:
  #H2 Заголовок            -> <h2 id="sX">Заголовок</h2>  (id перенумерует bk.py)
  #H1 Заголовок            -> <h1 id="sX" class="anchored">…</h1>
  <p>…</p>                  -> строки, начинающиеся с «<», идут как есть
  Q 3: текст вопроса        -> вопрос; число — позиция верного ответа (1..N)
  + верный вариант || пояснение
  - неверный вариант || пояснение (в чём ошибка рассуждения)
В тексте можно `код` — станет <code>.
"""
import re, sys, html as H

src, out = sys.argv[1], sys.argv[2]
lines = open(src).read().splitlines()


def inl(s):
    s = H.escape(s, quote=False)
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", s)


def attr(s):
    return H.escape(s, quote=True)


res, q = [], None


def flush():
    global q
    if not q:
        return
    pos, text, ok, bad = q
    assert ok and 1 <= pos <= len(bad) + 1, f"позиция {pos} вне 1..{len(bad)+1}: {text}"
    opts = bad[:]
    opts.insert(pos - 1, ok)
    btn = "".join(
        f'<button type="button" class="qz-o" data-ok="{1 if o is ok else 0}" data-why="{attr(o[1])}">'
        f'<span class="qz-mark" aria-hidden="true"></span><span>{inl(o[0])}</span></button>' for o in opts)
    res.append(f'<div class="qz" data-q="0"><div class="qz-q">{inl(text)}</div><div class="qz-opts">{btn}</div>'
               f'<div class="qz-why" role="status"></div></div>')
    q = None


for ln in lines:
    s = ln.strip()
    if not s:
        continue
    if s.startswith("#H2 "):
        flush(); res.append(f'<h2 id="s0">{inl(s[4:])}</h2>')
    elif s.startswith("#H1 "):
        flush(); res.append(f'<h1 id="s0" class="anchored">{inl(s[4:])}</h1>')
    elif s.startswith("<"):
        flush(); res.append(s)
    elif re.match(r"Q \d+:", s):
        flush()
        m = re.match(r"Q (\d+):\s*(.*)", s)
        q = [int(m.group(1)), m.group(2), None, []]
    elif s[:2] in ("+ ", "- "):
        t, why = [x.strip() for x in s[2:].split("||", 1)]
        if s[0] == "+":
            q[2] = (t, why)
        else:
            q[3].append((t, why))
    else:
        raise SystemExit(f"не понял строку: {s}")
flush()
open(out, "w").write("\n".join(res) + "\n")
print(out, sum(1 for r in res if r.startswith('<div class="qz"')), "вопросов")
