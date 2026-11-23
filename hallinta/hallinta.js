/* Viinitasting tasting: hallintanäkymä. Tastingit tallentuvat Firestoreen (tastingit/{id}), kuvat alikokoelmaan kuvat. */
(function () {
  "use strict";
  var A = window.VT_ASETUKSET || {};
  var app = document.getElementById("app");
  var Y = null, kayttaja = null, valmis = false;
  var lista = null, pohjat = [], auki = {}, laskut = {}, koosteet = {};
  function emoji(a) { var e = window.VTAromiEmoji ? window.VTAromiEmoji(a) : ""; return e ? e + " " : ""; }
  var muok = null, muokId = null, muutettu = false, juomaAuki = {}, kuvaVarasto = {};
  var uusiAuki = false, tallentaa = false, lahjat = null, lahjatAuki = false, lahjaHaku = "";

  var AROMIT = {
    kuohu: ["Vihreä omena", "Keltainen omena ja päärynä", "Sitrus", "Persikka ja aprikoosi", "Trooppiset hedelmät", "Punaiset marjat", "Kukat", "Hunaja", "Paahtoleipä ja brioche", "Pähkinä", "Vanilja", "Yrtit ja tee"],
    valkoinen: ["Sitrus", "Vihreä omena", "Päärynä", "Persikka ja aprikoosi", "Trooppiset hedelmät", "Kukat", "Yrtit ja ruoho", "Hunaja", "Voi ja kerma", "Vanilja ja tammi", "Mineraalisuus", "Mausteet"],
    punainen: ["Kirsikka", "Vadelma ja mansikka", "Mustaherukka ja karhunvatukka", "Luumu", "Orvokki ja kukat", "Pippuri ja mausteet", "Vanilja ja tammi", "Tupakka ja nahka", "Maa ja sieni", "Yrtit", "Lakritsi", "Suklaa ja kahvi"]
  };
  var TYYPIT = [["kuohu", "Kuohuviini"], ["valkoinen", "Valkoviini"], ["rose", "Roséviini"], ["punainen", "Punaviini"]];
  var PERUS = {
    juontaja: "Topias Haavisto", sokkotasting: false, kaytaPaljastussanaa: false, naytaJuontajaLinkki: true,
    varausLinkki: "https://viinitasting.com", varausTeksti: "Tuon tastingin teille, te valitsette porukan.", googleArvioLinkki: "https://g.page/r/Ccf877ZSMJM8ECE/review",
    lahjakortti: { kaytossa: true, arvo: 40, tunnus: "", voimassaKk: 12, myontaja: "Il Top Oy" }
  };
  var MAX_KUVAT = 4;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function kopio(x) { return JSON.parse(JSON.stringify(x)); }
  function onJuontaja() {
    return !!(kayttaja && !kayttaja.anon && kayttaja.email && (A.juontajat || []).map(function (x) { return String(x).toLowerCase(); }).indexOf(kayttaja.email) >= 0);
  }
  function osoite(id) { return location.origin + "/?t=" + encodeURIComponent(id); }
  function pvmTeksti(p) { if (!p) return "ei päivää"; var o = String(p).split("-"); return o.length === 3 ? (+o[2]) + "." + (+o[1]) + "." + o[0] : p; }
  function tanaan() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function slug(s) {
    return String(s || "").toLowerCase().replace(/[åä]/g, "a").replace(/ö/g, "o").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "tasting";
  }
  function ilmoita(t) {
    var el = document.createElement("div"); el.className = "h-ilmoitus"; el.textContent = t; document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }
  function qrSvg(text) {
    if (!text || typeof qrcode !== "function") return '<div class="qr-tyhja">QR</div>';
    var q = qrcode(0, "M"); q.addData(text); q.make();
    var n = q.getModuleCount(), m = 2, d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + (c + m) + " " + (r + m) + "h1v1h-1z";
    return '<svg viewBox="0 0 ' + (n + 2 * m) + " " + (n + 2 * m) + '" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="QR-koodi"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#2d2d2a"/></svg>';
  }

  /* ---------- Data ---------- */
  function lataaLista() {
    return window.VTData.listaa().then(function (l) {
      lista = l.sort(function (a, b) { return String(b.pvm || "").localeCompare(String(a.pvm || "")); });
      render();
    }, function () { lista = []; ilmoita("Tastingien lataus epäonnistui. Tarkista Firestoren säännöt."); render(); });
  }
  function lataaPohjat() {
    return fetch("/pohjat/index.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : []; })
      .then(function (p) { pohjat = Array.isArray(p) ? p : []; render(); }, function () { pohjat = []; });
  }
  var OMATOIMI_PV = 30;
  // Arvaamaton tunnus: 12 merkkiä 32 merkin aakkostosta (60 bittiä). Ei sekoittuvia merkkejä (0/o, 1/l).
  function satunnainen(n) {
    var merkit = "abcdefghijkmnpqrstuvwxyz23456789", t = new Uint8Array(n), s = "";
    (window.crypto || window.msCrypto).getRandomValues(t);
    for (var k = 0; k < n; k++) s += merkit.charAt(t[k] % merkit.length);
    return s;
  }
  function pvmMs(ms) { return new Date(ms).toLocaleDateString("fi-FI"); }
  function vanhentunut(t) { return !!(t && t.voimassaAstiMs && t.voimassaAstiMs < Date.now()); }
  function ostoslista(t) {
    var v = (t.viinit || []).filter(function (w) { return !w.alkoholiton; });
    if (!v.length) return "";
    var tyypit = v.map(function (w) { return w.tyyppi; });
    var lampo = [];
    if (tyypit.some(function (x) { return x === "kuohu" || x === "valkoinen" || x === "rose"; })) lampo.push("kuohu-, valko- ja roseeviinit jääkaappikylminä (nostakaa jääkaappiin viimeistään 3 tuntia ennen)");
    if (tyypit.indexOf("punainen") >= 0) lampo.push("punaviinit viileässä huoneenlämmössä (ottakaa ne esiin noin 30 minuuttia ennen)");
    return "\n\nOstoslista (Alko):\n" + v.map(function (w, k) { return (k + 1) + ". " + w.nimi; }).join("\n") +
      "\n\nYksi pullo kutakin riittää noin 12 hengelle (noin 6 cl lasiin). Numeroikaa pullot 1–" + v.length + " ja kaatakaa ne illan aikana tässä järjestyksessä." +
      (lampo.length ? "\nTarjoilu: " + lampo.join(", ") + "." : "") +
      "\nLisäksi tarvitaan lasit, vettä ja vähän leipää. Juustot ovat vapaaehtoisia.";
  }
  function asiakasViesti(t) {
    var u = osoite(t.id);
    return "Hei!\n\nKiitos tilauksesta. Tässä teidän oma tasting-linkkinne:\n" + u + ostoslista(t) +
      "\n\nKun ilta alkaa, jokainen avaa linkin omalla puhelimellaan. Tulostettava pöytäkortti QR-koodilla löytyy täältä:\n" + u + "#poytakortti" +
      "\n\nLinkki toimii " + pvmMs(t.voimassaAstiMs) + " asti. Se on tehty vain teille, joten jakakaa se vain illan porukalle." +
      "\n\nHyviä hetkiä viinien parissa!\nTopias Haavisto\nViinitasting.com";
  }
  function vapaaId(perus) {
    var olemassa = (lista || []).map(function (t) { return t.id; }), id = perus, n = 2;
    while (olemassa.indexOf(id) >= 0) id = perus + "-" + n++;
    return id;
  }
  function puhdista(t) {
    var d = kopio(t); delete d.id; delete d.osoite;
    d.aromit = (d.aromit || []).map(function (a) { return String(a).trim(); }).filter(Boolean);
    d.viinit = (d.viinit || []).map(function (w) {
      Object.keys(w).forEach(function (k) { if (w[k] === "" && k !== "nimi") delete w[k]; });
      w.kuvat = (w.kuvat || []).filter(Boolean);
      if (!w.alkoholiton) delete w.alkoholiton;
      w.sokko = true;
      return w;
    });
    d.lopuksi = (d.lopuksi || []).filter(function (q) { return q.kysymys && q.kysymys.trim(); }).map(function (q) {
      var f = {}, o = {};
      ["viini", "alkoholiton"].forEach(function (l) {
        if (q.fakta && q.fakta[l]) f[l] = q.fakta[l];
        if (q.oikea && typeof q.oikea[l] === "number") o[l] = q.oikea[l];
      });
      var x = { id: q.id || "q" + Math.random().toString(36).slice(2, 7), kysymys: q.kysymys.trim() };
      if (Object.keys(f).length) x.fakta = f;
      if (Object.keys(o).length) x.oikea = o;
      return x;
    });
    return d;
  }
  function normalisoi(t) {
    var d = kopio(t);
    d.aromit = d.aromit || [];
    d.viinit = d.viinit || [];
    d.lopuksi = (d.lopuksi || []).map(function (q) {
      var f = q.fakta;
      if (typeof f === "string") f = { viini: f, alkoholiton: f };
      return { id: q.id, kysymys: q.kysymys || "", fakta: f || {}, oikea: q.oikea || {} };
    });
    d.lahjakortti = Object.assign({}, PERUS.lahjakortti, d.lahjakortti || {});
    return d;
  }

  /* ---------- Näkymät ---------- */
  function render() {
    if (!valmis) return;
    if (!Y) { app.innerHTML = '<main class="h-kehys"><h1 class="h-otsikko">Tastingit</h1><p class="h-ohje">Yhteysasetukset puuttuvat (asetukset.js).</p></main>'; return; }
    if (!onJuontaja()) { kirjautuminen(); return; }
    var h = location.hash.slice(1);
    if (h.indexOf("muokkaa-") === 0) { muokkausNakyma(h.slice(8)); return; }
    listaNakyma();
  }
  function yla(oikea) {
    return '<div class="h-yla"><span class="h-yla__nimi">viinitasting</span><div class="h-rivi">' + oikea + "</div></div>";
  }

  function kirjautuminen() {
    app.innerHTML = '<main class="h-kehys">' + yla("") + '<h1 class="h-otsikko">Tastingien hallinta</h1>' +
      '<div class="h-lomake"><div class="h-kentta"><label for="k-email">Sähköposti</label><input class="o-kentta" id="k-email" type="email" autocomplete="username" value="' + esc((A.juontajat || [])[0] || "") + '"></div>' +
      '<div class="h-kentta"><label for="k-salasana">Salasana</label><input class="o-kentta" id="k-salasana" type="password" autocomplete="current-password"></div>' +
      '<button class="vt-painike vt-painike--leveä" data-act="kirjaudu">Kirjaudu</button><p class="o-virhe" id="k-virhe" hidden></p></div></main>';
  }

  // Lista jaetaan kahteen välilehteen: tilaisuudet, jotka juonnat itse, ja asiakkaiden omatoimitastingit.
  var nakyma = "juonnettavat";
  try { nakyma = localStorage.getItem("h-nakyma") === "omatoimi" ? "omatoimi" : "juonnettavat"; } catch (e) {}
  function asetaNakyma(n) { nakyma = n; try { localStorage.setItem("h-nakyma", n); } catch (e) {} }
  function onOmatoimi(t) { return !!(t && (t.omatoimi || t.pohja)); }

  function kortti(t, nyt) {
    var alk = (t.viinit || []).filter(function (w) { return w.alkoholiton; }).length, juomia = (t.viinit || []).length;
    var tuleva = !t.pvm || t.pvm >= nyt;
    var tyyppi = onOmatoimi(t) ? '<span class="h-merkki h-merkki--omatoimi">' + (t.pohja ? "Omatoimipohja" : "Omatoimi") + "</span>"
      : '<span class="h-merkki h-merkki--juonnat">Juonnat</span>';
    var tila = t.pohja ? ""
      : t.omatoimi ? (vanhentunut(t) ? '<span class="h-merkki h-merkki--mennyt">Vanhentunut</span>' : '<span class="h-merkki h-merkki--tuleva">Voimassa ' + esc(pvmMs(t.voimassaAstiMs)) + " asti</span>")
      : '<span class="h-merkki ' + (tuleva ? "h-merkki--tuleva" : "h-merkki--mennyt") + '">' + (tuleva ? "Tuleva" : "Pidetty") + "</span>";
    var meta = t.pohja ? juomia + " juomaa · " + (t.lopuksi || []).length + " loppukysymystä"
      : (t.omatoimi ? (t.asiakas ? esc(t.asiakas) + " · " : "") + "tilattu " + esc(pvmTeksti(t.pvm)) : esc(pvmTeksti(t.pvm)) + (t.asiakas ? " · " + esc(t.asiakas) : "")) +
        " · " + juomia + " juomaa · " + (t.lopuksi || []).length + " loppukysymystä";
    return '<article class="h-kortti ' + (onOmatoimi(t) ? "h-kortti--omatoimi" : "h-kortti--juonnat") + (vanhentunut(t) ? " h-kortti--himmea" : "") + '"><div class="h-rivi">' + tyyppi + tila +
      (alk ? '<span class="h-merkki h-merkki--alk">Alkoholittomat</span>' : "") + "</div>" +
      "<h2>" + esc(t.nimi || t.id) + '</h2><div class="h-meta">' + meta + "</div>" +
      '<div class="h-rivi"><button class="vt-painike vt-painike--pieni" data-act="linkit" data-id="' + esc(t.id) + '">' + (auki[t.id] ? (t.pohja ? "Piilota ohje" : "Piilota linkit") : (t.pohja ? "Näin käytät" : "Linkit ja QR")) + "</button>" +
      '<a class="vt-painike vt-painike--pieni vt-painike--toissijainen" href="#muokkaa-' + esc(t.id) + '">Muokkaa</a></div>' +
      (auki[t.id] ? linkit(t) : "") + "</article>";
  }
  function ryhma(otsikko, ohje, kortit) {
    if (!kortit) return "";
    return '<section class="h-ryhma"><h2 class="h-ryhma__otsikko">' + otsikko + "</h2>" + (ohje ? '<p class="h-ohje">' + ohje + "</p>" : "") + kortit + "</section>";
  }

  function listaNakyma() {
    var h = '<main class="h-kehys">' + yla('<button class="vt-linkki" data-act="ulos">Kirjaudu ulos</button>') +
      '<h1 class="h-otsikko">Tastingit</h1>';
    if (lista === null) { app.innerHTML = h + '<p class="h-ohje">Ladataan…</p></main>'; return; }
    var nyt = tanaan();
    var juonn = lista.filter(function (t) { return !onOmatoimi(t); });
    var oma = lista.filter(function (t) { return t.omatoimi && !t.pohja; });
    var pohjatL = lista.filter(function (t) { return t.pohja; });
    var ids = lista.map(function (t) { return t.id; });
    var tuotavat = pohjat.filter(function (p) { return p && p.id && ids.indexOf(p.id) < 0; });
    var voimassaN = oma.filter(function (t) { return !vanhentunut(t); }).length;

    h += '<div class="h-valilehdet" role="tablist">' +
      '<button role="tab" aria-selected="' + (nakyma === "juonnettavat") + '" class="h-valilehti' + (nakyma === "juonnettavat" ? " h-valilehti--auki" : "") + '" data-act="nakyma" data-n="juonnettavat">Juonnettavat<span>' + juonn.filter(function (t) { return !t.pvm || t.pvm >= nyt; }).length + " tulossa</span></button>" +
      '<button role="tab" aria-selected="' + (nakyma === "omatoimi") + '" class="h-valilehti h-valilehti--omatoimi' + (nakyma === "omatoimi" ? " h-valilehti--auki" : "") + '" data-act="nakyma" data-n="omatoimi">Omatoimiset<span>' + voimassaN + " voimassa</span></button></div>";

    h += uusiAuki ? uusiLomake() : '<button class="vt-painike vt-painike--leveä' + (nakyma === "omatoimi" ? " vt-painike--omatoimi" : "") + '" data-act="uusi-auki">' +
      (nakyma === "omatoimi" ? "+ Uusi omatoimisetti asiakkaalle" : "+ Uusi juonnettava tasting") + "</button>";

    function tuoKortti(p) {
      return '<div class="h-kortti h-kortti--tuo"><h2>' + esc(p.nimi || p.id) + '</h2><div class="h-meta">' + (p.pohja ? "Omatoimipohja" : esc(pvmTeksti(p.pvm)) + (p.asiakas ? " · " + esc(p.asiakas) : "")) +
        '</div><p class="h-ohje">Claude on valmistellut tämän ' + (p.pohja ? "pohjan" : "setin") + ". Tuo se hallintaan, niin voit muokata ja käyttää sitä.</p>" +
        '<button class="vt-painike' + (p.pohja ? " vt-painike--omatoimi" : "") + '" data-act="tuo" data-id="' + esc(p.id) + '">Tuo ' + (p.pohja ? "pohja" : "setti") + "</button></div>";
    }
    if (nakyma === "juonnettavat") {
      var tuo = tuotavat.filter(function (p) { return !p.pohja; }).map(tuoKortti).join("");
      var tulevat = juonn.filter(function (t) { return !t.pvm || t.pvm >= nyt; }).sort(function (a, b) { return String(a.pvm || "9").localeCompare(String(b.pvm || "9")); });
      var pidetyt = juonn.filter(function (t) { return t.pvm && t.pvm < nyt; });
      if (!juonn.length && !tuotavat.length) h += '<p class="h-ohje">Ei vielä juonnettavia tastingeja.</p>';
      h += ryhma("Tulevat", "", tuo + tulevat.map(function (t) { return kortti(t, nyt); }).join(""));
      h += ryhma("Pidetyt", "", pidetyt.map(function (t) { return kortti(t, nyt); }).join(""));
    } else {
      var voimassa = oma.filter(function (t) { return !vanhentunut(t); }).sort(function (a, b) { return (a.voimassaAstiMs || 0) - (b.voimassaAstiMs || 0); });
      var vanhat = oma.filter(vanhentunut).sort(function (a, b) { return (b.voimassaAstiMs || 0) - (a.voimassaAstiMs || 0); });
      h += '<p class="h-ohje">Asiakkaat pitävät nämä itse omalla linkillään. Sinun ei tarvitse olla paikalla.</p>';
      h += ryhma("Asiakkaiden setit", voimassa.length ? "" : "Ei voimassa olevia omatoimisettejä.", voimassa.map(function (t) { return kortti(t, nyt); }).join("") || " ");
      var tuoPohjat = tuotavat.filter(function (p) { return p.pohja; }).map(tuoKortti).join("");
      h += ryhma("Pohjat", "Pohjista kopioidaan asiakkaiden setit. Pohja ei avaudu linkillä kenellekään.",
        (tuoPohjat + pohjatL.map(function (t) { return kortti(t, nyt); }).join("")) || '<p class="h-ohje">Ei vielä pohjia. Tee pohja kohdasta Uusi → Käyttö: Omatoimipohja.</p>');
      h += ryhma("Vanhentuneet", "", vanhat.map(function (t) { return kortti(t, nyt); }).join(""));
    }
    h += lahjaOsio();
    app.innerHTML = h + "</main>";
  }

  /* ---------- Lahjakortit: osallistujien kiitoslahjakoodit ---------- */
  function lahjaOsio() {
    var h = '<section class="h-osio h-lahjat"><h2 class="h-alaotsikko">Lahjakortit</h2>';
    if (!lahjatAuki) return h + '<p class="h-ohje">Kiitoslahjan koodit, jotka osallistujat ovat ottaneet. Tarkista koodi tästä, kun asiakas varaa sillä.</p><button class="vt-painike vt-painike--toissijainen vt-painike--leveä" data-act="lahjat-auki">Näytä lahjakortit</button></section>';
    if (lahjat === null) return h + '<p class="h-ohje">Ladataan…</p></section>';
    var kaytetty = lahjat.filter(function (l) { return l.kaytetty; }).length;
    h += '<p class="h-ohje">' + lahjat.length + " koodia otettu · " + kaytetty + " käytetty</p>" +
      '<div class="h-kentta"><label for="lahja-haku">Tarkista koodi</label><input class="o-kentta" id="lahja-haku" data-lahjahaku="1" autocomplete="off" autocapitalize="characters" placeholder="esim. VT40-FACE-AB12" value="' + esc(lahjaHaku) + '"></div>';
    if (!lahjat.length) return h + '<p class="h-ohje">Ei vielä koodeja. Koodi tallentuu tähän, kun osallistuja valitsee kiitoslahjasta Käytän itse tai Annan lahjaksi.</p></section>';
    var nyt = Date.now();
    h += '<ul class="h-lahjalista">' + lahjat.slice().sort(function (a, b) { return (b.luotuMs || 0) - (a.luotuMs || 0); }).map(function (l) {
      var vanha = l.voimassa && new Date(l.voimassa).getTime() < nyt;
      var tila = l.kaytetty ? '<span class="h-merkki h-merkki--mennyt">Käytetty</span>' : vanha ? '<span class="h-merkki h-merkki--mennyt">Vanhentunut</span>' : '<span class="h-merkki h-merkki--tuleva">Voimassa</span>';
      return '<li data-koodi="' + esc(l.koodi) + '"><div class="h-rivi"><b class="h-lahjakoodi">' + esc(l.koodi) + "</b>" + tila + "</div>" +
        '<div class="h-meta">' + (l.arvo ? esc(l.arvo) + " € · " : "") + esc(l.nimi || l.tasting || "") + (l.asiakas ? " · " + esc(l.asiakas) : "") +
        (l.luotuMs ? " · otettu " + new Date(l.luotuMs).toLocaleDateString("fi-FI") : "") + (l.voimassa ? " · voimassa " + new Date(l.voimassa).toLocaleDateString("fi-FI") + " asti" : "") +
        (l.valinta ? " · " + (l.valinta === "lahja" ? "annettu lahjaksi" : "itselle") : "") + "</div>" +
        '<button class="vt-painike vt-painike--pieni' + (l.kaytetty ? " vt-painike--toissijainen" : "") + '" data-act="lahja-merkitse" data-koodi="' + esc(l.koodi) + '" data-v="' + (l.kaytetty ? "0" : "1") + '">' + (l.kaytetty ? "Peru käyttö" : "Merkitse käytetyksi") + "</button></li>";
    }).join("") + '</ul><p class="h-ohje" id="lahja-eiloydy" hidden>Koodia ei löydy. Se ei ole tämän sovelluksen antama, tai se on otettu ennen kuin koodit alettiin tallentaa.</p></section>';
    return h;
  }
  function suodataLahjat() {
    var q = lahjaHaku.trim().toUpperCase().replace(/\s+/g, ""), nakyy = 0;
    document.querySelectorAll(".h-lahjalista li").forEach(function (li) { var on = !q || li.dataset.koodi.indexOf(q) >= 0; li.hidden = !on; if (on) nakyy++; });
    var e = document.getElementById("lahja-eiloydy"); if (e) e.hidden = !(q && !nakyy);
  }
  function haeLahjat() {
    window.VTData.listaaLahjat().then(function (l) { lahjat = l || []; render(); suodataLahjat(); },
      function () { lahjat = []; render(); ilmoita("Lahjakorttien haku epäonnistui. Onko firestore.rules päivitetty?"); });
  }

  var uusiPohja = null; // pohjan tunnus, kun lomake avataan pohjan kortista
  function uusiLomake() {
    var om = nakyma === "omatoimi";
    var pohjaLista = (lista || []).filter(function (t) { return t.pohja; });
    var muut = (lista || []).filter(function (t) { return !t.pohja && (om ? true : !t.omatoimi); });
    var valittu = uusiPohja || (om && pohjaLista.length ? pohjaLista[0].id : null);
    function vaihtoehto(t) {
      return '<option value="kopio:' + esc(t.id) + '"' + (t.id === valittu ? " selected" : "") + ">Kopio: " + esc(t.nimi || t.id) + (t.pohja ? "" : " (" + esc(pvmTeksti(t.pvm)) + ")") + "</option>";
    }
    var tyhjat = '<option value="tyhja:kuohu">Tyhjä · kuohuviinit</option><option value="tyhja:valkoinen">Tyhjä · valkoviinit</option><option value="tyhja:punainen">Tyhjä · punaviinit</option>';
    var vaihtoehdot = om
      ? (pohjaLista.length ? '<optgroup label="Omatoimipohjat">' + pohjaLista.map(vaihtoehto).join("") + "</optgroup>" : "") + '<optgroup label="Muut">' + tyhjat + muut.map(vaihtoehto).join("") + "</optgroup>"
      : tyhjat + muut.map(vaihtoehto).join("");
    var kaytto = om
      ? '<div class="h-kentta"><label for="u-kaytto">Mitä teet</label><select class="o-kentta" id="u-kaytto">' +
          '<option value="omatoimi"' + (pohjaLista.length ? " selected" : "") + ">Setti asiakkaalle (linkki " + OMATOIMI_PV + " pv)</option>" +
          '<option value="pohja"' + (pohjaLista.length ? "" : " selected") + ">Uusi pohja (ei avaudu linkillä)</option></select></div>"
      : '<input type="hidden" id="u-kaytto" value="tilaisuus">';
    return '<section class="h-osio' + (om ? " h-osio--omatoimi" : "") + '"><h2 class="h-alaotsikko">' + (om ? "Uusi omatoimisetti" : "Uusi juonnettava tasting") + "</h2>" +
      (om ? '<p class="h-ohje">Valitse pohja, kirjoita asiakkaan nimi ja luo. Saat heti linkin ja valmiin viestin asiakkaalle.</p>' : "") + '<div class="h-lomake">' +
      kaytto +
      '<div class="h-kentta"><label for="u-pohja">Pohja</label><select class="o-kentta" id="u-pohja">' + vaihtoehdot + "</select></div>" +
      '<div class="h-kentta"><label for="u-nimi">Nimi (näkyy osallistujille)' + (om ? ", tyhjä = pohjan nimi" : "") + '</label><input class="o-kentta" id="u-nimi" placeholder="' + (om ? "esim. Kuohuviinien eri tyylit" : "esim. Joulun tärpit") + '"></div>' +
      '<div class="h-kaksi"><div class="h-kentta"><label for="u-pvm">' + (om ? "Tilauspäivä" : "Päivämäärä") + '</label><input class="o-kentta" id="u-pvm" type="date" value="' + tanaan() + '"></div>' +
      '<div class="h-kentta"><label for="u-asiakas">Asiakas (vain sinulle)</label><input class="o-kentta" id="u-asiakas" placeholder="' + (om ? "esim. Virtanen, lahjatilaus" : "esim. Snowflake, Helsinki") + '"></div></div>' +
      '<div class="h-rivi"><button class="vt-painike' + (om ? " vt-painike--omatoimi" : "") + '" data-act="luo">' + (om ? "Luo omatoimisetti" : "Luo ja muokkaa") + '</button><button class="vt-linkki" data-act="uusi-kiinni">Peruuta</button></div></div></section>';
  }

  function linkit(t) {
    var u = osoite(t.id);
    var n = laskut[t.id];
    if (t.pohja) return '<div class="h-linkit h-linkit--ohje"><p class="h-ohje">Pohja ei avaudu linkillä kenellekään. Testaa se muokkausnäkymän Esikatsele-napilla. Kun asiakas tilaa, tee hänelle oma setti tästä pohjasta:</p><button class="vt-painike vt-painike--pieni vt-painike--omatoimi" data-act="uusi-pohjasta" data-id="' + esc(t.id) + '">Tee asiakkaalle setti tästä</button></div>';
    var omatoimi = t.omatoimi ? '<div class="h-rivi" style="margin:0 0 var(--vali-3)">' +
      '<button class="h-pieni" data-act="viesti" data-id="' + esc(t.id) + '">Kopioi viesti asiakkaalle</button>' +
      '<button class="h-pieni" data-act="jatka" data-id="' + esc(t.id) + '">Jatka ' + OMATOIMI_PV + " pv</button></div>" +
      '<p class="h-ohje" style="margin-bottom:var(--vali-3)">' + (vanhentunut(t) ? "Linkki on vanhentunut " + esc(pvmMs(t.voimassaAstiMs)) + ". Asiakas näkee vain ilmoituksen ja varauslinkin." : "Linkki toimii " + esc(pvmMs(t.voimassaAstiMs)) + " asti ja avaa vain tämän setin.") + "</p>" : "";
    return '<div class="h-linkit">' + qrSvg(u) + '<div>' + omatoimi + '<span class="h-label">Osallistujien linkki ja QR</span><span class="h-url">' + esc(u) + "</span>" +
      '<div class="h-rivi" style="margin:var(--vali-2) 0 var(--vali-3)"><button class="h-pieni" data-act="kopioi" data-url="' + esc(u) + '">Kopioi linkki</button>' +
      '<a class="h-pieni" style="display:inline-flex;align-items:center;text-decoration:none;color:inherit" href="' + esc(u) + '" target="_blank" rel="noopener">Testaa osallistujana</a></div>' +
      "<ul>" +
      '<li><a class="vt-linkki" href="' + esc(u) + '#ohjaus" target="_blank" rel="noopener">Puhelinohjaus</a></li>' +
      '<li><a class="vt-linkki" href="' + esc(u) + '#naytto" target="_blank" rel="noopener">Iso näyttö</a></li>' +
      '<li><a class="vt-linkki" href="' + esc(u) + '#poytakortti" target="_blank" rel="noopener">Pöytäkortit tulostettavaksi</a></li></ul>' +
      '<div class="h-rivi" style="margin-top:var(--vali-3)"><button class="h-pieni" data-act="laske" data-id="' + esc(t.id) + '">' + (n == null ? "Montako vastannut?" : "Vastanneita: " + n) + "</button>" +
      '<button class="h-pieni h-pieni--vaara" data-act="tyhjenna" data-id="' + esc(t.id) + '">Tyhjennä vastaukset</button></div>' +
      '<p class="h-ohje" style="margin-top:var(--vali-2)">Testauksen jälkeen tyhjennä vastaukset, niin tilaisuus alkaa puhtaalta pöydältä. Osallistujien omiin puhelimiin jäänyt tila nollautuu kohdasta Aloita alusta.</p>' +
      '<button class="h-pieni" style="margin-top:var(--vali-3)" data-act="kooste" data-id="' + esc(t.id) + '">' + (koosteet[t.id] ? "Päivitä tilaisuuden yhteenveto" : "Tilaisuuden yhteenveto") + "</button>" +
      "</div></div>" + (koosteet[t.id] ? koosteHtml(t, koosteet[t.id]) : "");
  }

  /* ---------- Tilaisuuden yhteenveto juontajalle ---------- */
  function desi(x) { return x.toFixed(1).replace(".", ","); }
  function kooste(t, k) {
    var viinit = t.viinit || [], aromit = t.aromit || [], loppu = k.loppu || {};
    var linjat = viinit.some(function (w) { return w.alkoholiton; }) ? ["viini", "alkoholiton"] : ["viini"];
    function indeksit(l) { var r = []; viinit.forEach(function (w, i) { if ((l === "alkoholiton") === !!w.alkoholiton) r.push(i); }); return r; }
    function nimi(i) { return viinit[i].lyhyt || viinit[i].nimi; }
    // Puhelinten tallentamat vastaukset (yksi dokumentti per osallistuja): varalähde, jos yhteiset laskurit ovat tyhjiä
    // (esim. sokkotasting ennen 21.11.2026, jolloin aromeja ei koottu laskureihin).
    var V = k.__vastaukset || [];
    function vAromit(i) {
      var a = {}, o = {};
      V.forEach(function (d) {
        var r = d && d.v && d.v["v" + i]; if (!r) return;
        (r.a || []).forEach(function (j) { a[j] = (a[j] || 0) + 1; });
        var ol = Array.isArray(r.o) ? r.o : (typeof r.o === "string" && r.o ? [r.o] : []), nahty = {};
        ol.forEach(function (x) { var key = String(x).trim().toLowerCase(); if (!key || nahty[key]) return; nahty[key] = 1; o[key] = o[key] || { t: String(x).trim(), n: 0 }; o[key].n++; });
      });
      return { a: a, o: o };
    }
    function vTahdet(i) { var t5 = {}; V.forEach(function (d) { var r = d && d.v && d.v["v" + i]; if (r && typeof r.t === "number") t5[r.t] = (t5[r.t] || 0) + 1; }); return t5; }
    function vKysymys(q, l, ii) { var c = {}; V.forEach(function (d) { if (!d || (d.l || "viini") !== l || !d.L) return; var x = d.L[q.id]; if (typeof x === "number") c[x] = (c[x] || 0) + 1; }); return c; }
    var lahdeVastaukset = false;
    var tulos = { mukana: Math.max(0, loppu.m || 0, V.length), vastauksia: V.length, linjat: [] };
    linjat.forEach(function (l) {
      var ii = indeksit(l), L = { l: l, tahdet: [], aromit: [], kysymykset: [] };
      ii.forEach(function (i, n) {
        var t5 = (loppu.t || {})[i] || {}, cnt = 0, sum = 0, jak = [];
        if (!Object.keys(t5).some(function (x) { return t5[x] > 0; })) { var vt = vTahdet(i); if (Object.keys(vt).length) { t5 = vt; lahdeVastaukset = true; } }
        for (var s = 0; s <= 5; s++) { var c = Math.max(0, t5[s] || 0); cnt += c; sum += c * s; jak.push(c); }
        L.tahdet.push({ i: i, nro: n + 1, nimi: nimi(i), ka: cnt ? sum / cnt : null, n: cnt, jakauma: jak });
        var v = k["v" + i] || {}, lst = [];
        aromit.forEach(function (a, j) { var c = v.a && v.a[j] > 0 ? v.a[j] : 0; if (c) lst.push({ t: a, n: c }); });
        Object.keys(v.o || {}).forEach(function (h) { var x = v.o[h]; if (x && x.t && x.n > 0) lst.push({ t: x.t, n: x.n, oma: true }); });
        if (!lst.length) {
          var va = vAromit(i);
          aromit.forEach(function (a, j) { if (va.a[j]) lst.push({ t: a, n: va.a[j] }); });
          Object.keys(va.o).forEach(function (h) { lst.push({ t: va.o[h].t, n: va.o[h].n, oma: true }); });
          if (lst.length) lahdeVastaukset = true;
        }
        lst.sort(function (a, b) { return b.n - a.n; });
        L.aromit.push({ nro: n + 1, nimi: nimi(i), lista: lst });
      });
      L.tahdet.sort(function (a, b) { return (b.ka || 0) - (a.ka || 0); });
      (t.lopuksi || []).forEach(function (q) {
        var d = ((loppu.L || {})[q.id + "-" + l]) || {};
        if (!Object.keys(d).some(function (x) { return d[x] > 0; })) { var vk = vKysymys(q, l, ii); if (Object.keys(vk).length) { d = vk; lahdeVastaukset = true; } }
        var rivit = ii.map(function (i, n) { return { nimi: "Lasi " + (n + 1) + " · " + nimi(i), n: Math.max(0, d[n] || 0) }; });
        var yht = rivit.reduce(function (a, b) { return a + b.n; }, 0);
        L.kysymykset.push({ kysymys: q.kysymys, rivit: rivit, yht: yht });
      });
      tulos.linjat.push(L);
    });
    tulos.lahdeVastaukset = lahdeVastaukset;
    return tulos;
  }
  function koosteTeksti(t, K) {
    var r = [(t.nimi || "Tasting") + (t.pvm ? " · " + pvmTeksti(t.pvm) : ""), K.mukana + " maistajaa mukana", ""];
    K.linjat.forEach(function (L) {
      if (K.linjat.length > 1) r.push(L.l === "alkoholiton" ? "ALKOHOLITTOMAT" : "KUOHUVIINIT");
      r.push("Tähdet:");
      L.tahdet.forEach(function (x) { r.push("  " + (x.ka == null ? "–" : "★ " + desi(x.ka)) + "  " + x.nimi + " (" + x.n + " arviota" + (x.n ? "; jakauma 0–5★: " + x.jakauma.join(" / ") : "") + ")"); });
      r.push("Aromit:");
      L.aromit.forEach(function (x) { r.push("  Lasi " + x.nro + " · " + x.nimi + ": " + (x.lista.length ? x.lista.map(function (a) { return a.t + " " + a.n; }).join(", ") : "–")); });
      L.kysymykset.forEach(function (q) {
        r.push(q.kysymys + " (" + q.yht + " vastausta)");
        q.rivit.forEach(function (x) { r.push("  " + x.nimi + ": " + (q.yht ? Math.round(100 * x.n / q.yht) : 0) + " %"); });
      });
      r.push("");
    });
    return r.join("\n");
  }
  function koosteHtml(t, k) {
    var K = kooste(t, k);
    var h = '<section class="h-kooste"><h3>Tilaisuuden yhteenveto</h3><p class="h-kooste__iso"><b>' + K.mukana + "</b> maistajaa mukana</p>" +
      (K.lahdeVastaukset ? '<p class="h-ohje">Osa luvuista on koottu puhelinten tallentamista vastauksista (' + K.vastauksia + ' puhelinta). Mukana ovat lasit, jotka maistaja ehti merkitä valmiiksi.</p>' : "");
    K.linjat.forEach(function (L) {
      var tyhja = !L.tahdet.some(function (x) { return x.n; }) && !L.aromit.some(function (x) { return x.lista.length; });
      if (tyhja) { h += '<div class="h-kooste__linja' + (L.l === "alkoholiton" ? " h-kooste__linja--alk" : "") + '"><h4>' + (L.l === "alkoholiton" ? "Alkoholittomat" : "Kuohuviinit") + '</h4><p class="h-ohje" style="margin:var(--vali-1) 0 0">Ei vielä vastauksia.</p></div>'; return; }
      h += '<div class="h-kooste__linja' + (L.l === "alkoholiton" ? " h-kooste__linja--alk" : "") + '">' + (K.linjat.length > 1 ? "<h4>" + (L.l === "alkoholiton" ? "Alkoholittomat" : "Kuohuviinit") + "</h4>" : "") +
        "<h5>Suosikit</h5><ol>" + L.tahdet.map(function (x) { return "<li><span>" + esc(x.nimi) + "</span><b>" + (x.ka == null ? "–" : "★ " + desi(x.ka)) + '</b><small>' + x.n + " arviota</small></li>"; }).join("") + "</ol>" +
        "<h5>Tähtien jakauma</h5>" + L.tahdet.slice().sort(function (a, b) { return a.nro - b.nro; }).map(function (x) {
          var max = Math.max.apply(null, x.jakauma.concat([1]));
          return '<div class="h-jakauma"><div class="h-jakauma__yla"><b>Lasi ' + x.nro + " · " + esc(x.nimi) + "</b><span>" + (x.ka == null ? "–" : "★ " + desi(x.ka)) + " · " + x.n + ' kpl</span></div><div class="jt-tahdet">' +
            x.jakauma.map(function (c, o) { return '<div class="jt-tahdet__sarake"><span class="jt-tahdet__n">' + c + '</span><i style="height:' + Math.round(c / max * 100) + '%"></i><span class="jt-tahdet__o">' + o + "★</span></div>"; }).join("") + "</div></div>";
        }).join("") +
        "<h5>Kaikki aromit</h5>" + L.aromit.map(function (x) {
          return '<p class="h-kooste__aromit"><b>Lasi ' + x.nro + " · " + esc(x.nimi) + "</b>" + (x.lista.length ? x.lista.map(function (a) { return '<span class="' + (a.oma ? "oma" : "") + '">' + emoji(a.t) + esc(a.t) + " <i>" + a.n + "</i></span>"; }).join("") : "<span>–</span>") + "</p>";
        }).join("") +
        L.kysymykset.map(function (q) {
          return "<h5>" + esc(q.kysymys) + " · " + q.yht + " vastausta</h5><ul>" + q.rivit.map(function (x) { var p = q.yht ? Math.round(100 * x.n / q.yht) : 0; return "<li><span>" + esc(x.nimi) + "</span><b>" + p + ' %</b><i style="width:' + p + '%"></i></li>'; }).join("") + "</ul>";
        }).join("") + "</div>";
    });
    return h + '<button class="vt-painike vt-painike--pieni vt-painike--toissijainen" data-act="kooste-kopioi" data-id="' + esc(t.id) + '">Kopioi tekstinä</button>' +
      '<p class="h-ohje" style="margin-top:var(--vali-2)">Hyvä pohja Instagram-postaukseen tai asiakkaalle lähetettävään kiitosviestiin.</p></section>';
  }

  /* ---------- Muokkaus ---------- */
  function muokkausNakyma(id) {
    if (muokId !== id) {
      var t = (lista || []).filter(function (x) { return x.id === id; })[0];
      if (!t) {
        if (lista === null) { app.innerHTML = '<main class="h-kehys"><p class="h-ohje">Ladataan…</p></main>'; return; }
        app.innerHTML = '<main class="h-kehys">' + yla("") + '<p class="h-ohje">Tastingia ei löytynyt.</p><a class="vt-linkki" href="#">Takaisin listaan</a></main>'; return;
      }
      muok = normalisoi(t); muokId = id; muutettu = false; juomaAuki = {};
    }
    var w = muok, alkOn = w.viinit.some(function (x) { return x.alkoholiton; });
    var h = '<main class="h-kehys">' + yla('<a class="vt-linkki" href="#" data-act="takaisin">← Tastingit</a>') +
      '<h1 class="h-otsikko">' + esc(w.nimi || "Nimetön tasting") + "</h1>" +
      '<p class="h-ohje">Osallistujien linkki: <b>' + esc(osoite(id)) + "</b></p>";

    // Perustiedot
    h += '<section class="h-osio"><h2 class="h-alaotsikko">Perustiedot</h2><div class="h-lomake">' +
      kentta("nimi", "Nimi (näkyy osallistujille)", w.nimi) +
      '<div class="h-kaksi">' + kentta("pvm", "Päivämäärä", w.pvm, "date") + kentta("asiakas", "Asiakas (vain sinulle)", w.asiakas) + "</div>" +
      kentta("kuvaus", "Esittelyteksti aloitusnäkymään", w.kuvaus, "textarea") +
      '<label class="h-valinta"><input type="checkbox" data-p="sokkotasting"' + (w.sokkotasting ? " checked" : "") + "> Sokkotasting pareittain (1+2, 3+4 … ja viimeisen lasin viereen jokainen valitsee suosikkinsa; viinien tiedot aukeavat, kun kierroksen lasit on arvioitu)</label>" +
      '<label class="h-valinta"><input type="checkbox" data-p="lahjakortti.kaytossa"' + (w.lahjakortti.kaytossa ? " checked" : "") + "> Kiitoslahja lopussa (lahjakortti)</label>" +
      (w.lahjakortti.kaytossa ? '<div class="h-kaksi">' + kentta("lahjakortti.arvo", "Lahjakortin arvo (€)", w.lahjakortti.arvo, "number") + kentta("lahjakortti.tunnus", "Tunnus koodiin (esim. TEK)", w.lahjakortti.tunnus) + "</div>" : "") +
      kentta("googleArvioLinkki", "Google-arvion linkki", w.googleArvioLinkki || "") +
      '<div class="h-rivi"><button class="h-pieni" data-act="pohja-kuvat">Hae kuvat valmiista setistä</button><span class="h-ohje" style="margin:0">Lisää Clauden valmistelemat kuvat (esim. kartat) samannimisille viineille.</span></div>' +
      "</div></section>";

    // Aromit
    h += '<section class="h-osio"><h2 class="h-alaotsikko">Aromit</h2><p class="h-ohje">Osallistuja valitsee jokaisesta lasista kaikki aromit, jotka löytää. Sama lista kaikille juomille.</p>' +
      '<div class="h-aromit">' + w.aromit.map(function (a, i) { return '<span class="h-aromi">' + emoji(a) + esc(a) + '<button data-act="aromi-pois" data-i="' + i + '" aria-label="Poista ' + esc(a) + '">×</button></span>'; }).join("") + "</div>" +
      '<div class="h-lisaa"><input class="o-kentta" id="aromi-uusi" placeholder="Uusi aromi, esim. Mineraalisuus" style="min-height:46px;font-size:16px"><button class="vt-painike vt-painike--pieni" data-act="aromi-lisaa">Lisää</button></div>' +
      '<div class="h-rivi"><span class="h-label" style="margin:0">Valmis lista:</span><button class="h-pieni" data-act="aromit-pohja" data-v="kuohu">Kuohuviinit</button><button class="h-pieni" data-act="aromit-pohja" data-v="valkoinen">Valkoviinit</button><button class="h-pieni" data-act="aromit-pohja" data-v="punainen">Punaviinit</button></div></section>';

    // Juomat
    var nV = 0, nA = 0;
    h += '<section class="h-osio"><h2 class="h-alaotsikko">Juomat</h2><p class="h-ohje">Järjestys on maistelujärjestys. Jos mukana on alkoholittomia, lasit parittuvat järjestyksessä: 1. viini ja 1. alkoholiton ovat lasi 1, ja niin edelleen.</p><div>' +
      w.viinit.map(function (v, i) {
        var nro = v.alkoholiton ? ++nA : ++nV;
        return juomaLomake(v, i, nro);
      }).join("") + "</div>" +
      '<button class="vt-painike vt-painike--toissijainen vt-painike--leveä" data-act="juoma-lisaa">+ Lisää juoma</button></section>';

    // Lopuksi
    var V = w.viinit.filter(function (x) { return !x.alkoholiton; }), Al = w.viinit.filter(function (x) { return x.alkoholiton; });
    h += '<section class="h-osio"><h2 class="h-alaotsikko">Lopuksi-kysymykset</h2><p class="h-ohje">1–4 kysymystä kaikista lasien juomista. Vastausvaihtoehdot ovat osallistujan omat juomat. Tähtien keskiarvot näytetään lopuksi automaattisesti.</p>' +
      w.lopuksi.map(function (q, i) {
        return '<div class="h-kysymys">' + kentta("lopuksi." + i + ".kysymys", "Kysymys " + (i + 1), q.kysymys) +
          kentta("lopuksi." + i + ".fakta.viini", alkOn ? "Fakta vastauksen jälkeen · viinit" : "Fakta vastauksen jälkeen (valinnainen)", q.fakta.viini, "textarea") +
          (alkOn ? kentta("lopuksi." + i + ".fakta.alkoholiton", "Fakta · alkoholittomat", q.fakta.alkoholiton, "textarea") : "") +
          '<div class="h-kaksi">' + oikeaValinta(i, "viini", V, alkOn ? "Oikea vastaus · viinit" : "Oikea vastaus (antaa pisteen)") +
          (alkOn ? oikeaValinta(i, "alkoholiton", Al, "Oikea vastaus · alkoholittomat") : "") + "</div>" +
          '<div class="h-rivi"><button class="h-pieni h-pieni--vaara" data-act="kysymys-pois" data-i="' + i + '">Poista kysymys</button></div></div>';
      }).join("") +
      (w.lopuksi.length < 4 ? '<button class="vt-painike vt-painike--toissijainen vt-painike--leveä" data-act="kysymys-lisaa">+ Lisää kysymys</button>' : "") + "</section>";

    // Muut toiminnot
    h += '<section class="h-osio"><h2 class="h-alaotsikko">Muut</h2><div class="h-rivi">' +
      '<a class="h-pieni" style="display:inline-flex;align-items:center;text-decoration:none;color:inherit" href="' + esc(osoite(id)) + '" target="_blank" rel="noopener">Avaa osallistujana</a>' +
      '<button class="h-pieni h-pieni--vaara" data-act="poista-tasting">Poista tasting</button></div></section>';

    h += "</main>" +
      '<div class="h-palkki"><div class="h-palkki__sisus"><span class="h-palkki__tila' + (muutettu ? " on" : "") + '" id="tila">' + (muutettu ? "Tallentamattomia muutoksia" : "Kaikki tallennettu") + "</span>" +
      '<button class="vt-painike vt-painike--toissijainen h-esikatsele" data-act="esikatsele">Esikatsele</button>' +
      '<button class="vt-painike" data-act="tallenna"' + (tallentaa ? " disabled" : "") + ">" + (tallentaa ? "Tallennetaan…" : "Tallenna") + "</button></div></div>";
    var y = window.scrollY;
    app.innerHTML = h;
    window.scrollTo(0, y);
    taytaKuvat();
  }
  function kentta(polku, otsikko, arvo, tyyppi) {
    var id = "f-" + polku.replace(/\./g, "-");
    var a = arvo == null ? "" : arvo;
    var input = tyyppi === "textarea"
      ? '<textarea class="o-kentta" id="' + id + '" data-p="' + polku + '">' + esc(a) + "</textarea>"
      : '<input class="o-kentta" id="' + id + '" data-p="' + polku + '" type="' + (tyyppi || "text") + '" value="' + esc(a) + '">';
    return '<div class="h-kentta"><label for="' + id + '">' + otsikko + "</label>" + input + "</div>";
  }
  function valinta(polku, otsikko, arvo, vaihtoehdot) {
    var id = "f-" + polku.replace(/\./g, "-");
    return '<div class="h-kentta"><label for="' + id + '">' + otsikko + '</label><select class="o-kentta" id="' + id + '" data-p="' + polku + '">' +
      vaihtoehdot.map(function (v) { return '<option value="' + esc(v[0]) + '"' + (String(v[0]) === String(arvo) ? " selected" : "") + ">" + esc(v[1]) + "</option>"; }).join("") + "</select></div>";
  }
  function oikeaValinta(i, l, juomat, otsikko) {
    var arvo = muok.lopuksi[i].oikea[l];
    return valinta("lopuksi." + i + ".oikea." + l, otsikko, typeof arvo === "number" ? arvo : "",
      [["", "Ei oikeaa vastausta"]].concat(juomat.map(function (x, k) { return [k, "Lasi " + (k + 1) + " · " + (x.lyhyt || x.nimi || "nimetön")]; })));
  }
  function juomaLomake(v, i, nro) {
    var p = "viinit." + i + ".";
    var kuvat = (v.kuvat || []);
    return '<details class="h-juoma' + (v.alkoholiton ? " h-juoma--alk" : "") + '" data-juoma="' + i + '"' + (juomaAuki[i] ? " open" : "") + ">" +
      '<summary><span class="h-pallo">' + nro + "</span><b>" + esc(v.nimi || "Uusi juoma") + "<small>" + (v.alkoholiton ? "Alkoholiton · " : "") + esc([v.alue, v.maa].filter(Boolean).join(", ") || "Täydennä tiedot") + "</small></b></summary>" +
      '<div class="h-juoma__sisus">' +
      kentta(p + "nimi", "Nimi", v.nimi) +
      '<div class="h-kaksi">' + kentta(p + "lyhyt", "Lyhyt nimi (vertailukysymyksiin)", v.lyhyt) +
      valinta(p + "tyyppi", "Tyyppi", v.tyyppi || "kuohu", TYYPIT) + "</div>" +
      '<label class="h-valinta"><input type="checkbox" data-p="' + p + 'alkoholiton"' + (v.alkoholiton ? " checked" : "") + "> Alkoholiton</label>" +
      kentta(p + "tyyppiNimi", "Tyypin nimi paljastuksen jälkeen (esim. Samppanja, Crémant)", v.tyyppiNimi) +
      '<div class="h-kaksi">' + kentta(p + "tuottaja", "Tuottaja", v.tuottaja) + kentta(p + "rypaleet", "Rypäleet", v.rypaleet) + "</div>" +
      '<div class="h-kaksi">' + kentta(p + "alue", "Alue", v.alue) + kentta(p + "maa", "Maa", v.maa) + "</div>" +
      kentta(p + "tarina", "Infokortti: tarina", v.tarina, "textarea") +
      kentta(p + "maistele", "Infokortti: kiinnitä huomiota", v.maistele, "textarea") +
      kentta(p + "ruoaksi", "Infokortti: ruoaksi", v.ruoaksi) +
      kentta(p + "juontajalle", "Omat muistiinpanot (vain ohjauspaneelissa)", v.juontajalle, "textarea") +
      '<div><span class="h-label">Kuvat infokorttiin (enintään ' + MAX_KUVAT + ")</span><div class=\"h-kuvat\">" +
      kuvat.map(function (k, j) {
        return '<div class="h-kuva"><img data-kuva="' + esc(k) + '" alt=""><button data-act="kuva-pois" data-i="' + i + '" data-j="' + j + '" aria-label="Poista kuva">×</button></div>';
      }).join("") +
      (kuvat.length < MAX_KUVAT ? '<label class="h-kuva h-kuva--lisaa">+ Lisää kuva<input type="file" accept="image/*" data-kuva-input="' + i + '"></label>' : "") +
      "</div></div>" +
      '<div class="h-rivi"><button class="h-pieni" data-act="juoma-ylos" data-i="' + i + '"' + (i === 0 ? " disabled" : "") + ">↑ Ylös</button>" +
      '<button class="h-pieni" data-act="juoma-alas" data-i="' + i + '"' + (i === muok.viinit.length - 1 ? " disabled" : "") + ">↓ Alas</button>" +
      '<button class="h-pieni h-pieni--vaara" data-act="juoma-pois" data-i="' + i + '">Poista juoma</button></div>' +
      "</div></details>";
  }

  function aseta(polku, arvo) {
    var o = polku.split("."), x = muok;
    for (var i = 0; i < o.length - 1; i++) {
      var k = /^\d+$/.test(o[i]) ? +o[i] : o[i];
      if (x[k] == null) x[k] = {};
      x = x[k];
    }
    x[o[o.length - 1]] = arvo;
  }
  function merkitse() {
    muutettu = true;
    var t = document.getElementById("tila");
    if (t) { t.textContent = "Tallentamattomia muutoksia"; t.className = "h-palkki__tila on"; }
  }
  function rakenne() { merkitse(); muokkausNakyma(muokId); }

  function taytaKuvat() {
    Array.prototype.forEach.call(document.querySelectorAll("img[data-kuva]:not([src])"), function (img) {
      var p = img.getAttribute("data-kuva");
      if (kuvaVarasto[p]) { img.src = kuvaVarasto[p]; return; }
      window.VTData.haeKuva(p).then(function (src) { if (src) { kuvaVarasto[p] = src; img.src = src; } });
    });
  }
  function pienenna(tiedosto) {
    return new Promise(function (ok, virhe) {
      var url = URL.createObjectURL(tiedosto), img = new Image();
      img.onload = function () {
        var max = 1100, s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var q = 0.78, d = c.toDataURL("image/jpeg", q);
        while (d.length > 700000 && q > 0.4) { q -= 0.1; d = c.toDataURL("image/jpeg", q); }
        ok(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); virhe(new Error("kuva")); };
      img.src = url;
    });
  }

  function tallenna() {
    if (tallentaa) return;
    if (!muok.nimi || !String(muok.nimi).trim()) { ilmoita("Anna tastingille nimi."); return; }
    tallentaa = true; muokkausNakyma(muokId);
    var data = puhdista(muok);
    window.VTData.tallenna(muokId, data).then(function () {
      tallentaa = false; muutettu = false;
      lista = (lista || []).filter(function (t) { return t.id !== muokId; }).concat([Object.assign({ id: muokId }, data)])
        .sort(function (a, b) { return String(b.pvm || "").localeCompare(String(a.pvm || "")); });
      muok = normalisoi(data);
      ilmoita("Tallennettu");
      muokkausNakyma(muokId);
    }, function () { tallentaa = false; ilmoita("Tallennus epäonnistui. Tarkista yhteys ja Firestoren säännöt."); muokkausNakyma(muokId); });
  }

  function luo() {
    var nimi = (document.getElementById("u-nimi").value || "").trim();
    var pvm = document.getElementById("u-pvm").value || "";
    var asiakas = (document.getElementById("u-asiakas").value || "").trim();
    var pohja = document.getElementById("u-pohja").value;
    var kaytto = (document.getElementById("u-kaytto") || {}).value || "tilaisuus";
    // Omatoimisetti pohjasta: nimeksi käy pohjan nimi, jos kenttä jätettiin tyhjäksi.
    if (!nimi && kaytto === "omatoimi" && pohja.indexOf("kopio:") === 0) {
      nimi = ((lista || []).filter(function (t) { return t.id === pohja.slice(6); })[0] || {}).nimi || "";
    }
    if (!nimi) { ilmoita("Anna nimi."); return; }
    // Omatoimisetti saa arvaamattoman tunnuksen, jotta linkki avaa vain tämän asiakkaan setin.
    var id = kaytto === "omatoimi" ? vapaaId("o-" + satunnainen(12))
      : kaytto === "pohja" ? vapaaId("pohja-" + slug(nimi))
      : vapaaId(slug(nimi) + (pvm ? "-" + pvm.slice(8, 10) + pvm.slice(5, 7) : ""));
    var data, kuvaKopiot = Promise.resolve();
    if (pohja.indexOf("kopio:") === 0) {
      var lahde = (lista || []).filter(function (t) { return t.id === pohja.slice(6); })[0];
      data = puhdista(lahde || {});
      kuvaKopiot = Promise.all(data.viinit.map(function (w) {
        return Promise.all((w.kuvat || []).map(function (k) {
          return window.VTData.haeKuva(k).then(function (src) { return src ? window.VTData.tallennaKuva(id, src) : null; });
        })).then(function (uudet) { w.kuvat = uudet.filter(Boolean); });
      }));
    } else {
      var laji = pohja.split(":")[1] || "kuohu";
      data = Object.assign(kopio(PERUS), { aromit: AROMIT[laji].slice(), viinit: [], lopuksi: [
        { id: "makein", kysymys: "Mikä tuntui makeimmalta?" }, { id: "paras", kysymys: "Mikä oli paras?" }] });
      data.oletusTyyppi = laji;
    }
    data.nimi = nimi; data.pvm = pvm; data.asiakas = asiakas;
    data.kuvaus = data.kuvaus || "Löydä aromit, anna tähdet. Lopuksi nähdään, mitä porukka löysi.";
    data.lahjakortti = Object.assign({}, PERUS.lahjakortti, data.lahjakortti || {});
    if (!data.lahjakortti.tunnus) data.lahjakortti.tunnus = slug(asiakas || nimi).split("-")[0].toUpperCase().slice(0, 8);
    delete data.omatoimi; delete data.voimassaAstiMs; delete data.pohja;
    if (kaytto === "omatoimi") { data.omatoimi = true; data.voimassaAstiMs = Date.now() + OMATOIMI_PV * 864e5; }
    if (kaytto === "pohja") data.pohja = true;
    ilmoita("Luodaan…");
    kuvaKopiot.then(function () { return window.VTData.tallenna(id, data); }).then(function () {
      lista = (lista || []).concat([Object.assign({ id: id }, data)]);
      uusiAuki = false; uusiPohja = null;
      asetaNakyma(kaytto === "tilaisuus" ? "juonnettavat" : "omatoimi");
      // Asiakkaan setti on yleensä valmis kopio pohjasta: näytetään heti linkki ja viesti asiakkaalle.
      if (kaytto === "omatoimi" && pohja.indexOf("kopio:") === 0) { auki[id] = true; ilmoita("Omatoimisetti luotu"); render(); return; }
      location.hash = "muokkaa-" + id;
    }, function () { ilmoita("Luonti epäonnistui."); });
  }

  /* ---------- Tapahtumat ---------- */
  app.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]");
    if (!t) return;
    var act = t.dataset.act, i = +t.dataset.i;
    switch (act) {
      case "kirjaudu":
        var em = document.getElementById("k-email").value.trim(), pw = document.getElementById("k-salasana").value, ve = document.getElementById("k-virhe");
        t.disabled = true;
        Y.kirjaudu(em, pw).then(function () { if (!onJuontaja()) { ve.hidden = false; ve.textContent = "Tunnus ei ole juontajan tunnus."; t.disabled = false; } },
          function () { ve.hidden = false; ve.textContent = "Kirjautuminen ei onnistunut. Tarkista sähköposti ja salasana."; t.disabled = false; });
        break;
      case "ulos": Y.ulos(); break;
      case "uusi-auki": uusiAuki = true; render(); setTimeout(function () { var n = document.getElementById("u-nimi"); if (n) n.focus(); }, 0); break;
      case "uusi-kiinni": uusiAuki = false; uusiPohja = null; render(); break;
      case "nakyma": asetaNakyma(t.dataset.n); uusiAuki = false; uusiPohja = null; render(); window.scrollTo(0, 0); break;
      case "uusi-pohjasta":
        asetaNakyma("omatoimi"); uusiPohja = t.dataset.id; uusiAuki = true; render(); window.scrollTo(0, 0);
        setTimeout(function () { var n = document.getElementById("u-nimi"); if (n) n.focus(); }, 0); break;
      case "lahjat-auki": lahjatAuki = true; lahjat = null; render(); haeLahjat(); break;
      case "lahja-merkitse":
        t.disabled = true;
        window.VTData.merkitseLahja(t.dataset.koodi, t.dataset.v === "1").then(function () {
          (lahjat || []).forEach(function (l) { if (l.koodi === t.dataset.koodi) l.kaytetty = t.dataset.v === "1"; });
          render(); suodataLahjat(); ilmoita(t.dataset.v === "1" ? "Merkitty käytetyksi" : "Käyttö peruttu");
        }, function () { t.disabled = false; ilmoita("Tallennus epäonnistui"); });
        break;
      case "luo": luo(); break;
      case "linkit": auki[t.dataset.id] = !auki[t.dataset.id]; render(); break;
      case "viesti":
        var vt = (lista || []).filter(function (x) { return x.id === t.dataset.id; })[0];
        if (!vt) return;
        (navigator.clipboard ? navigator.clipboard.writeText(asiakasViesti(vt)) : Promise.reject()).then(function () { ilmoita("Viesti kopioitu"); }, function () { ilmoita("Kopiointi ei onnistunut"); });
        break;
      case "jatka":
        var jt = (lista || []).filter(function (x) { return x.id === t.dataset.id; })[0];
        if (!jt) return;
        t.disabled = true;
        var jatkettu = Object.assign({}, jt, { voimassaAstiMs: Math.max(Date.now(), jt.voimassaAstiMs || 0) + OMATOIMI_PV * 864e5 });
        window.VTData.tallenna(jt.id, puhdista(jatkettu)).then(function () {
          jt.voimassaAstiMs = jatkettu.voimassaAstiMs; ilmoita("Voimassa " + pvmMs(jt.voimassaAstiMs) + " asti"); render();
        }, function () { t.disabled = false; ilmoita("Tallennus epäonnistui."); });
        break;
      case "kopioi":
        (navigator.clipboard ? navigator.clipboard.writeText(t.dataset.url) : Promise.reject()).then(function () { ilmoita("Linkki kopioitu"); }, function () { ilmoita(t.dataset.url); });
        break;
      case "kooste":
        t.disabled = true;
        Promise.all([window.VTData.haeKoonnit(t.dataset.id), window.VTData.haeVastaukset ? window.VTData.haeVastaukset(t.dataset.id).catch(function () { return []; }) : Promise.resolve([])])
          .then(function (r) { var k = r[0] || {}; k.__vastaukset = r[1] || []; koosteet[t.dataset.id] = k; render(); }, function () { t.disabled = false; ilmoita("Yhteenvedon haku epäonnistui."); });
        break;
      case "kooste-kopioi":
        var kt = (lista || []).filter(function (x) { return x.id === t.dataset.id; })[0];
        if (!kt) return;
        var teksti = koosteTeksti(kt, kooste(kt, koosteet[kt.id] || {}));
        (navigator.clipboard ? navigator.clipboard.writeText(teksti) : Promise.reject()).then(function () { ilmoita("Yhteenveto kopioitu"); }, function () { ilmoita("Kopiointi ei onnistunut"); });
        break;
      case "esikatsele":
        try { localStorage.setItem("vt-esikatselu", JSON.stringify(muok)); } catch (err) { ilmoita("Esikatselu ei onnistunut."); return; }
        window.open("/?esikatselu=" + encodeURIComponent(muokId), "_blank");
        break;
      case "laske":
        window.VTData.laskeVastaukset(t.dataset.id).then(function (n) { laskut[t.dataset.id] = n; render(); }, function () { ilmoita("Laskenta epäonnistui."); });
        break;
      case "tyhjenna":
        if (!window.confirm("Tyhjennetäänkö kaikki tämän tastingin vastaukset ja jaetut tulokset?")) return;
        window.VTData.tyhjennaVastaukset(t.dataset.id).then(function (n) { laskut[t.dataset.id] = 0; ilmoita("Poistettu " + n + " vastausta"); render(); }, function () { ilmoita("Tyhjennys epäonnistui."); });
        break;
      case "tuo":
        var pid = t.dataset.id; t.disabled = true;
        fetch("/pohjat/" + encodeURIComponent(pid) + ".json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
          d.lahjakortti = Object.assign({}, PERUS.lahjakortti, d.lahjakortti || {});
          return window.VTData.tallenna(pid, puhdista(Object.assign(kopio(PERUS), d)));
        }).then(function () { ilmoita("Setti tuotu"); return lataaLista(); }, function () { t.disabled = false; ilmoita("Tuonti epäonnistui."); });
        break;
      case "pohja-kuvat":
        t.disabled = true;
        fetch("/pohjat/index.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (lst) {
          return Promise.all((lst || []).map(function (p) {
            return fetch("/pohjat/" + encodeURIComponent(p.id) + ".json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; }, function () { return {}; });
          }));
        }).then(function (setit) {
          var lisatty = 0;
          setit.reduce(function (a, d) { return a.concat(d.viinit || []); }, []).forEach(function (pw) {
            var w = muok.viinit.filter(function (x) { return x.nimi === pw.nimi; })[0];
            if (!w) return;
            w.kuvat = w.kuvat || [];
            (pw.kuvat || []).forEach(function (k) {
              if (w.kuvat.indexOf(k) < 0 && w.kuvat.length < MAX_KUVAT) { w.kuvat.push(k); lisatty++; }
            });
          });
          if (lisatty) { rakenne(); ilmoita(lisatty + " kuvaa lisätty. Muista tallentaa."); }
          else { t.disabled = false; ilmoita("Ei uusia kuvia lisättäväksi."); }
        }, function () { t.disabled = false; ilmoita("Kuvien haku epäonnistui."); });
        break;
      case "takaisin":
        if (muutettu && !window.confirm("Sinulla on tallentamattomia muutoksia. Poistutaanko silti?")) { e.preventDefault(); return; }
        muokId = null; muutettu = false; break;
      case "tallenna": tallenna(); break;
      case "aromi-pois": muok.aromit.splice(i, 1); rakenne(); break;
      case "aromi-lisaa":
        var inp = document.getElementById("aromi-uusi"), a = (inp.value || "").trim();
        if (a && muok.aromit.indexOf(a) < 0) { muok.aromit.push(a); rakenne(); setTimeout(function () { var n = document.getElementById("aromi-uusi"); if (n) n.focus(); }, 0); }
        break;
      case "aromit-pohja":
        if (muok.aromit.length && !window.confirm("Korvataanko nykyiset aromit valmiilla listalla?")) return;
        muok.aromit = AROMIT[t.dataset.v].slice(); rakenne(); break;
      case "juoma-lisaa":
        muok.viinit.push({ nimi: "", tyyppi: muok.oletusTyyppi || (muok.viinit[muok.viinit.length - 1] || {}).tyyppi || "kuohu", sokko: true, kuvat: [] });
        juomaAuki[muok.viinit.length - 1] = true; rakenne(); break;
      case "juoma-pois":
        if (!window.confirm("Poistetaanko juoma " + (muok.viinit[i].nimi || "") + "?")) return;
        (muok.viinit[i].kuvat || []).forEach(function (k) { if (k.indexOf(muokId + "/") === 0) window.VTData.poistaKuva(k).catch(function () {}); });
        muok.viinit.splice(i, 1); juomaAuki = {}; rakenne(); break;
      case "juoma-ylos": case "juoma-alas":
        var j = act === "juoma-ylos" ? i - 1 : i + 1;
        if (j < 0 || j >= muok.viinit.length) return;
        var tmp = muok.viinit[i]; muok.viinit[i] = muok.viinit[j]; muok.viinit[j] = tmp;
        juomaAuki = {}; juomaAuki[j] = true; rakenne(); break;
      case "kuva-pois":
        var kp = muok.viinit[i].kuvat.splice(+t.dataset.j, 1)[0];
        if (kp && kp.indexOf(muokId + "/") === 0) window.VTData.poistaKuva(kp).catch(function () {});
        juomaAuki[i] = true; rakenne(); break;
      case "kysymys-lisaa": muok.lopuksi.push({ id: "q" + Date.now().toString(36), kysymys: "", fakta: {}, oikea: {} }); rakenne(); break;
      case "kysymys-pois": muok.lopuksi.splice(i, 1); rakenne(); break;
      case "poista-tasting":
        if (!window.confirm("Poistetaanko tasting " + (muok.nimi || muokId) + " pysyvästi? Linkki lakkaa toimimasta.")) return;
        window.VTData.poista(muokId).then(function () {
          lista = (lista || []).filter(function (x) { return x.id !== muokId; }); muokId = null; muutettu = false; location.hash = ""; ilmoita("Poistettu");
        }, function () { ilmoita("Poisto epäonnistui."); });
        break;
    }
  });
  app.addEventListener("toggle", function (e) {
    var d = e.target;
    if (d.dataset && d.dataset.juoma != null) juomaAuki[+d.dataset.juoma] = d.open;
  }, true);
  app.addEventListener("input", function (e) {
    if (e.target.dataset && e.target.dataset.lahjahaku) { lahjaHaku = e.target.value; suodataLahjat(); return; }
    var t = e.target, p = t.dataset && t.dataset.p;
    if (!p || !muok || t.type === "checkbox" || t.tagName === "SELECT") return;
    aseta(p, t.type === "number" ? (t.value === "" ? "" : +t.value) : t.value);
    merkitse();
    if (/^viinit\.\d+\.(nimi|alue|maa)$/.test(p)) {
      var i = +p.split(".")[1], v = muok.viinit[i], s = document.querySelector('[data-juoma="' + i + '"] summary b');
      if (s) s.innerHTML = esc(v.nimi || "Uusi juoma") + "<small>" + (v.alkoholiton ? "Alkoholiton · " : "") + esc([v.alue, v.maa].filter(Boolean).join(", ") || "Täydennä tiedot") + "</small>";
    }
  });
  app.addEventListener("change", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.kuvaInput != null && t.files && t.files[0]) {
      var i = +t.dataset.kuvaInput;
      ilmoita("Ladataan kuvaa…");
      pienenna(t.files[0]).then(function (d) { return window.VTData.tallennaKuva(muokId, d).then(function (polku) { kuvaVarasto[polku] = d; return polku; }); })
        .then(function (polku) { muok.viinit[i].kuvat = (muok.viinit[i].kuvat || []).concat([polku]); juomaAuki[i] = true; rakenne(); ilmoita("Kuva lisätty. Muista tallentaa."); },
          function () { ilmoita("Kuvan lataus epäonnistui."); });
      return;
    }
    var p = t.dataset && t.dataset.p;
    if (!p || !muok) return;
    if (t.type === "checkbox") { aseta(p, t.checked); if (/alkoholiton$/.test(p)) juomaAuki[+p.split(".")[1]] = true; rakenne(); return; }
    if (t.tagName === "SELECT") {
      var v = t.value;
      aseta(p, /\.oikea\./.test(p) ? (v === "" ? null : +v) : v);
      merkitse();
    }
  });
  app.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    if (e.target.id === "aromi-uusi") { e.preventDefault(); app.querySelector('[data-act="aromi-lisaa"]').click(); }
    if (e.target.id === "k-salasana") { e.preventDefault(); app.querySelector('[data-act="kirjaudu"]').click(); }
  });
  window.addEventListener("hashchange", function () {
    if (location.hash.indexOf("#muokkaa-") !== 0) { muokId = null; }
    render(); window.scrollTo(0, 0);
  });
  window.addEventListener("beforeunload", function (e) { if (muutettu) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- Käynnistys ---------- */
  if (!window.VTYhteys || !A.firebase || !A.firebase.apiKey) { valmis = true; render(); return; }
  Y = window.VTYhteys(A.firebase, "_hallinta");
  Y.onKayttaja(function (u) {
    kayttaja = u; valmis = true;
    if (onJuontaja()) { if (lista === null) { lataaLista(); lataaPohjat(); } }
    else { lista = null; }
    render();
  });
})();
