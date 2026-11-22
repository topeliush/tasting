// Viinitasting-karttakuvat: sama tyyli kuin kuvat/face/ (711x477 @2x).
import fs from "fs";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const W = 711, H = 477;
const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));
const maat = feature(topo, topo.objects.countries).features;
const font = (w) => "data:font/woff2;base64," + fs.readFileSync(`node_modules/@fontsource/nunito/files/nunito-latin-${w}-normal.woff2`).toString("base64");

const C = { meri: "#fcf5e2", naapuri: "#f4e8c2", naapuriViiva: "#b9ab8b", maa: "#e6d289", viiva: "#26211e",
  vihrea: "#447b42", joki: "#4a6390", meriTeksti: "#3d5a85", maaTeksti: "#5d5838", tumma: "#2d2a28" };

const ITALIA = {
  maa: "Italy", alue: [[4.2, 36.4], [20.6, 47.45]],
  kaupungit: [["Torino", 7.686, 45.07, "v"], ["Milano", 9.19, 45.464, "v"], ["Venezia", 12.33, 45.44, "o"],
    ["Genova", 8.93, 44.41, "a"], ["Firenze", 11.256, 43.77, "o"], ["Roma", 12.496, 41.903, "o", true], ["Napoli", 14.268, 40.852, "o"]],
  joet: [["Po", [[7.1, 44.75], [7.69, 45.07], [8.2, 45.15], [8.7, 45.1], [9.2, 45.15], [9.7, 45.08], [10.3, 45.0], [10.8, 45.05], [11.5, 45.0], [12.2, 44.95], [12.5, 44.97]], [11.1, 44.7]]],
  maat: [["SVEITSI", 8.3, 46.75], ["ITÄVALTA", 13.3, 47.25], ["SLOVENIA", 15.0, 46.25], ["KROATIA", 16.2, 45.0], ["RANSKA", 5.2, 44.4]],
  meret: [["Adrianmeri", 16.0, 42.7], ["Tyrrhenanmeri", 12.2, 39.6], ["Välimeri", 17.9, 37.0]]
};

const KARTAT = [
  { tiedosto: "kartta-1-ahr", nimi: "Ahr", lon: 7.0, lat: 50.53, pill: [-62, 24],
    maa: "Germany", alue: [[2.6, 46.9], [18.2, 55.4]],
    kaupungit: [["Berliini", 13.405, 52.52, "o", true], ["Hampuri", 9.99, 53.55, "o"], ["München", 11.58, 48.14, "o"],
      ["Köln", 6.96, 50.94, "o"], ["Frankfurt", 8.68, 50.11, "o"]],
    joet: [["Rein", [[7.59, 47.58], [7.58, 48.0], [7.8, 48.6], [8.2, 49.0], [8.47, 49.49], [8.3, 49.98], [7.9, 49.97], [7.6, 50.36], [7.1, 50.73], [6.96, 50.94], [6.77, 51.23], [6.6, 51.6], [6.15, 51.85], [5.9, 51.9]], [7.95, 49.62]]],
    maat: [["RANSKA", 4.4, 48.2], ["BELGIA", 4.6, 50.6], ["ALANKOMAAT", 5.4, 52.7], ["TANSKA", 9.6, 55.9], ["PUOLA", 17.2, 52.3], ["TŠEKKI", 15.4, 49.8], ["ITÄVALTA", 14.2, 47.55], ["SVEITSI", 8.2, 47.0]],
    meret: [["Pohjanmeri", 6.0, 54.6], ["Itämeri", 14.2, 54.9]] },
  { tiedosto: "kartta-2-etna", nimi: "Etna", lon: 14.99, lat: 37.75, pill: [-34, 22], ...ITALIA },
  { tiedosto: "kartta-3-naoussa", nimi: "Naoussa", lon: 22.07, lat: 40.63, pill: [-70, 22],
    maa: "Greece", alue: [[17.6, 34.7], [29.4, 42.2]],
    kaupungit: [["Ateena", 23.73, 37.98, "o", true], ["Thessaloniki", 22.94, 40.64, "o"], ["Patra", 21.73, 38.25, "v"], ["Heraklion", 25.13, 35.34, "o"]],
    joet: [],
    maat: [["ALBANIA", 19.6, 41.3], ["POHJOIS-MAKEDONIA", 21.7, 41.75], ["BULGARIA", 25.2, 42.0], ["TURKKI", 28.3, 39.3]],
    meret: [["Egeanmeri", 25.3, 39.2], ["Joonianmeri", 19.4, 38.0], ["Välimeri", 23.0, 35.9]] },
  { tiedosto: "kartta-4-roero", nimi: "Roero", lon: 7.95, lat: 44.78, pill: [-30, 34], ...ITALIA,
    kaupungit: ITALIA.kaupungit.map((k) => k[0] === "Genova" ? ["Genova", 8.93, 44.41, "o"] : k) },
  { tiedosto: "kartta-5-nizza", nimi: "Nizza", lon: 8.36, lat: 44.77, pill: [-20, 34], ...ITALIA,
    kaupungit: ITALIA.kaupungit.map((k) => k[0] === "Genova" ? ["Genova", 8.93, 44.41, "o"] : k) }
];

function svg(k) {
  const proj = geoMercator().fitExtent([[0, 0], [W, H]], { type: "MultiPoint", coordinates: k.alue });
  const p = geoPath(proj);
  const pakka = maat.filter((m) => m.properties.name !== k.maa);
  const oma = maat.find((m) => m.properties.name === k.maa);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  s += `<rect width="${W}" height="${H}" fill="${C.meri}"/>`;
  s += `<g fill="${C.naapuri}" stroke="${C.naapuriViiva}" stroke-width="0.7" stroke-linejoin="round">` + pakka.map((m) => `<path d="${p(m)}"/>`).join("") + "</g>";
  s += `<path d="${p(oma)}" fill="${C.maa}" stroke="${C.viiva}" stroke-width="1.4" stroke-linejoin="round"/>`;
  for (const [nimi, pts, lp] of k.joet) {
    s += `<path d="M${pts.map((q) => proj(q).map((v) => v.toFixed(1)).join(",")).join("L")}" fill="none" stroke="${C.joki}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`;
    const [x, y] = proj(lp); s += `<text x="${x}" y="${y}" class="meri" font-size="10.5">${nimi}</text>`;
  }
  for (const [n, lo, la] of k.maat) { const [x, y] = proj([lo, la]); s += `<text x="${x}" y="${y}" class="maa">${n}</text>`; }
  for (const [n, lo, la] of k.meret) { const [x, y] = proj([lo, la]); s += `<text x="${x}" y="${y}" class="meri">${n}</text>`; }
  // alue
  const [mx, my] = proj([k.lon, k.lat]);
  s += `<circle cx="${mx}" cy="${my}" r="15" fill="${C.vihrea}" opacity="0.28"/>`;
  s += `<ellipse cx="${mx}" cy="${my}" rx="9.5" ry="8.5" fill="${C.vihrea}" stroke="${C.tumma}" stroke-width="1.3"/>`;
  // kaupungit
  for (const [n, lo, la, puoli, paa] of k.kaupungit) {
    const [x, y] = proj([lo, la]);
    s += paa ? `<circle cx="${x}" cy="${y}" r="6.2" fill="#fff" stroke="${C.tumma}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2.6" fill="${C.tumma}"/>`
      : `<circle cx="${x}" cy="${y}" r="4" fill="${C.tumma}" stroke="${C.meri}" stroke-width="1.2"/>`;
    const d = paa ? 10 : 8;
    const [tx, ty, a] = puoli === "v" ? [x - d, y + 4.5, "end"] : puoli === "a" ? [x, y + 22, "middle"] : [x + d, y + 4.5, "start"];
    s += `<text x="${tx}" y="${ty}" text-anchor="${a}" class="kaupunki">${n}</text>`;
  }
  // pilleri
  const tw = k.nimi.length * 7.1 + 34, th = 27, px = mx + k.pill[0], py = my + k.pill[1];
  s += `<rect x="${px + 3}" y="${py + 3.5}" width="${tw}" height="${th}" rx="13.5" fill="${C.tumma}"/>`;
  s += `<rect x="${px}" y="${py}" width="${tw}" height="${th}" rx="13.5" fill="${C.vihrea}" stroke="${C.tumma}" stroke-width="1.8"/>`;
  s += `<text x="${px + tw / 2}" y="${py + 18}" text-anchor="middle" class="pilleri">${k.nimi}</text>`;
  return s + "</svg>";
}

const css = `@font-face{font-family:N;font-weight:700;src:url(${font(700)})}@font-face{font-family:N;font-weight:800;src:url(${font(800)})}
html,body{margin:0;background:${C.meri}}text{font-family:N}
.maa{font-size:9.5px;font-weight:800;letter-spacing:.14em;fill:${C.maaTeksti};text-anchor:middle}
.meri{font-size:10.5px;font-weight:700;fill:${C.meriTeksti};text-anchor:middle;letter-spacing:.02em}
.kaupunki{font-size:12px;font-weight:800;fill:${C.tumma};paint-order:stroke;stroke:${C.meri};stroke-width:3px;stroke-linejoin:round}
.pilleri{font-size:11.5px;font-weight:800;fill:#fff}`;
fs.mkdirSync("html", { recursive: true });
for (const k of KARTAT) fs.writeFileSync(`html/${k.tiedosto}.html`, `<!doctype html><meta charset="utf-8"><style>${css}</style>${svg(k)}`);
console.log(KARTAT.map((k) => k.tiedosto).join(" "));
