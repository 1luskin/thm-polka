#!/usr/bin/env python3
"""Картинки-превью для ссылок (Telegram, WhatsApp и т.п.), 1200×630.
Запуск после добавления учебника:  python3 tools/og.py
Пишет assets/og/site.png и assets/og/<id>.png для каждого учебника из books.json."""
import json, pathlib, hashlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = ROOT / "tools" / "fonts"
OUT = ROOT / "assets" / "og"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1200, 630
BG, INK, MUTED, ACCENT, PLANK = "#121b26", "#eef1f4", "#93a1af", "#f0954a", "#2a3644"
# цвет переплёта по пути — те же, что на полке (index.html, --b-*)
BIND = {
    "01 Pre Security": "#2f6b5a",
    "02 Cyber Security 101": "#2c4f7c",
    "03 SOC Level 1": "#8a3b2e",
    "04 SOC Level 2": "#5a3f78",
    "05 Defending Azure": "#1f6f86",
    "Вне курса": "#55606c",
}


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def wrap(draw, text, fnt, width, max_lines):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= width:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        while draw.textlength(lines[-1] + "…", font=fnt) > width and " " in lines[-1]:
            lines[-1] = lines[-1].rsplit(" ", 1)[0]
        lines[-1] += "…"
    return lines


def shelf(draw, books, x0, x1, base, highlight=None):
    """Ряд корешков на полке справа внизу — фирменная деталь полки."""
    draw.rectangle([x0 - 16, base, x1 + 16, base + 12], fill=PLANK)
    x = x0
    for b in books:
        h = int(hashlib.md5(b["id"].encode()).hexdigest()[:4], 16)
        bw = 34 + h % 14
        bh = 150 + h % 60
        if x + bw > x1:
            break
        col = BIND.get(b.get("path"), BIND["Вне курса"])
        top = base - bh
        draw.rectangle([x, top, x + bw, base - 1], fill=col)
        # «золотые» полоски переплёта
        for y in (top + 14, top + 20, base - 22, base - 16):
            draw.rectangle([x + 4, y, x + bw - 4, y + 2], fill="#d9b26a")
        if b["id"] == highlight:
            draw.polygon([(x + bw - 14, top), (x + bw - 4, top), (x + bw - 4, top + 54), (x + bw - 9, top + 46), (x + bw - 14, top + 54)], fill=ACCENT)
        x += bw + 6


def card(path, eyebrow, title, sub, books, highlight=None):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.text((72, 64), eyebrow.upper(), font=font("jetbrains-mono-500.ttf", 24), fill=ACCENT)
    tf = font("unbounded-700.ttf", 60 if len(title) < 28 else 50)
    y = 120
    for line in wrap(d, title, tf, 700, 3):
        d.text((72, y), line, font=tf, fill=INK)
        y += int(tf.size * 1.25)
    sf = font("golos-text-500.ttf", 28)
    y += 18
    for line in wrap(d, sub, sf, 660, 3):
        d.text((72, y), line, font=sf, fill=MUTED)
        y += 40
    d.text((72, H - 72), "1luskin.github.io/thm-polka", font=font("jetbrains-mono-500.ttf", 22), fill=MUTED)
    shelf(d, books, 820, 1140, H - 90, highlight)
    im.save(path, optimize=True)


books = json.loads((ROOT / "books.json").read_text(encoding="utf8"))
card(OUT / "site.png", "THM Полка · SOC Analyst L1", "THM Полка",
     "Учебники по TryHackMe на пути в SOC: поиск, глоссарий EN/RU/DE, карта MITRE ATT&CK", books)
for b in books:
    same = [x for x in books if x.get("path") == b.get("path")] or [b]
    others = [x for x in books if x not in same]
    card(OUT / f"{b['id']}.png", f"Учебник · {b.get('path', '')}", b["title"],
         b.get("rooms") or "Учебник с полки THM на пути в SOC Analyst L1", same + others, highlight=b["id"])
print("превью:", len(books) + 1)
