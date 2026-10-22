# THM Полка

Учебники Ильи по TryHackMe (путь к SOC Analyst L1). Сайт: https://1luskin.github.io/thm-polka/

## Как устроено

- `index.html` — сама полка. Список учебников берёт из `books.json`, прогресс (статус, оценки, заметки) хранит в localStorage браузера; перенос между устройствами — блок «Экспорт / Импорт».
- `books.json` — список учебников. Код страницы для добавления учебника трогать не нужно.
- `books/<id>.html` — сами учебники, каждый — самостоятельная HTML-страница.
- `assets/reader.js` — читалка внутри учебников: «продолжить с места», закладки, выделения и заметки, озвучка, шрифт, ночной режим, прогресс разделов и квизов, время чтения. Подключается строкой перед `</body>` (делает `tools/inject.py`).
- `sw.js` + `manifest.webmanifest` — установка на телефон и чтение без интернета.
- `search.html`, `glossary.html`, `mitre.html`, `ports.html`, `tools.html` — справочники. Данные для них в `data/`, их собирает `tools/build_index.py` из учебников.
- `tools/attack/enterprise-compact.json` — выжимка MITRE ATT&CK Enterprise (сейчас v20.0) из github.com/mitre-attack/attack-stix-data. Обновлять при выходе новой версии.
- `tools/refdata.py` — словари портов и инструментов (описания для SOC).
- `path.html` — «Мой путь»: лента событий учёбы. `assets/progress.js` — общий слой данных прогресса (серии, таймер THM, бейджи), `assets/fx.js` — конфетти и тосты.
- `data/chapters.json` — главы каждого учебника (для бусин на полке), собирает `tools/build_index.py`.
- `assets/og/` — картинки-превью для ссылок, `tools/og.py` рисует их шрифтами из `tools/fonts/` (SIL OFL).

## Как добавить новый учебник

1. Положить HTML учебника в `books/<id>.html`. `id` — латиница: `ps-…` для Pre Security, `cs101-…` для Cyber Security 101, `soc1-…` для SOC Level 1, `soc2-…` для SOC Level 2, `azure-…` для Defending Azure.
2. Добавить в `books.json` одну запись:

```json
{
 "id": "soc1-cti",
 "title": "Cyber Threat Intelligence",
 "url": "books/soc1-cti.html",
 "path": "03 SOC Level 1",
 "order": 1,
 "rooms": "Intro to CTI, CTI for Alert Triage, MISP, OpenCTI, Trooper",
 "added": "2026-10-21"
}
```

`path` — одно из: `01 Pre Security`, `02 Cyber Security 101`, `03 SOC Level 1`, `04 SOC Level 2`, `05 Defending Azure`, `Вне курса`. `order` — порядок внутри пути.

3. Пересобрать поиск, главы, глоссарий, MITRE, порты и инструменты: `python3 tools/build_index.py` (нужны `beautifulsoup4` и `lxml`).
   Сделать картинку-превью для ссылок: `python3 tools/og.py` (нужен Pillow).
   Подключить читалку, офлайн и превью ко всем страницам: `python3 tools/inject.py` (повторный запуск безопасен).
4. В `sw.js` поднять версию `CACHE` (`thm-polka-v1` → `v2` …), чтобы телефон подтянул обновление.
5. Закоммитить и запушить в `main`. GitHub Pages обновит сайт за 1–2 минуты.

Правишь учебник, который уже лежит на полке, — просто перезаписываешь его файл в `books/`. `id` не меняй: к нему привязан прогресс.
