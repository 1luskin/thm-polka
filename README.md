# THM Полка

Учебники Ильи по TryHackMe (путь к SOC Analyst L1). Сайт: https://1luskin.github.io/thm-polka/

## Как устроено

- `index.html` — сама полка. Список учебников берёт из `books.json`, прогресс (статус, оценки, заметки) хранит в localStorage браузера; перенос между устройствами — блок «Экспорт / Импорт».
- `books.json` — список учебников. Код страницы для добавления учебника трогать не нужно.
- `books/<id>.html` — сами учебники, каждый — самостоятельная HTML-страница.
- `assets/reader.js` — читалка внутри учебников: «продолжить с места», закладки, выделения и заметки, озвучка, шрифт, ночной режим, забота о глазах (темы «бумага» и «мягкая тёмная», ширина строки, интервал, шрифт, линейка чтения, перерыв 20-20-20), прогресс разделов и квизов, время чтения. Подключается строкой перед `</body>` (делает `tools/inject.py`).
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
 "thm": ["cyberthreatintel", "ctiforalerttriage", "misp", "opencti", "trooper"],
 "added": "2026-10-21"
}
```

`thm` — коды комнат из адреса `tryhackme.com/room/<код>`. Время каждой комнаты (поле «NN min» на её странице) записать в `tools/thm_rooms.json`; если THM время не показывает — `null`. `build_index.py` предупредит о комнате, которой там нет. Время чтения считается само по объёму текста (150 слов в минуту) и вместе с временем THM видно на карточке полки.

`path` — одно из: `01 Pre Security`, `02 Cyber Security 101`, `03 SOC Level 1`, `04 SOC Level 2`, `05 Defending Azure`, `Вне курса`. `order` — порядок внутри пути.

3. Пересобрать поиск, главы, время чтения и THM, глоссарий, MITRE, порты и инструменты: `python3 tools/build_index.py` (нужны `beautifulsoup4` и `lxml`).
   Сделать картинку-превью для ссылок: `python3 tools/og.py` (нужен Pillow).
   Подключить читалку, офлайн и превью ко всем страницам: `python3 tools/inject.py` (повторный запуск безопасен).
4. В `sw.js` поднять версию `CACHE` (`thm-polka-v1` → `v2` …), чтобы телефон подтянул обновление.
5. Закоммитить и запушить в `main`. GitHub Pages обновит сайт за 1–2 минуты.

Правишь учебник, который уже лежит на полке, — просто перезаписываешь его файл в `books/`. `id` не меняй: к нему привязан прогресс.

## Визуал в учебниках

`assets/viz.js` (иконки — `assets/icons.js`, карта — `assets/world.json`) рисует графики и схемы прямо в учебнике. Читалка подгружает его сама. В HTML учебника блок задаётся так:

```html
<figure class="thv" data-v="ТИП"><figcaption><b>Заголовок</b><span>Источник данных или «Учебный пример: …»</span></figcaption>
<script type="application/json">{ …данные… }</script></figure>
```

| Тип | Что рисует | Данные |
|---|---|---|
| `timeline` | события во времени столбиками + отметки | `{"points":[["10:20",12,"bad"]…],"unit":"…","marks":[{"i":7,"text":"успешный вход","kind":"good"}]}` |
| `hours` | активность по 24 часам, ночь подсвечена | `{"values":[24 числа],"unit":"…","tz":"…"}` |
| `topn` | топ-N горизонтальными полосами | `{"items":[["183.62.140.253",286,"bad"]…],"unit":"…"}` |
| `baseline` | норма (полоса) и сегодня (линия), выбросы красным | `{"labels":[…],"lo":[…],"hi":[…],"v":[…]}` |
| `heat` | тепловая карта строки × столбцы | `{"rows":[…],"cols":[…],"values":[[…]…],"unit":"…"}` |
| `ptree` | дерево процессов с раскрытием командной строки | `{"root":{"n":"winword.exe","u":"user","note":"…","cmd":"…","bad":true,"c":[…]}}` |
| `graph` | граф связей слева направо | `{"nodes":[{"id","label","sub","icon","kind"}],"edges":[["a","b","подпись","bad"]]}` |
| `scene` | сцена из иконок по зонам (Интернет / DMZ / LAN) | как `graph` + `"zones":[{"id","label","kind"}]`, у узлов `"zone"` |
| `route` | путь пакета по шагам с анимацией | `{"nodes":[…],"steps":[{"from","to","text"}]}` |
| `seq` | диаграмма обмена сообщениями по шагам | `{"actors":[…],"msgs":[{"f":0,"t":1,"text","note","kind","dash"}]}` |
| `chain` | kill chain с прогрессом атаки | `{"stages":[{"name","ru","state":"done/cur/","note"}]}` |
| `layers` | пакет по слоям, ширина = байты | `{"layers":[{"name","bytes","note","fields":[["поле","значение","смысл"]]}]}` |
| `decode` | раскодирование по шагам | `{"input":"…","steps":[{"op","out","note"}]}` |
| `diff` | до / после построчно | `{"a":{"title","lines":[…]},"b":{"title","lines":[…]}}` |
| `siem` | мини-SIEM: поиск и фильтры по таблице событий | `{"cols":[…],"rows":[[…]…],"filter":[номера колонок],"tasks":[…]}` |
| `event` | карточки Event ID | `{"cards":[{"id","name","log","kind","fields":[[…]],"look"}]}` |
| `matrix` | «где видно»: строки × источники, 2/1/0 | `{"cols":[…],"rows":[{"name","id","v":[2,1,0…]}]}` |
| `severity` | калькулятор приоритета с кнопками | `{"factors":[{"name","opts":[["вариант",баллы]],"gate":true}],"levels":[[мин,"Название","kind","что делать"]]}` |
| `ui` | интерфейс инструмента: `eventviewer`, `splunk`, `wireshark` | `{"app","title","cols","rows","detail":[…],"query","hist","filter"}` |
| `map` | карта мира по странам | `{"counts":{"CN":341},"names":{"CN":"Китай"},"unit","attr"}` |

`kind`: `bad`, `good`, `warn`, `acc` или пусто. Иконки: laptop, desktop, server, dc, db, cloud, globe, router, switch, firewall, attacker, user, analyst, shield, mail, file, log, key, lock, phone, terminal, browser, bug, alert, search, siem, house, dns, vpn, usb, gear, packet.

Обложки глав рисуются сами перед заголовками «Глава N» / «ЧАСТЬ N». Иллюстрация учебника — `assets/illustrations/<id>.svg`, их рисует `tools/viz/illustrations.py`. Готовые блоки для 7 первых учебников и расчёт по реальным датасетам — `tools/viz/build.py` (сначала `npm install` в `tools/viz` для стран IP по DB-IP Lite).
