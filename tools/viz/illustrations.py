#!/usr/bin/env python3
"""Рисует по одной иллюстрации на учебник: assets/illustrations/<id>.svg (1200×520).
Сцены собираются из того же набора иконок, что и схемы в учебниках (assets/icons.js), поэтому стиль единый.
Запуск:  python3 tools/viz/illustrations.py"""
import pathlib, random, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "illustrations"
OUT.mkdir(parents=True, exist_ok=True)
ICONS = dict(re.findall(r"^\s*(\w+):\s*'(.*)',?\s*$", (ROOT / "assets" / "icons.js").read_text(encoding="utf8"), re.M))

BG1, BG2, INK, MUT, ACC, BAD, GOOD, GILT = "#121b26", "#1d2b3a", "#eef1f4", "#93a1af", "#f0954a", "#e0614f", "#5cc28a", "#d9b26a"
FONT = "font-family=\"'Golos Text','Segoe UI',Arial,sans-serif\""
MONO = "font-family=\"'JetBrains Mono',Menlo,Consolas,monospace\""


def icon(name, x, y, size, color=INK, sw=1.6):
    k = size / 24
    return (f'<g transform="translate({x},{y}) scale({k:.3f})" fill="none" stroke="{color}" stroke-width="{sw / k * (size / 48):.2f}" '
            f'stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</g>')


def plate(x, y, w, h, fill="#22344a", stroke="#2f4560", r=18):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'


def text(x, y, s, size=20, color=INK, anchor="start", mono=False, weight=600):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{weight}" {MONO if mono else FONT}>{s}</text>'


def frame(body, seed=1):
    r = random.Random(seed)
    stars = "".join(f'<circle cx="{r.randint(0, 1200)}" cy="{r.randint(0, 520)}" r="{r.choice([1, 1, 1.5, 2])}" fill="#fff" opacity="{r.uniform(.05, .22):.2f}"/>' for _ in range(70))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 520" width="1200" height="520">'
            f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{BG1}"/><stop offset="1" stop-color="{BG2}"/></linearGradient>'
            f'<marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0L10,5L0,10z" fill="{BAD}"/></marker>'
            f'<marker id="ag" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0L10,5L0,10z" fill="{GOOD}"/></marker></defs>'
            f'<rect width="1200" height="520" fill="url(#bg)"/>{stars}{body}</svg>')


def linux():
    b = [plate(470, 140, 260, 250), icon("server", 520, 175, 160, INK), text(600, 372, "LabSZ · sshd", 22, INK, "middle")]
    r = random.Random(7)
    for i in range(16):
        y = 120 + i * 18 + r.randint(-4, 4)
        x0 = 60 + r.randint(0, 120)
        b.append(f'<line x1="{x0}" y1="{y}" x2="{430 - r.randint(0, 30)}" y2="{200 + i * 9}" stroke="{BAD}" stroke-width="2" opacity=".55" marker-end="url(#ar)"/>')
    b.append(f'<line x1="120" y1="440" x2="455" y2="330" stroke="{GOOD}" stroke-width="4" marker-end="url(#ag)"/>')
    b += [icon("attacker", 40, 230, 90, BAD), text(85, 210, "сотни попыток", 18, BAD, "middle"), text(150, 470, "одна удачная", 18, GOOD, "middle")]
    b.append(plate(790, 120, 360, 280, "#0c131b", "#2a3a4c", 14))
    lines = [("Failed password for root", BAD), ("Failed password for admin", BAD), ("Invalid user oracle", BAD), ("Failed password for root", BAD),
             ("Failed password for test", BAD), ("Invalid user support", BAD), ("Failed password for root", BAD), ("Accepted password for fztu", GOOD)]
    for i, (s, c) in enumerate(lines):
        b.append(text(812, 160 + i * 30, s, 17, c, mono=True, weight=500))
    b.append(text(970, 435, "auth.log", 18, MUT, "middle", mono=True, weight=500))
    return frame("".join(b), 11)


def web():
    b = [plate(330, 70, 540, 380, "#f3ead6", "#d9cbad", 16), f'<rect x="330" y="70" width="540" height="56" rx="16" fill="#e4d8bd"/>',
         f'<rect x="360" y="84" width="480" height="28" rx="14" fill="#fff"/>',
         text(380, 104, "https://login.rednItz-spedition.example", 17, "#3b2f22", mono=True, weight=500),
         f'<rect x="573" y="86" width="14" height="24" rx="3" fill="none" stroke="{BAD}" stroke-width="2.5"/>',
         text(600, 190, "Rednitz Spedition", 30, "#3b2f22", "middle", weight=700), text(600, 222, "Mitarbeiter-Login", 18, "#6e5e4a", "middle", weight=500)]
    for i, lab in enumerate(["E-Mail", "Passwort"]):
        b += [f'<rect x="420" y="{250 + i * 62}" width="360" height="44" rx="8" fill="#fff" stroke="#d9cbad" stroke-width="2"/>', text(436, 278 + i * 62, lab, 16, "#8a7a64", weight=500)]
    b += [f'<rect x="420" y="380" width="360" height="44" rx="8" fill="{ACC}"/>', text(600, 408, "Anmelden", 18, "#24170a", "middle", weight=700)]
    b += [f'<path d="M780 402 C 900 402, 930 300, 1010 300" fill="none" stroke="{BAD}" stroke-width="3" stroke-dasharray="8 6" marker-end="url(#ar)"/>',
          icon("attacker", 1010, 240, 120, BAD), text(1070, 395, "203.0.113.50", 18, BAD, "middle", mono=True, weight=500),
          icon("user", 90, 190, 120, INK), text(150, 340, "m.becker", 18, MUT, "middle", mono=True, weight=500),
          f'<line x1="220" y1="250" x2="320" y2="250" stroke="{MUT}" stroke-width="3" marker-end="url(#ar)"/>',
          text(580, 482, "I вместо l — домен-двойник", 18, BAD, "middle")]
    return frame("".join(b), 12)


def network():
    b = [plate(60, 70, 1080, 380, "#18263a", "#2c4058", 22), text(90, 110, "LAN 192.168.1.0/24", 20, MUT, mono=True, weight=500)]
    b += [icon("router", 540, 120, 120, INK), text(700, 200, "роутер .1", 18, MUT, "start", mono=True, weight=500)]
    pcs = [(140, 300, "desktop", ".24"), (330, 330, "laptop", ".31"), (840, 330, "desktop", ".40"), (1010, 300, "server", ".10")]
    for x, y, ic, lab in pcs:
        b += [f'<line x1="{x + 50}" y1="{y + 10}" x2="600" y2="250" stroke="{MUT}" stroke-width="2" opacity=".5"/>', icon(ic, x, y, 100, INK), text(x + 50, y + 125, lab, 18, MUT, "middle", mono=True, weight=500)]
    b += [icon("attacker", 545, 330, 110, BAD), text(600, 470, ".66 «я — роутер»", 18, BAD, "middle", mono=True, weight=500),
          f'<path d="M240 340 Q 420 420 545 390" fill="none" stroke="{BAD}" stroke-width="3" stroke-dasharray="8 6" marker-end="url(#ar)"/>',
          f'<path d="M655 380 Q 640 300 610 262" fill="none" stroke="{BAD}" stroke-width="3" stroke-dasharray="8 6" marker-end="url(#ar)"/>']
    return frame("".join(b), 13)


def ad():
    steps = [(70, "desktop", "WS-DISPO-03", INK), (330, "terminal", "PowerShell", BAD), (590, "key", "билеты RC4", BAD), (850, "dc", "DC nordstern", GILT)]
    b = []
    for i, (x, ic, lab, col) in enumerate(steps):
        b += [plate(x, 150, 220, 220), icon(ic, x + 50, 175, 120, col), text(x + 110, 340, lab, 19, INK, "middle")]
        if i < 3:
            b.append(f'<line x1="{x + 228}" y1="260" x2="{x + 252}" y2="260" stroke="{BAD}" stroke-width="4" marker-end="url(#ar)"/>')
    b += [text(600, 90, "одна учётка → весь домен", 30, INK, "middle", weight=700), text(600, 440, "4688 → 4769 ×40 → 1102", 22, ACC, "middle", mono=True, weight=500)]
    return frame("".join(b), 14)


def cs101():
    b = [plate(60, 90, 460, 340, "#0c131b", "#2a3a4c", 14), icon("attacker", 80, 110, 70, BAD), text(170, 150, "gobuster dir", 22, BAD, mono=True, weight=500)]
    for i, w in enumerate(["/admin", "/backup", "/config", "/login", "/old", "/uploads", "/bank-transfer"]):
        b.append(text(100, 215 + i * 28, f"→ {w}", 18, MUT if i != 6 else BAD, mono=True, weight=500))
    b += [plate(680, 90, 460, 340), icon("analyst", 700, 110, 70, GOOD), text(790, 150, "access.log", 22, GOOD, mono=True, weight=500)]
    r = random.Random(3)
    for i in range(18):
        h = r.randint(10, 40) if i < 6 or i > 13 else r.randint(120, 190)
        b.append(f'<rect x="{710 + i * 23}" y="{400 - h}" width="16" height="{h}" rx="3" fill="{BAD if 6 <= i <= 13 else "#3b5573"}"/>')
    b += [text(1000, 150, "404 пачкой", 20, BAD, "middle"), f'<line x1="530" y1="260" x2="670" y2="260" stroke="{ACC}" stroke-width="4" stroke-dasharray="10 8" marker-end="url(#ar)"/>',
          text(600, 470, "одни и те же запросы — с двух сторон", 20, INK, "middle")]
    return frame("".join(b), 15)


def presec():
    layers = [("Данные", "file", "#8a3b2e"), ("Операционная система", "terminal", "#5a3f78"), ("Сеть", "router", "#2c4f7c"), ("Компьютер", "desktop", "#2f6b5a")]
    b = []
    for i, (lab, ic, col) in enumerate(layers):
        y = 80 + i * 92
        x = 300 - i * 20
        b += [f'<rect x="{x}" y="{y}" width="{600 + i * 40}" height="78" rx="16" fill="{col}" opacity=".95"/>', icon(ic, x + 26, y + 15, 48, INK), text(x + 96, y + 50, lab, 26, INK)]
    b += [icon("alert", 1000, 110, 90, ACC), text(1045, 235, "инцидент", 20, ACC, "middle"),
          f'<path d="M1000 250 C 980 330, 960 380, 940 420" fill="none" stroke="{ACC}" stroke-width="3" stroke-dasharray="8 6"/>',
          icon("analyst", 80, 200, 120, GOOD), text(140, 350, "ты", 22, GOOD, "middle")]
    return frame("".join(b), 16)


def offensive():
    b = [plate(420, 110, 360, 300), icon("browser", 500, 140, 200, INK), text(600, 385, "fakebank.thm", 22, INK, "middle", mono=True, weight=500),
         icon("attacker", 90, 170, 160, BAD), text(170, 370, "атакующий", 22, BAD, "middle"), text(170, 400, "ищет забытое", 18, MUT, "middle"),
         icon("analyst", 950, 170, 160, GOOD), text(1030, 370, "защитник", 22, GOOD, "middle"), text(1030, 400, "ищет след", 18, MUT, "middle"),
         f'<line x1="270" y1="250" x2="410" y2="250" stroke="{BAD}" stroke-width="4" marker-end="url(#ar)"/>',
         f'<line x1="930" y1="250" x2="790" y2="250" stroke="{GOOD}" stroke-width="4" marker-end="url(#ag)"/>',
         text(600, 470, "один сайт, две стороны", 22, INK, "middle")]
    return frame("".join(b), 17)


def cli():
    b = []
    wins = [(50, "cmd.exe", ["C:\\> systeminfo | more", "C:\\> netstat -ano", "C:\\> tasklist /svc"], "#5aa9e6"),
            (430, "PowerShell", ["PS> Get-Process |", "    Sort-Object CPU -Desc |", "    Select -First 5"], GILT),
            (810, "bash", ["$ grep ALERT syslog |", "  awk '{print $5}' |", "  sort | uniq -c"], GOOD)]
    for x, title, lines, col in wins:
        b.append(plate(x, 60, 340, 220, "#0c131b", "#2a3a4c", 14))
        b.append(f'<rect x="{x}" y="60" width="340" height="36" rx="14" fill="#1a2634"/>')
        b += [f'<circle cx="{x + 22 + i * 18}" cy="78" r="5" fill="{c}" opacity=".8"/>' for i, c in enumerate([BAD, GILT, GOOD])]
        b.append(text(x + 170, 84, title, 17, MUT, "middle", mono=True, weight=500))
        for i, ln in enumerate(lines):
            b.append(text(x + 20, 135 + i * 34, ln, 18, col, mono=True, weight=500))
        b.append(f'<line x1="{x + 170}" y1="285" x2="{600 + (x - 430) * 0.25:.0f}" y2="372" stroke="{col}" stroke-width="2.5" opacity=".6" marker-end="url(#ag)"/>')
    b += [plate(500, 375, 200, 120), icon("analyst", 560, 385, 80, INK), text(600, 485, "ночная смена", 16, MUT, "middle")]
    b += [icon("server", 190, 360, 90, MUT), text(235, 470, "PRN-SRV01", 16, MUT, "middle", mono=True, weight=500),
          icon("server", 920, 360, 90, MUT), text(965, 470, "lnx-files01", 16, MUT, "middle", mono=True, weight=500)]
    return frame("".join(b), 23)


for name, fn in [("cs101-cli", cli), ("cs101-linux", linux), ("ps-06-web", web), ("ps-05-network", network), ("cs101-windows-ad", ad), ("cs101-01", cs101), ("ps-01-04", presec), ("x-offensive-intro", offensive)]:
    (OUT / f"{name}.svg").write_text(fn(), encoding="utf8")
    print(name, (OUT / f"{name}.svg").stat().st_size, "байт")
