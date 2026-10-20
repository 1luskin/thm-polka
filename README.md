# THM Полка

Учебники Ильи по TryHackMe (путь к SOC Analyst L1). Сайт: https://1luskin.github.io/thm-polka/

## Как устроено

- `index.html` — сама полка. Список учебников берёт из `books.json`, прогресс (статус, оценки, заметки) хранит в localStorage браузера; перенос между устройствами — блок «Экспорт / Импорт».
- `books.json` — список учебников. Код страницы для добавления учебника трогать не нужно.
- `books/<id>.html` — сами учебники, каждый — самостоятельная HTML-страница.

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

3. Закоммитить и запушить в `main`. GitHub Pages обновит сайт за 1–2 минуты.

Правишь учебник, который уже лежит на полке, — просто перезаписываешь его файл в `books/`. `id` не меняй: к нему привязан прогресс.
