#!/usr/bin/env python3
"""Подключает читалку (assets/reader.js) и офлайн-режим ко всем учебникам в books/.
Запускать после добавления нового учебника:  python3 tools/inject.py
Повторный запуск ничего не ломает: уже подключённые учебники пропускаются."""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
MARK = "<!--thm-reader-->"
SNIPPET = (
    MARK
    + '<link rel="manifest" href="../manifest.webmanifest">'
    + '<meta name="theme-color" content="#16212e">'
    + '<script src="../assets/reader.js" defer></script>'
    + "<script>if('serviceWorker' in navigator)navigator.serviceWorker.register('../sw.js').catch(function(){});</script>"
)

changed = 0
for f in sorted((ROOT / "books").glob("*.html")):
    s = f.read_text(encoding="utf8")
    if MARK in s:
        continue
    i = s.rfind("</body>")
    s = s[:i] + SNIPPET + s[i:] if i >= 0 else s + SNIPPET
    f.write_text(s, encoding="utf8")
    changed += 1
    print("подключил:", f.name)
print("готово, изменено файлов:", changed)
