import fs from "fs";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countries from "i18n-iso-countries";
const topo = JSON.parse(fs.readFileSync(new URL("./node_modules/world-atlas/countries-110m.json", import.meta.url));
const fc = feature(topo, topo.objects.countries);
fc.features = fc.features.filter(f => f.properties.name !== "Antarctica");
const W = 960, H = 470;
const proj = geoNaturalEarth1().fitSize([W, H], fc);
const path = geoPath(proj).digits(1);
const out = { w: W, h: H, p: {} }, names = {};
for (const f of fc.features) {
  const a2 = countries.numericToAlpha2(f.id) || ("X" + f.properties.name.slice(0, 3));
  const d = path(f); if (!d) continue;
  out.p[a2] = (out.p[a2] ? out.p[a2] : "") + d;
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
console.log(Object.keys(out.p).length, "countries", fs.statSync(process.argv[2]).size, "bytes");
