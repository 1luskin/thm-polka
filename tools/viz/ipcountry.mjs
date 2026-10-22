// Вход: JSON {ip: count} в stdin. Выход: {counts:{ISO2:n}, names:{ISO2:"Название"}} — страна по базе DB-IP Lite (CC BY 4.0).
import fs from "fs";
import countries from "i18n-iso-countries";
import ru from "i18n-iso-countries/langs/ru.json" with { type: "json" };
countries.registerLocale(ru);
const rows = fs.readFileSync(new URL("./node_modules/@ip-location-db/dbip-country/dbip-country-ipv4-num.csv", import.meta.url), "utf8").trim().split("\n").map(l => { const [a, b, c] = l.split(","); return [+a, +b, c]; });
const ipnum = ip => ip.split(".").reduce((n, o) => n * 256 + +o, 0);
function look(ip) { const n = ipnum(ip); let lo = 0, hi = rows.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (rows[m][1] < n) lo = m + 1; else if (rows[m][0] > n) hi = m - 1; else return rows[m][2]; } return null; }
const input = JSON.parse(fs.readFileSync(0, "utf8")), counts = {}, names = {}, per = {};
for (const [ip, n] of Object.entries(input)) { const c = look(ip); if (!c) continue; counts[c] = (counts[c] || 0) + n; names[c] = countries.getName(c, "ru") || c; per[ip] = c; }
console.log(JSON.stringify({ counts, names, per }));
