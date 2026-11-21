(function () {
  "use strict";
  var T = window.TASTING;
  var app = document.getElementById("app");
  if (!T || !Array.isArray(T.viinit) || !T.viinit.length) {
    app.innerHTML = '<main class="o-kehys"><section class="o-osio"><h1 class="o-h1">Tasting on vielä kesken</h1><p class="o-ingressi">Tähän tastingiin ei ole vielä lisätty juomia.</p></section></main>';
    return;
  }
  T.aromit = Array.isArray(T.aromit) ? T.aromit : [];
  T.lopuksi = Array.isArray(T.lopuksi) ? T.lopuksi : [];
  T.viinit.forEach(function (w) { w.kuvat = Array.isArray(w.kuvat) ? w.kuvat : []; });
  var TYYPIT = { kuohu: "Kuohuviini", valkoinen: "Valkoviini", rose: "Roséviini", punainen: "Punaviini" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var KEY = "vt-tasting-" + T.id;
  function uusiTila() { return { nimi: "", linja: null, loppu: { v: {}, lukittu: false }, aromit: {}, omaAromi: {}, aloitettu: false, nakyma: 0, vastaukset: {}, lukittu: {}, paljastettu: {}, arviot: {}, muistiinpanot: {}, aromiKiinni: {}, porukkaNahty: {}, kirjattu: { t: {}, L: {}, v: {} } }; }
  var S = store.get(KEY, null) || uusiTila();
  if (!S.loppu) S.loppu = { v: {}, lukittu: false };
  if (!S.aromit) S.aromit = {};
  if (!S.omaAromi) S.omaAromi = {};
  if (!S.aromiKiinni) S.aromiKiinni = {};
  if (!S.porukkaNahty) S.porukkaNahty = {};
  if (!S.kirjattu) S.kirjattu = { t: {}, L: {} };
  Object.keys(S.omaAromi).forEach(function (k) { if (typeof S.omaAromi[k] === "string") S.omaAromi[k] = S.omaAromi[k] ? [S.omaAromi[k]] : []; });
  var poppaa = null;
  function lukossa(i) { return onSokko(T.viinit[i]) && !!S.lukittu[i]; }
  function vastattu(i) { if (!onSokko(T.viinit[i])) { S.lukittu[i] = true; S.paljastettu[i] = true; } }
  function omatAromit(i) { return Array.isArray(S.omaAromi[i]) ? S.omaAromi[i] : []; }
  function lisaaOma(i, teksti) {
    var t = String(teksti || "").replace(/\s+/g, " ").trim().slice(0, 40), l = omatAromit(i).slice();
    if (!t || l.length >= 6 || l.some(function (x) { return x.toLowerCase() === t.toLowerCase(); })) return false;
    l.push(t); S.omaAromi[i] = l; poppaa = "o-" + i + "-" + (l.length - 1); return true;
  }
  var jaetut = store.get(KEY + "-jaetut", {});
  var kasin = store.get(KEY + "-kasin", {});
  function tallenna() { if (JT) { store.set(KEY + "-jt", S); return; } store.set(KEY, S); asetaPresence(); }
  // Juontajatila (#ohjaus): juontaja näkee osallistujan näkymän omalla, paikallisella tilallaan.
  // Mitään ei kirjata yhteisiin laskureihin, ja päälle piirretään vain juontajalle näkyvät osat.
  var JT = false;
  function korjaaTila(x) {
    if (!x.loppu) x.loppu = { v: {}, lukittu: false };
    ["aromit", "omaAromi", "aromiKiinni", "porukkaNahty", "lukittu", "paljastettu", "arviot", "muistiinpanot", "vastaukset"].forEach(function (k) { if (!x[k]) x[k] = {}; });
    if (!x.kirjattu) x.kirjattu = { t: {}, L: {} };
    return x;
  }
  function asetaJT(on) {
    if (on === JT) return;
    JT = on;
    if (on) {
      var vanha = store.get(KEY + "-jt", null);
      S = korjaaTila(vanha || uusiTila());
      S.aloitettu = true;
      if (onLinjat() && !S.linja) S.linja = "viini";
      if (!vanha) S.nakyma = "alku";
    } else {
      S = korjaaTila(store.get(KEY, null) || uusiTila());
    }
  }

  function onSokko(w) { return !!T.sokkotasting && w.sokko !== false; }
  function onAuki(i) { return !onSokko(T.viinit[i]) || !!S.paljastettu[i] || (kierrosTila() && kierrosValmis(i)); }
  // Sokkotastingin kierrokset: viinit maistetaan pareittain (1+2, 3+4, ...). Pariton viimeinen viini
  // maistetaan yksin, ja sen viereen jokainen valitsee itse suosikkinsa aiemmista. Tiedot aukeavat,
  // kun osallistuja on arvioinut kaikki kierroksen lasit.
  function kierrosTila() { return !!T.sokkotasting && !onLinjat() && !T.kaytaPaljastussanaa; }
  function kierrokset() { var l = [], n = T.viinit.length; for (var k = 0; k < n; k += 2) l.push(k + 1 < n ? [k, k + 1] : [k]); return l; }
  function kierrosOf(i) { var r = kierrokset(); for (var k = 0; k < r.length; k++) if (r[k].indexOf(i) >= 0) return r[k]; return [i]; }
  function kierrosValmis(i) { return kierrosOf(i).every(function (j) { return !onSokko(T.viinit[j]) || !!S.lukittu[j]; }); }
  function onKaveriKierros(i) { var r = kierrosOf(i); return r.length === 1 && i > 0; }
  function seuraavaAskel(i) {
    var r = kierrokset(), oma = kierrosOf(i), ix = oma.indexOf(i);
    if (ix < oma.length - 1) return oma[ix + 1];
    var rk = r.indexOf(r.filter(function (x) { return x.indexOf(i) >= 0; })[0]);
    if (rk >= 0 && rk + 1 < r.length) return r[rk + 1][0];
    return lopuksi().length ? "vertailu" : "loppu";
  }
  function tyyppi(w, sokkona) {
    var nimi = sokkona ? (w.alkoholiton ? "Alkoholiton" : TYYPIT[w.tyyppi] || "Viini") : (w.tyyppiNimi || TYYPIT[w.tyyppi] || "Viini");
    return '<span class="vt-tyyppi vt-tyyppi--' + esc(w.tyyppi) + (w.alkoholiton ? " vt-tyyppi--alkoholiton" : "") + '">' + esc(nimi) + "</span>";
  }
  function onLinjat() { return T.viinit.some(function (w) { return w.alkoholiton; }) && T.viinit.some(function (w) { return !w.alkoholiton; }); }
  function linjaOf(w) { return w.alkoholiton ? "alkoholiton" : "viini"; }
  function linjanViinit(l) { var a = []; T.viinit.forEach(function (w, i) { if (!onLinjat() || linjaOf(w) === l) a.push(i); }); return a; }
  function omat() { return linjanViinit(S.linja || "viini"); }
  function onOma(i) { return omat().indexOf(i) >= 0; }
  function nro(i) { return onLinjat() ? linjanViinit(linjaOf(T.viinit[i])).indexOf(i) + 1 : i + 1; }
  function sana(w) { return w.alkoholiton ? "juoma" : "viini"; }
  function iso(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  // Toisen linjan juoma näytetään yhteenvedossa vasta, kun saman lasin oma juoma on paljastettu.
  function onPisteet(q) { return typeof q.oikea === "number"; }
  function kAvain(i, qi) { return "v" + i + "-" + qi; }
  function lAvain(id, l) { return "L-" + id + "-" + l; }
  function lopuksi() { return T.lopuksi || []; }
  function lyhytNimi(i) { var w = T.viinit[i]; return w.lyhyt || w.nimi; }
  function lVaihtoehdot(l) { return linjanViinit(l).map(function (i) { return "Lasi " + nro(i) + " · " + lyhytNimi(i); }); }
  function lOikea(q, l) { return q.oikea && typeof q.oikea[l] === "number" ? q.oikea[l] : null; }
  function lFakta(q, l) { return (q.fakta && (typeof q.fakta === "string" ? q.fakta : q.fakta[l])) || ""; }
  function aromit(i) { var w = T.viinit[i]; return w.aromit || T.aromit || []; }
  function aromiEmoji(t) { return window.VTAromiEmoji ? window.VTAromiEmoji(t) : ""; }
  function aromiHtml(t) { var e = aromiEmoji(t); return (e ? '<span class="o-emoji" aria-hidden="true">' + e + "</span>" : "") + esc(t); }
  var ESIMERKIT = [
    ["Jos mieleen tulee mummolan omenapuu, kirjoita se.", "esim. märkä kivi"],
    ["Jos tuoksu vie aamuseitsemän leipomoon, kirjoita se.", "esim. lämmin pulla"],
    ["Jos lasista nousee kesäinen torikahvila, kirjoita se.", "esim. mansikkatori"],
    ["Jos mieleen tulee mökin laituri iltapäivällä, kirjoita se.", "esim. sateinen asfaltti"],
    ["Jos tuoksu muistuttaa joulun appelsiinikulhoa, kirjoita se.", "esim. kuusenhavu"],
    ["Jos lasista tulee mieleen lapsuuden karkkikauppa, kirjoita se.", "esim. salmiakki"],
    ["Jos mieleen tulee kukkakauppa sadepäivänä, kirjoita se.", "esim. pioni"],
    ["Jos tuoksu vie Välimeren rannalle, kirjoita se.", "esim. merituuli"]];
  function esimerkki(i) { return ESIMERKIT[i % ESIMERKIT.length]; }
  var TAHDET = ["0", "1", "2", "3", "4", "5"];
  function tahtiTeksti(t) { var s = ""; for (var k = 1; k <= 5; k++) s += k <= t ? "★" : "☆"; return s; }
  function keskiarvo(luvut) { var n = summa(luvut), s = 0; (luvut || []).forEach(function (x, o) { s += x * o; }); return n ? s / n : null; }
  function desi(x) { return x.toFixed(1).replace(".", ","); }
  function palkitMoni(vaihtoehdot, luvut, omat) {
    var max = Math.max.apply(null, (luvut || []).concat([1]));
    var rivit = vaihtoehdot.map(function (v, o) { return { v: v, o: o, n: luvut[o] || 0 }; })
      .filter(function (r) { return r.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
    if (!rivit.length) return '<p class="o-vaimea">Ei vielä vastauksia.</p>';
    return '<ul class="pk">' + rivit.map(function (r) {
      var oma = (omat || []).indexOf(r.o) >= 0;
      return '<li class="' + (oma ? "on-oma" : "") + '"><span class="pk-teksti">' + esc(r.v) + (oma ? "<em>sinä</em>" : "") + '</span><span class="pk-luku">' + r.n +
        '</span><span class="pk-palkki"><i style="width:' + Math.round(100 * r.n / max) + '%"></i></span></li>';
    }).join("") + "</ul>";
  }
  var koonti = {}, koontiAika = 0;
  function koontiTila() { return !!(Y && Y.koontiMuutos); }
  function avainT(t) { var s = String(t).toLowerCase(), x = 5381; for (var k = 0; k < s.length; k++) x = ((x << 5) + x + s.charCodeAt(k)) | 0; return "h" + (x >>> 0).toString(36); }
  function kirjaaKoonti(i, a, o) {
    if (!koontiTila() || JT) return;
    Y.koontiMuutos(i, a, o).then(function () { setTimeout(function () { haeKoonti(i); }, 300); }, function () {});
  }
  function kirjaaLoppu(muutos) {
    if (!koontiTila() || !Y.koontiLisaa || JT) return;
    Y.koontiLisaa("loppu", muutos).then(function () { setTimeout(function () { haeKoonti("loppu"); }, 300); }, function () {});
  }
  function kirjaaTahti(i, uusi) {
    var vanha = S.kirjattu.t[i];
    if (vanha === uusi || !koontiTila()) return;
    var m = { t: {} }; m.t[i] = {};
    if (vanha != null) m.t[i][vanha] = -1;
    m.t[i][uusi] = 1;
    S.kirjattu.t[i] = uusi; kirjaaLoppu(m);
  }
  function kirjaaLopuksi() {
    if (!koontiTila()) return;
    var l = S.linja || "viini", m = { L: {} }, on = false;
    lopuksi().forEach(function (q) {
      var k = q.id + "-" + l, v = S.loppu.v[q.id], vanha = S.kirjattu.L[k];
      if (v == null || v === vanha) return;
      m.L[k] = {}; if (vanha != null) m.L[k][vanha] = -1; m.L[k][v] = 1; S.kirjattu.L[k] = v; on = true;
    });
    if (on) kirjaaLoppu(m);
  }
  // "Aloita alusta": perutaan omat kirjaukset. Vähennetään vain laskureista, jotka ovat yhä plussalla,
  // ettei juontajan tyhjennyksen jälkeen jää miinuksia, jotka piilottaisivat seuraavat valinnat.
  function peruKirjaukset() {
    if (!koontiTila() || !Y.haeKoonti || JT) return;
    var V = S;
    function n(x) { return typeof x === "number" ? x : 0; }
    Y.haeKoonti("loppu").then(function (d) {
      d = d || {}; var m = { t: {}, L: {} }, on = false;
      Object.keys(V.kirjattu.t).forEach(function (i) { var v = V.kirjattu.t[i]; if (v != null && n((d.t || {})[i] && d.t[i][v]) > 0) { m.t[i] = {}; m.t[i][v] = -1; on = true; } });
      Object.keys(V.kirjattu.L).forEach(function (k) { var v = V.kirjattu.L[k]; if (v != null && n((d.L || {})[k] && d.L[k][v]) > 0) { m.L[k] = {}; m.L[k][v] = -1; on = true; } });
      if (V.kirjattu.m && n(d.m) > 0) { m.m = -1; on = true; }
      if (on) kirjaaLoppu(m);
    }, function () {});
    var lasit = {};
    Object.keys(V.aromit || {}).concat(Object.keys(V.omaAromi || {})).concat(Object.keys(V.kirjattu.v || {})).forEach(function (i) { lasit[i] = 1; });
    Object.keys(lasit).forEach(function (i) {
      Y.haeKoonti(+i).then(function (d) {
        d = d || {}; var a = {}, o = {}, onA = false, onO = false;
        (V.aromit[i] || []).forEach(function (x) { if (n((d.a || {})[x]) > 0) { a[x] = -1; onA = true; } });
        (Array.isArray(V.omaAromi[i]) ? V.omaAromi[i] : []).forEach(function (x) { var k = avainT(x); if (d.o && d.o[k] && n(d.o[k].n) > 0) { o[k] = { t: x, d: -1 }; onO = true; } });
        if (onA || onO) kirjaaKoonti(+i, onA ? a : null, onO ? o : null);
        if (V.kirjattu.v && V.kirjattu.v[i] && n(d.m) > 0 && Y.koontiLisaa) Y.koontiLisaa("v" + i, { m: -1 }).catch(function () {});
      }, function () {});
    });
  }
  // Juontajan jakama avain näytetään osallistujien elävistä laskureista, jos niitä on; muuten jaettu tilannekuva.
  function liveLuvut(avain, n) {
    var d = koonti.loppu, m, src = null;
    if (!d) return null;
    if ((m = /^t(\d+)$/.exec(avain))) src = d.t && d.t[m[1]];
    else if ((m = /^L-(.+)$/.exec(avain))) src = d.L && d.L[m[1]];
    if (!src || typeof src !== "object") return null;
    var a = []; for (var k = 0; k < n; k++) a.push(Math.max(0, typeof src[k] === "number" ? src[k] : 0));
    return summa(a) > 0 ? a : null;
  }
  function mukana() { var d = koonti.loppu; return d && typeof d.m === "number" ? Math.max(0, d.m) : null; }
  function kirjaaMukaan() {
    if (!koontiTila() || S.kirjattu.m) return;
    S.kirjattu.m = 1; kirjaaLoppu({ m: 1 });
  }
  function naytettavat(avain, n) {
    var j = jaetut[avain];
    if (!j) return null;
    return (koontiTila() && liveLuvut(avain, n || j.length)) || j;
  }
  function koontiData(i) {
    var k = koonti[i] || {}, a = [], o = [];
    aromit(i).forEach(function (v, j) { var n = k.a && typeof k.a[j] === "number" ? k.a[j] : 0; a.push(Math.max(0, n)); });
    Object.keys(k.o || {}).forEach(function (key) { var x = k.o[key]; if (x && typeof x.t === "string" && typeof x.n === "number" && x.n > 0) o.push({ t: x.t.slice(0, 40), n: x.n }); });
    o.sort(function (x, y) { return y.n - x.n; });
    return { a: a, o: o.slice(0, 40), on: summa(a) > 0 || o.length > 0 };
  }
  function haeKoonti(i) {
    if (!koontiTila() || !Y.haeKoonti) return;
    Y.haeKoonti(i).then(function (d) {
      var uusi = JSON.stringify(d || {}) !== JSON.stringify(koonti[i] || {});
      koonti[i] = d || {}; koontiAika = Date.now();
      paivitaKoontiNakyma(i, uusi);
    }, function () {});
  }
  function varmistaKoonti(i) {
    if (koontiTila() && !koonti[i]) { koonti[i] = {}; setTimeout(function () { haeKoonti(i); }, 0); }
  }
  var loppuOdottaa = false;
  function kiinnostavat() {
    if (!koontiTila()) return [];
    if (juontajaReitti() && juontajaTila() === "ohjaus") { var l = ["loppu"]; diat().forEach(function (x) { if (x.k === "paljastus") l.push(x.i); }); return l; }
    if (juontajaReitti()) { var d = diat()[dia]; return d && d.k === "paljastus" ? [d.i, "loppu"] : d && (d.k === "kansi" || d.k === "vertailu" || d.k === "vtulos" || d.k === "loppu") ? ["loppu"] : []; }
    if (!S.aloitettu) return [];
    if (typeof S.nakyma === "number") return [S.nakyma];
    if (S.nakyma === "loppu" || (S.nakyma === "vertailu" && S.loppu.lukittu)) return ["loppu"];
    return [];
  }
  function paivitaKoontiNakyma(i, uusi) {
    if (juontajaReitti()) { if (uusi) { if (juontajaTila() === "ohjaus") paivitaPian(); else reitti(); } return; }
    if (typeof i === "string") {
      if (!uusi && !loppuOdottaa) return;
      var ae = document.activeElement;
      if (ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName)) { loppuOdottaa = true; return; }
      loppuOdottaa = false; renderOsallistuja(); return;
    }
    var pk = document.getElementById("porukka-" + i);
    if (pk) pk.innerHTML = porukkaHtml(i);
  }
  setInterval(function () { if (!document.hidden) kiinnostavat().forEach(haeKoonti); }, 8000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) kiinnostavat().forEach(haeKoonti); });
  function porukkaHtml(i) {
    var on = koontiTila() ? koontiData(i).on : (jaetut["a" + i] || jaetut["o" + i]);
    var hetki = koontiTila() ? koontiAika : jaetutAika;
    var aika = hetki ? new Date(hetki) : null;
    var tila = aika ? '<p class="o-vaimea o-paivitetty">Päivittyy itsestään · viimeksi klo ' + aika.getHours() + "." + ("0" + aika.getMinutes()).slice(-2) + "." + ("0" + aika.getSeconds()).slice(-2) + "</p>" : "";
    return '<div class="vt-kortti o-havainto o-porukka"><h2 class="o-h2">Muiden löytämät aromit <span class="o-live" title="Päivittyy itsestään"></span></h2>' + tila +
      (on ? kuplat(i, true)
          : '<p class="o-vaimea">Muiden havainnot ilmestyvät tähän sitä mukaa kuin niitä tulee. Tähdet pysyvät salaisina loppuun asti.</p>') + "</div>";
  }
  // Kuplien animaatiot: paljastus (kaikki kerralla porrastettuna) ja uudet kuplat, jotka ilmestyvät myöhemmin.
  var nahdytKuplat = {}, paljastaKuplat = null;
  function kuplat(i, omat, maksimi) {
    var kd = koontiTila() ? koontiData(i) : null;
    var vaiht = aromit(i), a = kd ? kd.a : jaetut["a" + i] || [], o = kd ? kd.o : jaetut["o" + i] || [], l = [];
    vaiht.forEach(function (v, k) { if (a[k] > 0) l.push({ t: v, n: a[k], vakio: true, avain: "a" + k, k: k }); });
    o.forEach(function (x) { if (x && x.t) l.push({ t: x.t, n: x.n || 1, avain: "o" + String(x.t).toLowerCase() }); });
    if (!l.length) return '<p class="o-vaimea">Ei vielä havaintoja. Ole ensimmäinen!</p>';
    l.sort(function (x, y) { return y.n - x.n; });
    l = l.slice(0, maksimi || 24);
    var max = l[0].n;
    var korosta = omat && !JT && !juontajaReitti();
    var omatA = korosta ? (S.aromit[i] || []) : [], omatO = korosta ? omatAromit(i).map(function (x) { return String(x).toLowerCase(); }) : [];
    var paljastus = paljastaKuplat === i, aiemmat = nahdytKuplat[i], uudet = {}, osumat = 0;
    var html = '<ul class="o-kuplat' + (paljastus ? " o-kuplat--paljastus" : "") + '">' + l.map(function (x, j) {
      var s = max > 1 ? (x.n - 1) / (max - 1) : 0;
      var oma = korosta && (x.vakio ? omatA.indexOf(x.k) >= 0 : omatO.indexOf(String(x.t).toLowerCase()) >= 0);
      if (oma && x.n > 1) osumat++;
      uudet[x.avain] = 1;
      var luokka = "o-kupla" + (oma ? " o-kupla--osuma" : "") + (!paljastus && aiemmat && !aiemmat[x.avain] ? " o-kupla--uusi" : "");
      return '<li class="' + luokka + '" style="--s:' + s.toFixed(2) + (paljastus ? ";--d:" + Math.min(j, 14) * 70 + "ms" : "") + '">' + (x.vakio ? aromiHtml(x.t) : esc(x.t)) +
        (x.n > 1 ? "<b>" + x.n + "</b>" : "") + "</li>";
    }).join("") + "</ul>";
    nahdytKuplat[i] = uudet;
    if (korosta) {
      var omiaYht = omatA.length + omatO.length;
      if (omiaYht) html = '<p class="o-osumat">' + (osumat ? "<b>" + osumat + "/" + omiaYht + "</b> aromistasi löysi myös joku muu." : "Kukaan muu ei ole vielä löytänyt samoja. Tarkka nenä!") + "</p>" + html;
    }
    return html;
  }
  function keskiarvoLista(indeksit, omat) {
    return '<ul class="o-keskiarvot">' + indeksit.map(function (i) {
      var j = naytettavat("t" + i, 6), ka = j ? keskiarvo(j) : null, oma = omat ? S.arviot[i] : null;
      return "<li><span>Lasi " + nro(i) + " · " + esc(lyhytNimi(i)) + (oma != null ? ' <span class="o-vaimea" style="display:inline">(sinä ' + oma + ")</span>" : "") + "</span>" +
        "<b>" + (ka == null ? "–" : "★ " + desi(ka)) + "</b>" +
        '<span class="pk-palkki"><i style="width:' + (ka == null ? 0 : Math.round(ka * 20)) + '%"></i></span></li>';
    }).join("") + "</ul>";
  }
  function kpl(n, yksi, monta) { return n + " " + (n === 1 ? yksi : monta); }
  function tahtitaulukko(indeksit) {
    var rivit = indeksit.map(function (i) { var j = naytettavat("t" + i, 6); return { i: i, ka: j ? keskiarvo(j) : null, n: j ? summa(j) : 0 }; })
      .filter(function (x) { return x.ka != null; })
      .sort(function (a, b) { return b.ka - a.ka; });
    if (!rivit.length) return "";
    return '<section class="vt-kortti o-tt"><h2 class="o-h2">Illan tähtitaulukko</h2><p class="o-vaimea">Porukan keskiarvot, suosikki ylimpänä.</p><ol class="o-tt__lista">' +
      rivit.map(function (x, k) {
        var oma = S.arviot[x.i];
        return '<li' + (k === 0 ? ' class="on-karki"' : "") + '><span class="o-tt__sija">' + (k + 1) + '</span><div class="o-tt__nimi"><b>' + esc(lyhytNimi(x.i)) + "</b>" +
          "<span>" + kpl(x.n, "arvio", "arviota") + (oma != null ? " · sinä ★ " + oma : "") + "</span>" +
          '<span class="pk-palkki"><i style="width:' + Math.round(x.ka * 20) + '%"></i></span></div><span class="o-tt__ka">★ ' + desi(x.ka) + "</span></li>";
      }).join("") + "</ol></section>";
  }
  function summa(a) { var s = 0; (a || []).forEach(function (n) { s += n; }); return s; }
  function palkit(vaihtoehdot, luvut, oikea, oma) {
    var s = summa(luvut), huippu = Math.max.apply(null, (luvut || []).concat([0]));
    return '<ul class="pk">' + vaihtoehdot.map(function (v, o) {
      var n = luvut[o] || 0, pros = s ? Math.round(100 * n / s) : 0;
      return '<li class="' + (o === oma ? "on-oma " : "") + (o === oikea ? "on-oikea " : "") + (huippu > 0 && n === huippu ? "on-karki" : "") + '"><span class="pk-teksti">' + (o === oikea ? "✓ " : "") + esc(v) +
        (o === oma ? "<em>sinä</em>" : "") + '</span><span class="pk-luku">' + pros + ' %</span><span class="pk-palkki"><i style="width:' + pros + '%"></i></span></li>';
    }).join("") + "</ul>";
  }
  function nakyvissa(i) { if (onOma(i)) return onAuki(i); var o = omat()[nro(i) - 1]; return o == null || onAuki(o); }
  function logo(src, cls) { return src ? '<img class="' + cls + '" src="' + esc(src) + '" alt="viinitasting.com" onerror="this.remove()">' : ""; }
  function vastaus(i, qi) { var v = S.vastaukset[i]; return v && v[qi] != null ? v[qi] : null; }

  function osallistujaUrl() {
    if (T.osoite) return T.osoite;
    var t = store.get("vt-osoite", "");
    if (t) return t;
    var ylin = true;
    try { ylin = window.top === window.self; } catch (e) { ylin = false; }
    if (ylin && /^https?:$/.test(location.protocol)) return location.origin + location.pathname;
    return "";
  }
  function lyhyt(u) { return u.replace(/^https?:\/\//, "").replace(/\/$/, ""); }

  function qrSvg(text, cls) {
    if (!text || typeof qrcode !== "function") return '<div class="' + cls + ' qr-tyhja">QR-koodi näkyy, kun osoite on asetettu</div>';
    var q = qrcode(0, "M"); q.addData(text); q.make();
    var n = q.getModuleCount(), d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + c + " " + r + "h1v1h-1z";
    return '<svg class="' + cls + '" viewBox="-3 -3 ' + (n + 6) + " " + (n + 6) + '" role="img" aria-label="QR-koodi: ' + esc(text) + '"><rect x="-3" y="-3" width="' + (n + 6) + '" height="' + (n + 6) + '" fill="#ffffff"/><path d="' + d + '" fill="#2d2d2a"/></svg>';
  }

  function pisteet() {
    var oikein = 0, yht = 0, kaikki = 0, l = S.linja || "viini";
    lopuksi().forEach(function (q) {
      var o = lOikea(q, l);
      if (o == null) return;
      kaikki++;
      if (!S.loppu.lukittu) return;
      yht++;
      if (S.loppu.v[q.id] === o) oikein++;
    });
    return { oikein: oikein, yht: yht, kaikki: kaikki };
  }

  /* ================= Osallistuja ================= */
  function osallistujaTeema() { return S.teema || store.get("vt-teema", "vaalea"); }
  function renderOsallistuja() {
    var ot = osallistujaTeema();
    document.documentElement.dataset.theme = ot;
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute("content", ot === "ilta" ? "#22221f" : "#e8d390");
    document.body.className = "osallistuja" + (JT ? " jt-tila" : "");
    if (!S.aloitettu) { app.innerHTML = esikatseluPalkki() + aloitus(); return; }
    if (JT && S.nakyma === "alku") {
      app.innerHTML = '<main class="o-kehys">' + ylapalkki() + '<div class="o-vt-sisalto">' + jtAlku() + "</div></main>" + jtAlapalkki();
      sovitaTabit(); paivitaYhteys(); return;
    }
    if (S.nakyma !== "loppu" && S.nakyma !== "vertailu" && !onOma(S.nakyma)) S.nakyma = omat()[0];
    if (S.nakyma === "vertailu" && !lopuksi().length) S.nakyma = "loppu";
    if (typeof S.nakyma === "number") varmistaKoonti(S.nakyma);
    var sisalto = S.nakyma === "loppu" ? yhteenveto() : S.nakyma === "vertailu" ? vertailuNakyma() : viiniNakyma(S.nakyma);
    if (JT) sisalto = (S.nakyma === "loppu" ? jtLoppu() : typeof S.nakyma === "number" ? jtViiniLive(S.nakyma) : "") + sisalto;
    app.innerHTML = esikatseluPalkki() + '<main class="o-kehys">' + ylapalkki() + '<div class="o-vt-sisalto' + (sisaanAnimaatio ? " o-sisaan" : "") + '">' + sisalto + "</div></main>" + (JT ? jtAlapalkki() : "");
    sisaanAnimaatio = false;
    sovitaTabit();
    if (JT) paivitaYhteys();
  }
  // Pitkä välilehtirivi: aktiivinen välilehti näkyviin ja reunan häivytys vihjeeksi vieritettävästä.
  function sovitaTabit() {
    var ul = app.querySelector(".o-tabit"); if (!ul) return;
    var nyt = ul.querySelector('[aria-current="true"]');
    if (nyt && ul.scrollWidth > ul.clientWidth) {
      var li = nyt.parentNode, vasen = li.offsetLeft - ul.offsetLeft;
      if (vasen + li.offsetWidth > ul.scrollLeft + ul.clientWidth * 0.8 || vasen < ul.scrollLeft) ul.scrollLeft = Math.max(0, vasen + li.offsetWidth - ul.clientWidth * 0.78);
    }
    function reunat() {
      ul.classList.toggle("on-oikealla", ul.scrollLeft + ul.clientWidth < ul.scrollWidth - 4);
      ul.classList.toggle("on-vasemmalla", ul.scrollLeft > 4);
    }
    reunat();
    if (!ul.dataset.kuuntelee) { ul.dataset.kuuntelee = "1"; ul.addEventListener("scroll", reunat, { passive: true }); }
  }
  // Siirtymät: View Transitions -rajapinta, jos selain tukee; muuten kevyt CSS-animaatio.
  var sisaanAnimaatio = false;
  var vahennaLiiketta = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function siirtyma(tyyppi, fn, jalkeen) {
    var juuri = document.documentElement;
    if (document.startViewTransition && !vahennaLiiketta) {
      juuri.dataset.siirto = tyyppi;
      var vt = document.startViewTransition(fn);
      vt.finished.then(function () { delete juuri.dataset.siirto; if (jalkeen) jalkeen(); }, function () { delete juuri.dataset.siirto; if (jalkeen) jalkeen(); });
      return;
    }
    if (!vahennaLiiketta && (tyyppi === "eteen" || tyyppi === "taakse")) sisaanAnimaatio = true;
    fn();
    if (!vahennaLiiketta && tyyppi === "kiinni") { var k = app.querySelector(".o-aromit-kiinni"), pk = app.querySelector(".o-porukka"); [k, pk].forEach(function (x) { if (x) x.classList.add("o-liuku"); }); }
    if (jalkeen) jalkeen();
  }
  function jarjestysNro(v) { if (v === "alku") return -2; if (v === "vertailu") return 1000; if (v === "loppu") return 1001; var o = omat().indexOf(v); return o < 0 ? -1 : o; }
  function vaihdaNakyma(uusi, ennen) {
    var suunta = S.aloitettu && jarjestysNro(uusi) < jarjestysNro(S.nakyma) ? "taakse" : "eteen";
    siirtyma(suunta, function () {
      if (ennen) ennen();
      S.nakyma = uusi; tallenna(); renderOsallistuja(); window.scrollTo(0, 0);
    });
  }
  function vieNakyviin(el, rako) { if (el) window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - rako)); }
  function esikatseluPalkki() {
    return T.esikatselu ? '<div class="o-esikatselupalkki">Esikatselu · mitään ei tallenneta <button class="vt-linkki" data-act="tyhjenna-esikatselu">Alusta</button></div>' : "";
  }

  function ylapalkki() {
    var tabit = omat().map(function (i) {
      var w = T.viinit[i], valmis = onSokko(w) ? onAuki(i) : (S.arviot[i] != null && ((S.aromit[i] || []).length + omatAromit(i).length) > 0);
      return '<li><button class="o-tab' + (valmis ? " o-tab--valmis" : "") + '" data-act="siirry" data-v="' + i + '" aria-current="' + (S.nakyma === i) + '" aria-label="' + iso(sana(w)) + " " + nro(i) + (valmis ? ", valmis" : "") + '">' + nro(i) + (valmis ? '<span class="o-tab__ok" aria-hidden="true">✓</span>' : "") + "</button></li>";
    }).join("");
    if (JT) tabit = '<li><button class="o-tab o-tab--loppu o-tab--jt" data-act="siirry" data-v="alku" aria-current="' + (S.nakyma === "alku") + '">Alku</button></li>' + tabit;
    if (lopuksi().length) tabit += '<li><button class="o-tab o-tab--loppu' + (S.loppu.lukittu ? " o-tab--valmis" : "") + '" data-act="siirry" data-v="vertailu" aria-current="' + (S.nakyma === "vertailu") + '">Yhteenveto</button></li>';
    tabit += '<li><button class="o-tab o-tab--loppu" data-act="siirry" data-v="loppu" aria-current="' + (S.nakyma === "loppu") + '">Kiitos</button></li>';
    var linjaNappi = onLinjat() && S.linja ? '<button class="o-linjavaihto' + (S.linja === "alkoholiton" ? " o-linjavaihto--alk" : "") + '" data-act="alkuun">' +
      (S.linja === "alkoholiton" ? "Alkoholittomat" : "Kuohuviinit") + '<span aria-hidden="true">⇄</span><span class="o-piilo">, vaihda setti</span></button>' : "";
    return '<header class="o-yla"><span class="o-yla__nimi">' + (JT ? '<span class="jt-merkki">Juontaja</span> ' : "") + esc(T.nimi) + "</span>" + linjaNappi +
      '<button class="o-teemanappi" data-act="o-teema" aria-label="' + (osallistujaTeema() === "ilta" ? "Vaihda vaaleaan tilaan" : "Vaihda iltatilaan") + '">' + (osallistujaTeema() === "ilta" ? "☀︎" : "☾") + "</button></header>" +
      '<nav aria-label="Viinit"><ul class="o-tabit">' + tabit + "</ul></nav>";
  }

  function aloitus() {
    return '<main class="o-kehys"><section class="o-osio" style="padding-top:var(--vali-6)">' +
      '<div class="o-aloituslogo"><img src="' + esc(T.logo || "/logo-vihrea.png") + '" alt="Viinitasting.com" onerror="this.parentNode.className+=\' ei-kuvaa\';this.remove()"><span class="o-sanamerkki">viinitasting.com</span></div>' +
      '<p class="o-display">Tervetuloa</p>' +
      '<div><h1 class="o-h1">' + esc(T.nimi) + '</h1><p class="o-vaimea" style="margin-top:var(--vali-2)">Juontajana ' + esc(T.juontaja) + "</p></div>" +
      '<p class="o-ingressi">' + esc(T.kuvaus) + "</p>" +
      (onLinjat() ? '<div><span class="o-label">Mitä lasiin tänään?</span><div class="o-linjat' + (S.linja ? " on-valittu" : "") + '" role="radiogroup" aria-label="Mitä lasiin tänään?">' +
        '<button class="o-linja" role="radio" data-act="linja" data-v="viini" aria-checked="' + (S.linja === "viini") + '" aria-pressed="' + (S.linja === "viini") + '"><span class="o-linja__merkki" aria-hidden="true"></span>Kuohuviinit</button>' +
        '<button class="o-linja o-linja--alk" role="radio" data-act="linja" data-v="alkoholiton" aria-checked="' + (S.linja === "alkoholiton") + '" aria-pressed="' + (S.linja === "alkoholiton") + '"><span class="o-linja__merkki" aria-hidden="true"></span>Alkoholittomat</button>' +
        "</div></div>" : "") +
      '<button class="vt-painike vt-painike--leveä" data-act="aloita"' + (onLinjat() && !S.linja ? " disabled" : "") + '>Aloitetaan</button>' +
      (onLinjat() ? '<p class="o-vaimea" id="linja-vihje"' + (S.linja ? ' style="visibility:hidden"' : "") + '>Valitse ensin kumpi setti, sitten mennään.</p>' : "") +
      '<p class="o-vaimea">Ei sovellusta, ei kirjautumista. Havaintosi lähtevät nimettöminä porukan yhteiseen pottiin.</p>' +
      "</section>" +
      "</main>";
  }

  function maistelu(i) {
    var lukittu = lukossa(i), valitut = S.aromit[i] || [], t = S.arviot[i], omat = omatAromit(i);
    var chipit = aromit(i).map(function (a, o) {
      return '<button class="o-aromi' + (poppaa === "a-" + i + "-" + o ? " o-pop" : "") + '" data-act="aromi" data-i="' + i + '" data-o="' + o + '" aria-pressed="' + (valitut.indexOf(o) >= 0) + '"' + (lukittu ? " disabled" : "") + ">" + aromiHtml(a) + "</button>";
    }).join("");
    var omatChipit = omat.map(function (x, j) {
      return '<span class="o-oma-chip' + (poppaa === "o-" + i + "-" + j ? " o-pop" : "") + '">' + esc(x) +
        (lukittu ? "" : '<button data-act="oma-pois" data-i="' + i + '" data-j="' + j + '" aria-label="Poista ' + esc(x) + '">×</button>') + "</span>";
    }).join("");
    var tahdet = '<button class="o-tahti o-tahti--nolla' + (poppaa === "t-" + i && t === 0 ? " o-pop" : "") + '" data-act="tahti" data-i="' + i + '" data-v="0" aria-pressed="' + (t === 0) + '" aria-label="0 tähteä"' + (lukittu ? " disabled" : "") + ">0</button>";
    for (var k = 1; k <= 5; k++) tahdet += '<button class="o-tahti' + (poppaa === "t-" + i && k === t ? " o-pop" : "") + '" data-act="tahti" data-i="' + i + '" data-v="' + k + '" aria-pressed="' + (t != null && k <= t) + '" aria-label="' + k + ' tähteä"' + (lukittu ? " disabled" : "") + ">★</button>";
    var tahtiSana = ["Ei minun lasiini", "No, onhan tämä viiniä", "Ihan ok", "Hyvä!", "Tosi hyvä", "Tätä kotiin"][t == null ? -1 : t] || "0 = ei minun lasiini · 5 = tätä kotiin";
    poppaa = null;
    var sokko = onSokko(T.viinit[i]);
    var tahtiOsa = '<fieldset class="o-kysymys o-vt-tahdet"><legend>Montako tähteä?</legend><div class="o-tahdet">' + tahdet + '</div><p class="o-vaimea o-tahtisana" style="margin-top:var(--vali-2)">' + esc(tahtiSana) + "</p></fieldset>";
    var porukka = (sokko && !S.lukittu[i] && !JT) ? "" : '<div class="o-vt-porukka" id="porukka-' + i + '">' + porukkaHtml(i) + "</div>";
    if (!lukittu && S.aromiKiinni && S.aromiKiinni[i]) {
      var yht = valitut.map(function (o) { return '<span class="o-kupla o-kupla--oma">' + aromiHtml(aromit(i)[o]) + "</span>"; }).join("") +
        omat.map(function (x) { return '<span class="o-kupla o-kupla--oma">' + esc(x) + "</span>"; }).join("");
      return '<section class="o-kysymys o-aromit-kiinni o-vt-aromit"><div class="o-kiinni-rivi"><h2 class="o-h2">Sinun aromisi</h2>' +
        '<button class="vt-linkki" data-act="aromit-auki" data-i="' + i + '">Muokkaa</button></div>' +
        (yht ? '<div class="o-kuplat o-kuplat--pienet">' + yht + "</div>" : '<p class="o-vaimea">Ei vielä aromeja. Mysteerilasi.</p>') + "</section>" +
        tahtiOsa + porukka;
    }
    var aromiOsa = '<fieldset class="o-kysymys o-vt-aromit"><legend>Mitä aromeja löydät?</legend>' +
      '<p class="o-vaimea" style="clear:both;margin-bottom:var(--vali-3)">Vääriä vastauksia ei ole. Napauta kaikki, jotka löydät.</p>' +
      '<div class="o-aromit o-aromit--ruudut">' + chipit + "</div>" +
      (lukittu ? (omat.length ? '<div class="o-omat-lista">' + omatChipit + "</div>" : "") :
        '<div class="o-muuta"><p class="o-muuta__otsikko">Löysitkö jotain muuta?</p><p class="o-vaimea">' + esimerkki(i)[0] + "</p>" +
        '<div class="o-lisaa-oma"><input class="o-kentta" id="oma-' + i + '" data-oma-input="' + i + '" maxlength="40" autocomplete="off" enterkeyhint="send" placeholder="Oma havainto, ' + esimerkki(i)[1] + '" aria-label="Oma havainto">' +
        '<button class="vt-painike vt-painike--pieni" data-act="oma-lisaa" data-i="' + i + '">Lisää</button></div>' +
        (omat.length ? '<div class="o-omat-lista">' + omatChipit + "</div>" : "") + "</div>") +
      "</fieldset>";
    if (lukittu || sokko) return aromiOsa + tahtiOsa + porukka;
    return aromiOsa + tahtiOsa +
      '<button class="vt-painike vt-painike--leveä o-aromit-valmis" data-act="aromit-kiinni" data-i="' + i + '">Valmis, näytä porukka</button>' +
      (JT ? porukka : '<p class="o-vaimea o-valmis-vihje">Porukan aromit paljastuvat, kun painat Valmis. Näin muiden vastaukset eivät ohjaa omaa nenääsi.</p>');
  }

  var kuvaVarasto = {};
  function kuvaTag(polku, luokka) {
    var src = kuvaVarasto[polku];
    return '<img class="' + luokka + '" data-kuva="' + esc(polku) + '" alt=""' + (luokka === "o-kuva" ? ' data-act="kuva-iso"' : "") + (src ? ' src="' + src + '"' : "") +
      ' onerror="var g=this.parentNode;this.remove();if(g&&g.classList.contains(\'o-kuvat\')&&!g.querySelector(\'img\'))g.remove()">';
  }
  function kuvaGalleria(w) {
    var k = (w.kuvat || []).filter(Boolean);
    return k.length ? '<div class="o-kuvat">' + k.map(function (p) { return kuvaTag(p, "o-kuva"); }).join("") + "</div>" : "";
  }
  function taytaKuvat() {
    if (!window.VTData) return;
    Array.prototype.forEach.call(document.querySelectorAll("img[data-kuva]:not([src])"), function (img) {
      var p = img.getAttribute("data-kuva");
      if (kuvaVarasto[p]) { img.src = kuvaVarasto[p]; return; }
      if (kuvaVarasto[p] === false) return;
      kuvaVarasto[p] = false;
      window.VTData.haeKuva(p).then(function (src) {
        if (!src || !/^(data:image\/|\/|https:)/.test(src)) return;
        kuvaVarasto[p] = src;
        Array.prototype.forEach.call(document.querySelectorAll('img[data-kuva="' + p + '"]'), function (x) { x.src = src; });
      }, function () { delete kuvaVarasto[p]; });
    });
  }
  new MutationObserver(function () { taytaKuvat(); }).observe(document.getElementById("app"), { childList: true, subtree: true });
  function viiniKortti(w, ilmanOtsikkoa) {
    var tiedot = [["Tuottaja", w.tuottaja], ["Alue", w.alue], ["Maa", w.maa], ["Rypäleet", w.rypaleet]]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("");
    return '<article class="vt-kortti o-viini o-vt-tarina">' + (ilmanOtsikkoa ? '<h2 class="o-h2" style="margin-bottom:var(--vali-2)">' + (w.alkoholiton ? "Juoman tarina" : "Viinin tarina") + "</h2>" : tyyppi(w) +
      '<h2 class="o-viini__nimi">' + esc(w.nimi) + "</h2>") +
      '<dl class="o-tiedot">' + tiedot + "</dl>" +
      (w.tarina ? "<p>" + esc(w.tarina) + "</p>" : "") +
      kuvaGalleria(w) +
      (w.maistele ? "<h3>Mitä lasista voi löytää</h3><p>" + esc(w.maistele) + "</p>" : "") +
      (w.ruoaksi ? "<h3>Ruoaksi</h3><p>" + esc(w.ruoaksi) + "</p>" : "") +
      (JT ? jtViiniLisat(w) : "") +
      "</article>";
  }

  function tulos(w, i) {
    var valitut = S.aromit[i] || [], t = S.arviot[i], omat = omatAromit(i);
    var minun = valitut.map(function (o) { return '<span class="o-kupla o-kupla--oma">' + aromiHtml(aromit(i)[o]) + "</span>"; }).join("") +
      omat.map(function (x) { return '<span class="o-kupla o-kupla--oma">' + esc(x) + "</span>"; }).join("");
    var jaettu = jaetut["a" + i] || jaetut["o" + i];
    return '<div class="vt-kortti o-havainto"><h2 class="o-h2">Sinun lasisi</h2>' +
      '<p><b class="o-tahtirivi">' + tahtiTeksti(t || 0) + "</b> " + (t == null ? "ei tähtiä" : t + "/5") + "</p>" +
      (minun ? '<div class="o-kuplat o-kuplat--pienet">' + minun + "</div>" : '<p class="o-vaimea">Ei aromeja. Mysteerilasi.</p>') +
      (koontiTila() ? "" : '<div class="o-jakauma"><span class="o-jakauma__otsikko">Muiden löytämät aromit</span>' +
      (jaettu ? kuplat(i, true)
              : '<p class="o-vaimea">Porukan havainnot ilmestyvät tähän, kun juontaja jakaa ne. Sillä välin toinen hörppy on täysin sallittu.</p>') +
      "</div>") + "</div>" +
      (koontiTila() ? '<div class="o-vt-porukka" id="porukka-' + i + '">' + porukkaHtml(i) + "</div>" : "");
  }

  // Viimeisen lasin kaveri: jokainen valitsee viereen mieluisensa aiemmista viineistä (ei sokkona, ei arvailua).
  function kaveriValinta(i) {
    var aiemmat = T.viinit.map(function (w, j) { return j; }).filter(function (j) { return j < i; });
    return '<div class="vt-kortti o-kaveri"><h2 class="o-h2">Valitse viereen suosikkisi</h2><p class="o-vaimea">Kaada lasin ' + nro(i) + ' viereen se aiemmista, jonka haluat maistaa uudelleen. Vertaile rauhassa.</p><div class="o-kaveri__lista">' +
      aiemmat.map(function (j) {
        var t = S.arviot[j];
        return '<button class="o-kaveri__nappi" data-act="kaveri" data-v="' + j + '" aria-pressed="' + (S.kaveri === j) + '"><span class="vt-pallo">' + nro(j) + "</span><span><b>" + esc(onAuki(j) ? lyhytNimi(j) : "Lasi " + nro(j)) + "</b><small>" + (t == null ? "ei tähtiä" : tahtiTeksti(t) + " " + t + "/5") + "</small></span></button>";
      }).join("") + "</div>" + (S.kaveri != null ? kaveriKortti(true) : "") + "</div>";
  }
  function kaveriKortti(sisalla) {
    var j = S.kaveri, w = T.viinit[j];
    if (j == null || !w) return "";
    var omat = (S.aromit[j] || []).map(function (o) { return '<span class="o-kupla o-kupla--oma">' + aromiHtml(aromit(j)[o]) + "</span>"; }).join("") +
      omatAromit(j).map(function (x) { return '<span class="o-kupla o-kupla--oma">' + esc(x) + "</span>"; }).join("");
    return '<div class="' + (sisalla ? "o-kaveri__valittu" : "vt-kortti o-kaveri") + '"><p class="o-kaveri__otsikko">Vierellä: lasi ' + nro(j) + " · " + esc(w.nimi) + "</p>" +
      '<p class="o-vaimea">Annoit sille ' + (S.arviot[j] == null ? "ei tähtiä" : tahtiTeksti(S.arviot[j]) + " " + S.arviot[j] + "/5") + ".</p>" +
      (omat ? '<div class="o-kuplat o-kuplat--pienet">' + omat + "</div>" : "") + "</div>";
  }
  function arvio(i) {
    return '<div><label class="o-label" for="muistiinpano-' + i + '">Omat muistiinpanot</label>' +
      '<textarea class="o-kentta" id="muistiinpano-' + i + '" data-muistiinpano="' + i + '" placeholder="Mitä maistoit? Ostaisitko tämän?">' + esc(S.muistiinpanot[i] || "") + "</textarea></div>";
  }

  function viiniNakyma(i) {
    var w = T.viinit[i], sokko = onSokko(w);
    var h = '<section class="o-osio"><div class="o-rivi"><span class="vt-pallo">' + nro(i) + "</span>" + tyyppi(w, !onAuki(i)) + "</div>";
    if (!sokko) {
      var seurNb = omat()[omat().indexOf(i) + 1], loppuNb = lopuksi().length ? "vertailu" : "loppu";
      h += '<h1 class="o-viini__nimi" style="margin-top:0">' + esc(w.nimi) + "</h1>" +
        '<p class="o-vaimea">' + esc([w.tuottaja, [w.alue, w.maa].filter(Boolean).join(", ")].filter(Boolean).join(" · ")) + "</p>";
      h += maistelu(i);
      h += viiniKortti(w, true);
      h += '<button class="vt-painike vt-painike--leveä" data-act="seuraava" data-i="' + i + '" data-v="' + (seurNb == null ? loppuNb : seurNb) + '">' +
        (seurNb == null ? (lopuksi().length ? "Yhteenveto →" : "Kiitos →") : "Seuraava lasi →") + "</button>";
      return h + "</section>";
    }
    if (!onAuki(i) && kierrosTila()) {
      var kr = kierrosOf(i), muut = kr.filter(function (j) { return j !== i; }), kesken = muut.filter(function (j) { return !S.lukittu[j]; });
      h += '<h1 class="o-h1">Lasi ' + nro(i) + '</h1><p class="o-ingressi">' + (kr.length > 1 ? "Kierros " + (kierrokset().map(function (r) { return r[0]; }).indexOf(kr[0]) + 1) + ": lasit " + kr.map(function (j) { return nro(j); }).join(" ja ") + ". Viinien tiedot aukeavat, kun olet arvioinut molemmat." :
        "Viimeinen lasi. Viini paljastuu, kun olet antanut aromit ja tähdet.") + "</p>";
      if (onKaveriKierros(i)) h += kaveriValinta(i);
      h += maistelu(i);
      if (!S.lukittu[i]) {
        var valmisK = S.arviot[i] != null;
        h += '<button class="vt-painike vt-painike--leveä o-aromit-valmis" data-act="lukitse" data-i="' + i + '"' + (valmisK ? "" : " disabled") + ">" + (kesken.length ? "Valmis, lasi " + nro(kesken[0]) + " →" : "Valmis, näytä viini" + (kr.length > 1 ? "t" : "")) + "</button>";
        if (!valmisK) h += '<p class="o-vaimea o-valmis-vihje">Anna ensin tähdet. Porukan aromit näet viinin tietojen yhteydessä.</p>';
      } else if (kesken.length) {
        h += '<div class="vt-vinkki o-odota"><span class="vt-vinkki__nimi">Lasi ' + nro(i) + " arvioitu ✓</span><p>Maista seuraavaksi lasi " + nro(kesken[0]) + ". Molempien viinien tiedot aukeavat, kun se on arvioitu.</p>" +
          '<button class="vt-painike vt-painike--leveä" data-act="siirry" data-v="' + kesken[0] + '">Lasi ' + nro(kesken[0]) + " →</button></div>";
      }
      return h + "</section>";
    }
    if (!onAuki(i)) {
      h += '<h1 class="o-h1">' + iso(sana(w)) + " " + nro(i) + '</h1><p class="o-ingressi">Haistele ja maistele. Juontaja paljastaa ' + (w.alkoholiton ? "juoman" : "viinin") + ', kun kaikki ovat vastanneet.</p>';
      h += maistelu(i);
      if (!S.lukittu[i]) {
        var valmis = S.arviot[i] != null;
        h += '<button class="vt-painike vt-painike--leveä" data-act="lukitse" data-i="' + i + '"' + (valmis ? "" : " disabled") + ">Lukitse, olen varma</button>";
        if (!valmis) h += '<p class="o-vaimea">Tähdet ensin, sitten lukkoon.</p>';
      } else if (T.kaytaPaljastussanaa) {
        h += '<div class="vt-vinkki o-odota"><span class="vt-vinkki__nimi">Vastaukset lukittu</span>' +
          "<p>Kun juontaja kertoo paljastussanan, kirjoita se tähän.</p>" +
          '<label class="o-label" for="sana-' + i + '">Paljastussana</label>' +
          '<input class="o-kentta" id="sana-' + i + '" data-sana="' + i + '" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="go">' +
          '<p class="o-virhe" id="virhe-' + i + '" role="alert" hidden>Sana ei täsmää. Kuuntele juontajaa ja kokeile uudelleen.</p>' +
          '<button class="vt-painike vt-painike--leveä" data-act="paljasta" data-i="' + i + '">Näytä mikä se oli</button></div>';
      } else {
        h += '<div class="vt-vinkki o-odota"><span class="vt-vinkki__nimi">Lukossa!</span><p>Odota, että juontaja paljastaa lasin. Sillä välin saa maistaa uudestaan.</p>' +
          '<button class="vt-painike vt-painike--leveä" data-act="paljasta" data-i="' + i + '">Näytä mikä se oli</button></div>';
      }
    } else if (kierrosTila()) {
      h = '<section class="o-osio"><div class="o-rivi"><span class="vt-pallo">' + nro(i) + '</span><span class="o-vaihe-teksti">Lasin ' + nro(i) + " tiedot</span></div>" + viiniKortti(w) + tulos(w, i);
      if (onKaveriKierros(i) && S.kaveri != null) h += kaveriKortti();
      var sa = seuraavaAskel(i);
      h += '<button class="vt-painike vt-painike--leveä" data-act="siirry" data-v="' + sa + '">' + (sa === "vertailu" ? "Yhteenveto →" : sa === "loppu" ? "Kiitos →" : kierrosOf(i).indexOf(sa) >= 0 ? "Lasin " + nro(sa) + " tiedot →" : "Seuraava kierros: lasi " + nro(sa) + " →") + "</button>";
    } else {
      if (sokko) h += tulos(w, i);
      h += viiniKortti(w);
      var om = omat(), seur = om[om.indexOf(i) + 1];
      var loppuun = lopuksi().length ? "vertailu" : "loppu";
      h += '<button class="vt-painike vt-painike--leveä" data-act="siirry" data-v="' + (seur == null ? loppuun : seur) + '">' + (seur == null ? (lopuksi().length ? "Yhteenveto →" : "Kiitos →") : "Seuraava lasi →") + "</button>";
    }
    return h + "</section>";
  }

  function vertailuNakyma() {
    var l = S.linja || "viini", L = S.loppu, vv = lVaihtoehdot(l);
    var h = '<section class="o-osio"><h1 class="o-h1">Yhteenveto</h1>';
    if (!L.lukittu) {
      var kaikkiLasit = omat().length, arvioidut = omat().filter(function (i) { return S.lukittu[i] || S.arviot[i] != null || (S.aromit[i] || []).length || omatAromit(i).length; }).length;
      h += '<p class="o-ingressi">' + (arvioidut >= kaikkiLasit ? "Kaikki " + kaikkiLasit + " lasia takana. Nyt saa vertailla, ja maistaa vielä kerran, jos muisti pätkii." :
        arvioidut + "/" + kaikkiLasit + " lasia arvioitu. Puuttuviin pääset yläreunan numeroista, tai voit vastata alla jo nyt.") + "</p>";
      h += lopuksi().map(function (q) {
        var napit = vv.map(function (v, o) {
          return '<button class="o-vaihtoehto" data-act="l-valitse" data-id="' + esc(q.id) + '" data-o="' + o + '" aria-pressed="' + (L.v[q.id] === o) + '">' + esc(v) + "</button>";
        }).join("");
        return '<fieldset class="o-kysymys"><legend>' + esc(q.kysymys) + '</legend><div class="o-vaihtoehdot o-vaihtoehdot--yksi">' + napit + "</div></fieldset>";
      }).join("");
      var valmis = lopuksi().every(function (q) { return L.v[q.id] != null; });
      h += '<button class="vt-painike vt-painike--leveä" data-act="l-lukitse"' + (valmis ? "" : " disabled") + ">Lukitse ja katso, mitä muut sanoi</button>";
      if (!valmis) h += '<p class="o-vaimea">Vastaa kaikkiin, niin pääset kurkkaamaan muiden vastaukset.</p>';
    } else {
      var ok = 0, pk = 0, kasassa = 0;
      var odottaa = !lopuksi().some(function (q) { var j = naytettavat(lAvain(q.id, l), vv.length); return j && summa(j); });
      if (odottaa) {
        lopuksi().forEach(function (q) { kasassa = Math.max(kasassa, summa(liveLuvut(lAvain(q.id, l), vv.length) || [])); });
        var juontajaNimi = String(T.juontaja || "Juontaja").split(" ")[0];
        h += '<div class="o-odotus" role="status" aria-live="polite"><span class="o-odotus__ikoni" aria-hidden="true"><i></i><i></i><i></i></span>' +
          '<div class="o-odotus__sisus"><p class="o-odotus__otsikko">Tulokset tulossa</p>' +
          '<p class="o-odotus__teksti">' + esc(juontajaNimi) + " paljastaa porukan vastaukset kaikille yhtä aikaa. Pidä sivu auki, niin tulokset ilmestyvät tähän itsestään.</p>" +
          (kasassa ? '<p class="o-odotus__luku">' + kpl(kasassa, "vastaus", "vastausta") + " jo kasassa</p>" : "") + "</div></div>";
      }
      var kortit = lopuksi().map(function (q) {
        var v = L.v[q.id], o = lOikea(q, l), j = naytettavat(lAvain(q.id, l), vv.length), f = lFakta(q, l);
        var r = '<section class="vt-kortti o-vs"><h2 class="o-vs__k">' + esc(q.kysymys) + "</h2>";
        if (o != null) {
          pk++;
          if (v === o) ok++;
          r += '<p class="o-vs__oma">Oikea vastaus: <b>' + esc(vv[o]) + "</b></p>" +
            '<p class="o-vs__oma">Sinä: <b>' + esc(v == null ? "ei vastausta" : vv[v]) + "</b> " +
            (v === o ? '<span class="o-merkki o-merkki--oikein">Oikein</span>' : '<span class="o-merkki o-merkki--vaarin">Ohi</span>') + "</p>";
        } else {
          r += '<p class="o-vs__oma">Sinä: <b>' + esc(v == null ? "ei vastausta" : vv[v]) + "</b></p>";
        }
        if (j && summa(j)) {
          r += '<div class="o-jakauma"><span class="o-jakauma__otsikko">Koko porukka · ' + kpl(summa(j), "vastaus", "vastausta") + "</span>" + palkit(vv, j, o, v) + "</div>";
        } else {
          r += '<div class="o-jakauma o-jakauma--odottaa"><span class="o-jakauma__otsikko">Koko porukka · paljastetaan pian</span><ul class="pk pk--haamu" aria-hidden="true">' +
            vv.map(function (vt, o) { return '<li class="' + (o === v ? "on-oma" : "") + '"><span class="pk-teksti">' + esc(vt) + (o === v ? "<em>sinä</em>" : "") + '</span><span class="pk-luku">? %</span><span class="pk-palkki"><i></i></span></li>'; }).join("") + "</ul></div>";
        }
        if (f) r += '<p class="o-vs__fakta"><b>Tiesitkö?</b> ' + esc(f) + "</p>";
        return r + "</section>";
      }).join("");
      if (pk) h += '<div class="o-tulos"><span class="o-tulos__luku">' + ok + "/" + pk + '</span><span class="o-tulos__teksti">oikein vertailussa</span></div>';
      h += kortit;
      h += tahtitaulukko(omat()) || '<p class="o-vaimea">Illan tähtitaulukko paljastetaan ihan lopuksi. Jännitys säilyy.</p>';
      h += arvioPyynto(true);
    }
    if (JT) h += jtVertailu();
    h += '<button class="vt-painike vt-painike--toissijainen vt-painike--leveä" data-act="siirry" data-v="loppu">Kiitos →</button>';
    return h + "</section>";
  }
  function jarjestys() {
    if (!onLinjat()) return T.viinit.map(function (w, i) { return i; });
    var muu = S.linja === "alkoholiton" ? "viini" : "alkoholiton";
    return omat().concat(linjanViinit(muu));
  }
  function viinilistaTeksti() {
    var rivit = jarjestys().map(function (i) {
      var w = T.viinit[i];
      if (!nakyvissa(i)) return nro(i) + ". " + iso(sana(w)) + " " + nro(i) + (w.alkoholiton ? " (alkoholiton)" : "") + " (ei paljastettu)";
      var r = nro(i) + ". " + w.nimi + (w.alkoholiton ? " (alkoholiton)" : "") + " – " + [w.alue, w.maa].filter(Boolean).join(", ");
      if (S.arviot[i]) r += "\n   Oma arvio: " + S.arviot[i] + "/5";
      if (S.muistiinpanot[i]) r += "\n   " + S.muistiinpanot[i].replace(/\n/g, " ");
      return r;
    });
    return T.nimi + "\n\n" + rivit.join("\n") + "\n\nViinitasting.com";
  }

  function yhteenveto() {
    var p = pisteet();
    var paras = 0; omat().forEach(function (i) { if (onAuki(i)) paras = Math.max(paras, S.arviot[i] || 0); });
    function rivi(i, tahdet) {
      var w = T.viinit[i], auki = nakyvissa(i), oma = onOma(i), a = oma ? S.arviot[i] : null;
      var pj = naytettavat("t" + i, 6), pka = pj ? keskiarvo(pj) : null;
      var alue = [w.alue, w.maa].filter(Boolean).join(", ");
      if (!auki) return '<li class="o-juoma"><span class="vt-pallo">' + nro(i) + '</span><div class="o-juoma__tiedot"><b>' + iso(sana(w)) + " " + nro(i) + "</b><span>Ei vielä paljastettu</span></div></li>";
      var luvut = tahdet ? '<div class="o-juoma__tahdet">' +
          '<span><small>Sinä</small>' + (a != null ? "★ " + a : "–") + "</span>" +
          '<span><small>Porukka</small>' + (pka != null ? "★ " + desi(pka) : "–") + "</span></div>" : "";
      return '<li class="o-juoma' + (w.alkoholiton ? " o-alk" : "") + '"><span class="vt-pallo">' + nro(i) + '</span><div class="o-juoma__tiedot">' +
        "<b>" + esc(w.nimi) + "</b>" + (alue ? "<span>" + esc(alue) + "</span>" : "") +
        (tahdet && paras > 0 && a === paras ? '<span class="o-suosikki">♥ Suosikkisi</span>' : "") +
        "</div>" + luvut + "</li>";
    }
    var lista;
    if (onLinjat()) {
      var oma = S.linja || "viini", muu = oma === "alkoholiton" ? "viini" : "alkoholiton";
      var nimi = function (l) { return l === "alkoholiton" ? "Alkoholittomat" : "Kuohuviinit"; };
      lista = '<h3 class="o-ryhma' + (oma === "alkoholiton" ? " o-ryhma--alk" : "") + '">Sinun setti · ' + nimi(oma) + "</h3>" +
        '<ul class="o-lista o-lista--juomat">' + linjanViinit(oma).map(function (i) { return rivi(i, true); }).join("") + "</ul>" +
        '<h3 class="o-ryhma' + (muu === "alkoholiton" ? " o-ryhma--alk" : "") + '">Toinen setti · ' + nimi(muu) + "</h3>" +
        '<ul class="o-lista o-lista--juomat o-lista--muu">' + linjanViinit(muu).map(function (i) { return rivi(i, false); }).join("") + "</ul>";
    } else {
      lista = '<ul class="o-lista o-lista--juomat">' + T.viinit.map(function (w, i) { return rivi(i, true); }).join("") + "</ul>";
    }
    var otsikko = S.nimi ? "Kippis, " + esc(S.nimi) + "!" : "Kippis ja kiitos!";
    var h = '<section class="o-osio"><h1 class="o-h1">' + otsikko + "</h1>";
    if (p.kaikki) {
      h += '<div class="o-tulos"><span class="o-tulos__luku">' + p.oikein + "/" + p.kaikki + '</span><span class="o-tulos__teksti">oikein sokkovisassa' +
        (p.yht < p.kaikki ? "<br>" + (p.kaikki - p.yht) + " kysymystä vielä paljastamatta" : "") + "</span></div>";
    }
    h += arvioPyynto();
    var lahja = lahjaKaytossa();
    if (lahja) h += lahjaOsio();
    h += '<section class="vt-kortti o-juomakortti"><h2 class="o-h2">' + (onLinjat() ? "Illan juomat" : "Illan viinit") + '</h2><p class="o-vaimea">Kopioi lista, niin löydät suosikkisi myöhemmin.</p>' + lista +
      '<button class="vt-painike vt-painike--toissijainen vt-painike--leveä o-juomakortti__kopioi" data-act="kopioi">' + (onLinjat() ? "Kopioi juomalista" : "Kopioi viinilista") + "</button>" +
      '<p class="o-vaimea" id="kopio-tila" role="status" style="margin-top:var(--vali-2)"></p>' +
      '<textarea class="o-kentta o-kopio" id="kopio-teksti" readonly hidden></textarea></section>';
    if (!lahja) {
      h += '<div class="vt-vinkki"><span class="vt-vinkki__nimi">Oma tasting?</span><p style="margin:0 0 var(--vali-4)">' + esc(T.varausTeksti) + "</p>" +
        '<a class="vt-painike vt-painike--leveä" href="' + esc(T.varausLinkki) + '" target="_blank" rel="noopener">Varaa tasting</a></div>';
    }
    h += '<p class="o-alatunniste"><button class="vt-linkki" data-act="tyhjenna" id="tyhjenna">Aloita alusta</button></p>';
    return h + "</section>";
  }

  /* ---------- Kiitoslahja ---------- */
  function lahjaKaytossa() { return !!(T.lahjakortti && T.lahjakortti.kaytossa); }
  function luoLahja() {
    var L = T.lahjakortti, merkit = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", loppu = "";
    var luvut = new Uint8Array(4);
    try { crypto.getRandomValues(luvut); } catch (e) { for (var k = 0; k < 4; k++) luvut[k] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < 4; j++) loppu += merkit[luvut[j] % merkit.length];
    var voimassa = new Date(); voimassa.setMonth(voimassa.getMonth() + (L.voimassaKk || 12));
    return { koodi: "VT" + L.arvo + "-" + (L.tunnus || "TASTING").toUpperCase() + "-" + loppu, voimassa: voimassa.toISOString(), valinta: null, kenelle: "", tervehdys: "" };
  }
  // Koodi talteen juontajalle (hallinta → Lahjakortit), jotta sen aitouden voi tarkistaa. Tallennetaan kerran.
  function tallennaLahjaTalteen() {
    var l = S.lahja;
    if (JT || !l || l.talteen || !Y || !Y.tallennaLahja || !kayttaja || T.esikatselu) return;
    l.talteen = "kesken";
    Y.tallennaLahja({ koodi: l.koodi, arvo: T.lahjakortti.arvo, asiakas: T.asiakas || "", nimi: T.nimi || "", voimassa: l.voimassa, valinta: l.valinta })
      .then(function () { l.talteen = true; tallenna(); }, function () { l.talteen = false; });
  }
  function pvm(iso) { var d = new Date(iso); return d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear(); }
  function lahjaViesti() {
    var L = T.lahjakortti, l = S.lahja, osoite = lyhyt(T.varausLinkki);
    var tiedot = "Koodi: " + l.koodi + "\nVoimassa " + pvm(l.voimassa) + " asti.\nVaraa: " + osoite;
    if (l.valinta === "itse") return "Viinitasting.com-lahjakortti " + L.arvo + " €\n\n" + tiedot + "\n\nKerro koodi, kun varaat tastingin.";
    var alku = l.kenelle.trim() ? "Hei " + l.kenelle.trim() + "!" : "Hei!";
    var v = alku + " Sain viinitastingissa " + L.arvo + " € lahjakortin ja annan sen sinulle. Saat " + L.arvo +
      " € alennuksen omasta tastingista, jonka Viinitasting.com tuo teidän tiloihinne.\n\n" + tiedot;
    if (l.tervehdys.trim()) v += "\n\n" + l.tervehdys.trim();
    if (S.nimi) v += "\n\n– " + S.nimi;
    return v;
  }
  function jakoLinkit() {
    var teksti = lahjaViesti(), e = encodeURIComponent;
    var aihe = S.lahja.valinta === "itse" ? "Viinitasting.com-lahjakortti" : "Lahjakortti viinitastingiin";
    return { wa: "https://wa.me/?text=" + e(teksti), sms: "sms:?&body=" + e(teksti), mail: "mailto:?subject=" + e(aihe) + "&body=" + e(teksti), teksti: teksti };
  }
  function paivitaJako() {
    var j = jakoLinkit();
    var a = document.getElementById("l-wa"); if (!a) return;
    a.href = j.wa; document.getElementById("l-sms").href = j.sms; document.getElementById("l-mail").href = j.mail;
    document.getElementById("l-esikatselu").textContent = j.teksti;
  }
  function lahjaOsio() {
    var L = T.lahjakortti;
    if (!S.lahja) { S.lahja = luoLahja(); tallenna(); }
    var l = S.lahja;
    var h = '<div class="o-lahja"><div class="o-lahja__rivi"><span class="o-lahja__summa">' + L.arvo + ' €</span><span class="o-lahja__nimi">Kiitoslahja<small>alennus omasta tastingista</small></span></div>' +
      "<p>Käytä itse tai anna kaverille lahjaksi.</p>" +
      '<div class="o-valinta" role="group" aria-label="Kenelle lahjakortti">' +
      '<button data-act="lahja-valinta" data-v="itse" aria-pressed="' + (l.valinta === "itse") + '">Käytän itse</button>' +
      '<button data-act="lahja-valinta" data-v="lahja" aria-pressed="' + (l.valinta === "lahja") + '">Annan lahjaksi</button></div></div>';
    if (!l.valinta) return h;
    var j = jakoLinkit(), lahjaksi = l.valinta === "lahja";
    h += '<div class="vt-kortti o-koodi" id="lahjakortti"><div><span class="o-koodi__nimi">Lahjakortin koodi</span>' +
      '<span class="o-koodi__koodi">' + esc(l.koodi) + '</span><span class="o-vaimea">Voimassa ' + pvm(l.voimassa) + " asti</span></div>";
    h += '<h2 class="o-h2" style="font-size:24px">' + (lahjaksi ? "Lähetä lahjakortti" : "Tallenna itsellesi") + "</h2>" +
      '<div class="o-esikatselu" id="l-esikatselu">' + esc(j.teksti) + "</div>" +
      '<div class="o-jaa">' +
      '<a class="vt-painike vt-painike--toissijainen vt-painike--pieni" id="l-wa" href="' + esc(j.wa) + '" target="_blank" rel="noopener">WhatsApp</a>' +
      '<a class="vt-painike vt-painike--toissijainen vt-painike--pieni" id="l-sms" href="' + esc(j.sms) + '">Tekstiviesti</a>' +
      '<a class="vt-painike vt-painike--toissijainen vt-painike--pieni" id="l-mail" href="' + esc(j.mail) + '">Sähköposti</a>' +
      '<button class="vt-painike vt-painike--toissijainen vt-painike--pieni" data-act="lahja-kopioi">Kopioi</button></div>' +
      (navigator.share ? '<button class="vt-painike vt-painike--leveä" data-act="lahja-jaa">' + (lahjaksi ? "Lähetä muulla tavalla" : "Jaa muulla tavalla") + "</button>" : "") +
      '<p class="o-vaimea" id="lahja-tila" role="status"></p>' +
      '<textarea class="o-kentta o-kopio" id="lahja-teksti" readonly hidden></textarea>' +
      '<p class="o-ehdot">Voimassa ' + pvm(l.voimassa) + " asti. Yksi lahjakortti tastingvarausta kohden. Kerro koodi varauksen yhteydessä. Ei vaihdeta rahaksi. Myöntäjä " + esc(L.myontaja) + ".</p></div>";
    return h;
  }
  function arvioLinkki() { return T.googleArvioLinkki || "https://g.page/r/Ccf877ZSMJM8ECE/review"; }
  function arvioPyynto(pieni) {
    var linkki = arvioLinkki();
    if (pieni) return '<a class="o-garvio-pieni" href="' + esc(linkki) + '" target="_blank" rel="noopener"><span class="o-garvio__tahdet" aria-hidden="true">★★★★★</span><span><b>Tykkäsitkö illasta?</b>Anna tähdet Googlessa →</span></a>';
    return '<div class="o-garvio">' +
      '<span class="o-garvio__tahdet" aria-hidden="true">★★★★★</span>' +
      '<h2 class="o-garvio__otsikko">Anna illalle tähdet</h2>' +
      "<p>Pari sanaa tai kuva illasta Googleen auttaa muita löytämään tastingit. Kiitos, että olit mukana!</p>" +
      '<a class="vt-painike vt-painike--leveä o-garvio__nappi" href="' + esc(linkki) + '" target="_blank" rel="noopener">Arvioi Googlessa ★</a>' +
      '<p class="o-garvio__allekirjoitus">– ' + esc(T.juontaja || "Topias") + ", juontaja</p>" +
      "</div>";
  }

  /* ================= Juontaja ================= */
  var dia = store.get(KEY + "-juontaja", 0);
  function diat() {
    var a = [{ k: "kansi" }];
    if (onLinjat()) {
      var V = linjanViinit("viini"), A = linjanViinit("alkoholiton");
      for (var k = 0; k < Math.max(V.length, A.length); k++) {
        var pari = [V[k], A[k]].filter(function (x) { return x != null; });
        if (pari.some(function (i) { return onSokko(T.viinit[i]); })) a.push({ k: "maistelu", lasi: k + 1, pari: pari });
        pari.forEach(function (i) { a.push({ k: "paljastus", i: i }); });
      }
      if (lopuksi().length) { a.push({ k: "vertailu" }); a.push({ k: "vtulos", l: "viini" }); a.push({ k: "vtulos", l: "alkoholiton" }); }
    } else {
      if (kierrosTila()) {
        kierrokset().forEach(function (r) {
          a.push(r.length > 1 ? { k: "maistelu", pari: r, lasi: r.map(function (i) { return i + 1; }).join(" & ") } : { k: "maistelu", i: r[0] });
          r.forEach(function (i) { a.push({ k: "paljastus", i: i }); });
        });
      } else T.viinit.forEach(function (w, i) { if (onSokko(w)) a.push({ k: "maistelu", i: i }); a.push({ k: "paljastus", i: i }); });
      if (lopuksi().length) { a.push({ k: "vertailu" }); a.push({ k: "vtulos", l: "viini" }); }
    }
    a.push({ k: "loppu" });
    return a;
  }

  function diaAvaimet(d) {
    if (!d) return [];
    if (d.k === "paljastus") {
      return [{ avain: "a" + d.i, kysymys: "Mitä aromeja porukka löysi?", vaihtoehdot: aromit(d.i), oikea: null, fakta: "", moni: true }];
    }
    if (d.k === "vtulos") {
      var vv = lVaihtoehdot(d.l);
      return lopuksi().map(function (q) { return { avain: lAvain(q.id, d.l), kysymys: q.kysymys, vaihtoehdot: vv, oikea: lOikea(q, d.l), fakta: lFakta(q, d.l) }; })
        .concat(linjanViinit(d.l).map(function (i) { return { avain: "t" + i, kysymys: "★ Lasi " + nro(i) + " · " + lyhytNimi(i), vaihtoehdot: TAHDET, oikea: null, fakta: "", tahdet: true }; }));
    }
    return [];
  }
  // Ison näytön live-luku: moniko on painanut Valmis tästä lasista / montako mukana.
  function valmiinaTeksti(i) {
    var v = Math.max(0, (koonti[i] && typeof koonti[i].m === "number") ? koonti[i].m : 0), m = mukana();
    if (!v && !m) return "";
    return '<span class="j-valmiina"><i style="width:' + (m ? Math.min(100, Math.round(v / m * 100)) : 0) + '%"></i><span>' + (m ? v + "/" + m : v) + " valmiina</span></span>";
  }
  function tulosKortit(d, luokka) {
    var X = diaAvaimet(d), kortit = [];
    X.filter(function (x) { return !x.tahdet; }).forEach(function (x) {
      var j = x.moni && koontiTila() ? (koontiData(d.i).on ? true : null) : x.moni ? jaetut[x.avain] : naytettavat(x.avain, x.vaihtoehdot.length);
      var valmiina = x.moni && koontiTila() ? valmiinaTeksti(d.i) : "";
      kortit.push('<div class="j-tulos' + (x.moni ? " j-tulos--pilvi" : "") + '"><b>' + esc(x.kysymys) + "</b>" + valmiina +
        (j ? (x.moni ? kuplat(d.i, false, 30) : palkit(x.vaihtoehdot, j, x.oikea, null) + '<span class="j-tulos__n">' + summa(j) + " vastausta</span>")
           : x.oikea != null ? '<span class="j-tulos__oikea">✓ ' + esc(x.vaihtoehdot[x.oikea]) + "</span>"
           : '<span class="j-tulos__odota">' + (x.moni ? "Aromeja kerätään vielä…" : "Vastauksia kerätään vielä…") + "</span>") +
        (x.fakta ? '<span class="j-tulos__fakta">' + esc(x.fakta) + "</span>" : "") + "</div>");
    });
    if (d.k === "vtulos") kortit.push('<div class="j-tulos"><b>Illan tähtitaulukko</b>' + keskiarvoLista(linjanViinit(d.l), false) + "</div>");
    return '<div class="j-tulokset' + luokka + '" style="grid-template-columns:repeat(' + kortit.length + ', 1fr)">' + kortit.join("") + "</div>";
  }
  var edellinenAnim = "";
  function renderJuontaja() {
    var dk = diat()[dia]; if (dk && dk.k === "paljastus") { varmistaKoonti(dk.i); varmistaKoonti("loppu"); }
    var D = diat();
    dia = Math.max(0, Math.min(dia, D.length - 1));
    var d = D[dia], url = osallistujaUrl(), h = "", luokka = "";
    var teema = store.get("vt-teema", "vaalea");
    document.documentElement.dataset.theme = teema;
    document.body.className = "juontaja" + (document.body.classList.contains("j-levossa") ? " j-levossa" : "");

    if (d.k === "kansi") {
      luokka = " j-lava--kansi";
      h = logo(T.logoValkoinen || "/logo-valkoinen.png", "j-logo") +
        '<div class="j-palstat"><div class="j-palsta" style="justify-content:flex-end"><span class="j-ylatunniste">Juontajana ' + esc(T.juontaja) + "</span>" +
        '<p class="j-display" style="margin-top:calc(20 * var(--u))">Tervetuloa</p><p class="j-ala">' + esc(T.nimi) + "</p></div>" +
        '<div class="j-palsta j-palsta--kapea" style="align-items:center;justify-content:flex-end">' + qrSvg(url, "j-qr") +
        (url ? '<div class="j-osoite">' + esc(lyhyt(url)) + '</div><div class="j-ala" style="margin-top:calc(8 * var(--u));font-size:calc(34 * var(--u))">Skannaa koodi puhelimella</div>' +
          (mukana() ? '<div class="j-mukana"><b>' + mukana() + "</b> " + (mukana() === 1 ? "maistaja" : "maistajaa") + " mukana</div>" : "")
             : '<label class="j-asetus">Liitä osallistujien osoite<input id="j-osoite" placeholder="https://…" value=""></label>') +
        "</div></div>";
    } else if (d.k === "maistelu") {
      var lasi = d.pari ? d.lasi : nro(d.i);
      h = '<div class="j-rivi"><span class="j-pallo">' + lasi + '</span><span class="j-ylatunniste">Lasi ' + lasi + "</span></div>" +
        '<h1 class="j-otsikko">Haistele, maistele, anna tähdet</h1><p class="j-ala">' + (d.i != null && kierrosTila() && onKaveriKierros(d.i) ? "Viimeinen lasi. Kaada viereen suosikkisi aiemmista ja vertaile. Viini paljastuu, kun olet antanut aromit ja tähdet." : d.pari && kierrosTila() ? "Maistele molemmat lasit ja arvioi ne puhelimessa. Viinien tiedot aukeavat, kun molemmat on arvioitu." : "Valitse puhelimessa kaikki aromit, jotka löydät, ja anna 0–5 tähteä.") + "</p>" +
        '<div class="j-aromit">' + (T.aromit || []).map(function (a) { return "<span>" + aromiHtml(a) + "</span>"; }).join("") + "</div>" +
        (url ? '<div class="j-qr-pieni"><span>Myöhästyitkö?<br>' + esc(lyhyt(url)) + "</span>" + qrSvg(url, "") + "</div>" : "");
    } else if (d.k === "paljastus") {
      var v = T.viinit[d.i];
      var meta = [v.tuottaja, [v.alue, v.maa].filter(Boolean).join(", "), v.rypaleet].filter(Boolean).map(esc).join(" · ");
      h = '<div class="j-otsake"><span class="j-pallo">' + nro(d.i) + '</span><div><h1 class="j-otsikko">' + esc(v.nimi) + "</h1>" +
        '<div class="j-meta">' + tyyppi(v) + "<span>" + meta + "</span></div></div></div>" +
        '<div class="j-tulokset" style="grid-template-columns:1.5fr 1fr">' +
          tulosKortit(d, "").replace(/^<div class="j-tulokset" style="[^"]*">/, "").replace(/<\/div>$/, "") +
          '<div class="j-tulos">' + ((v.kuvat || [])[0] ? kuvaTag(v.kuvat[0], "j-kuva") : "") + "<b>Mitä lasista voi löytää</b><span class=\"j-huomio\">" + esc(v.maistele || "") + "</span></div></div>";
    } else if (d.k === "vertailu") {
      h = '<div class="j-rivi"><span class="j-ylatunniste">Yhteenveto</span></div>' +
        '<h1 class="j-otsikko">' + (lopuksi().length === 1 ? "Vielä yksi kysymys" : "Vielä " + lopuksi().length + " kysymystä") + '</h1><p class="j-ala">Vastaa puhelimessa kohdassa Yhteenveto ja lukitse vastauksesi.</p>' +
        '<ol class="j-kysymykset">' + lopuksi().map(function (q) { return "<li><b>" + esc(q.kysymys) + "</b></li>"; }).join("") + "</ol>";
    } else if (d.k === "vtulos") {
      var alk = d.l === "alkoholiton";
      h = '<div class="j-rivi"><span class="vt-tyyppi vt-tyyppi--kuohu' + (alk ? " vt-tyyppi--alkoholiton" : "") + '">' + (onLinjat() ? (alk ? "Alkoholittomat" : "Kuohuviinit") : "Tulokset") + "</span></div>" +
        '<h1 class="j-otsikko" style="font-size:calc(76 * var(--u))">Illan tulokset</h1>' + tulosKortit(d, " j-tulokset--4");
    } else {
      luokka = " j-lava--loppu";
      var vihrea = teema === "ilta" ? (T.logo || "/logo-vihrea.png") : (T.logoValkoinen || "/logo-valkoinen.png");
      h = logo(vihrea, "j-logo") + '<div class="j-palstat"><div class="j-palsta">' +
        '<p class="j-display">Kiitos!</p><p class="j-ala">Yhteenveto ja juomalista jäävät puhelimeesi.</p>' +
        (lahjaKaytossa() ? '<p class="j-ala">Puhelimessasi odottaa ' + T.lahjakortti.arvo + ' € kiitoslahja. Käytä se itse tai anna kaverille.</p>' : "") +
        '<p class="j-ala" style="font-weight:800">Varaa oma tasting: ' + esc(lyhyt(T.varausLinkki)) + "</p></div>" +
        '<div class="j-palsta j-palsta--kapea j-arvio">' + qrSvg(arvioLinkki(), "j-qr") + '<div class="j-arvio__tahdet">★★★★★</div><div class="j-ala" style="font-size:calc(36 * var(--u));font-weight:800">Anna tähdet Googlessa</div></div></div>';
    }

    var animAvain = dia + "|" + Object.keys(jaetut).filter(function (k) { return jaetut[k]; }).sort().join(",");
    if (animAvain !== edellinenAnim) { luokka += " j-anim"; edellinenAnim = animAvain; }
    app.innerHTML = '<div class="j-kehys"><div class="j-lava' + luokka + '" id="lava">' + h + "</div></div>" +
      '<nav class="j-ohjaus" aria-label="Diojen ohjaus">' +
      '<button data-act="j-ed" aria-label="Edellinen dia">‹</button><span class="j-laskuri">' + (dia + 1) + " / " + D.length + "</span>" +
      '<button data-act="j-seur" aria-label="Seuraava dia">›</button>' +
      '<button data-act="j-teema">' + (teema === "ilta" ? "Vaalea" : "Ilta") + "</button>" +
      '<button data-act="j-koko">Koko näyttö</button>' +
      '<a href="#ohjaus">' + (Y && !onJuontaja() ? "Kirjaudu juontajana" : "Puhelinohjaus") + '</a><a href="#poytakortti">Pöytäkortti</a><a href="#">Osallistujan näkymä</a>' +
      '<span id="yhteys" data-luokka="j-chip"></span></nav>';
    skaalaa();
    if (!levossaAjastin) heraa();
    paivitaYhteys();
  }
  // Ison näytön ohjauspalkki piiloutuu, kun hiiri on ollut paikallaan hetken.
  var levossaAjastin = null;
  function heraa() {
    document.body.classList.remove("j-levossa");
    clearTimeout(levossaAjastin);
    levossaAjastin = setTimeout(function () {
      var nav = document.querySelector(".j-ohjaus");
      if (!nav) return;
      if (nav.matches(":hover, :focus-within")) { heraa(); return; }
      document.body.classList.add("j-levossa");
    }, 2500);
  }
  ["mousemove", "mousedown", "touchstart", "keydown"].forEach(function (e) { window.addEventListener(e, heraa, { passive: true }); });
  function skaalaa() {
    var lava = document.getElementById("lava");
    if (!lava) return;
    var w = Math.min(window.innerWidth, window.innerHeight * 16 / 9);
    lava.style.setProperty("--u", (w / 1920) + "px");
  }
  function siirraDia(n) { asetaDia(dia + n); }
  function asetaDia(i) {
    var D = diat();
    dia = Math.max(0, Math.min(i, D.length - 1));
    store.set(KEY + "-juontaja", dia);
    laheta(); reitti();
  }
  function vaihdaTeema() {
    store.set("vt-teema", store.get("vt-teema", "vaalea") === "ilta" ? "vaalea" : "ilta");
    laheta(); reitti();
  }

  /* ---------- Puhelin ohjaa näyttöä (room) ---------- */
  var Y = null, kayttaja = null, vastausDocs = [], yhteysTila = "ei", vastausKuuntelu = null;
  var A = window.VT_ASETUKSET || {};
  function onJuontaja() { return !!(kayttaja && !kayttaja.anon && kayttaja.email && (A.juontajat || []).map(function (x) { return String(x).toLowerCase(); }).indexOf(kayttaja.email) >= 0); }
  function juontajaReitti() { return /^(juontaja|ohjaus|naytto)$/.test(location.hash.slice(1)); }
  function juontajaTila() {
    var h = location.hash.slice(1);
    if (h === "ohjaus") return "ohjaus";
    if (h === "naytto") return "naytto";
    return window.innerWidth < 760 ? "ohjaus" : "naytto";
  }
  function laheta() {
    if (!Y || !onJuontaja()) return;
    Y.kirjoitaTila({ dia: dia, teema: store.get("vt-teema", "vaalea"), jaetut: jaetut }).catch(function () { yhteysTila = "virhe"; paivitaYhteys(); });
  }
  var viimeksiLahetetty = "", lahetysAjastin = null;
  function asetaPresence() {
    if (!Y || !kayttaja || juontajaReitti() || !S.aloitettu) return;
    var v = {};
    omat().forEach(function (i) { if (S.lukittu[i]) v["v" + i] = { a: (S.aromit[i] || []).slice(0, 40), t: S.arviot[i] == null ? null : S.arviot[i], o: omatAromit(i).slice(0, 6) }; });
    var data = { l: S.linja || "viini", v: v, L: S.loppu.lukittu ? S.loppu.v : null };
    var s = JSON.stringify(data);
    if (s === viimeksiLahetetty) return;
    clearTimeout(lahetysAjastin);
    lahetysAjastin = setTimeout(function () {
      Y.tallennaVastaus(kayttaja.uid, data).then(function () { viimeksiLahetetty = s; }, function () {});
    }, 500);
  }
  function muut() { return vastausDocs.length; }
  function paivitaYhteys() {
    var el = document.getElementById("yhteys");
    var ok = !!Y && yhteysTila === "yhdistetty", tila = juontajaTila();
    if (tila === "ohjaus") ok = ok && onJuontaja();
    var fab = document.querySelector(".jt-fab"); if (fab) fab.classList.toggle("on-varoitus", !ok);
    if (!el) return;
    el.className = el.dataset.luokka + (ok ? " on" : "");
    el.textContent = !Y ? "Paikallinen tila" : tila === "ohjaus" ? (ok ? "Yhdistetty · " + vastausDocs.length + " puhelinta" : onJuontaja() ? "Ei yhteyttä" : "Ei kirjautunut") : (ok ? (onJuontaja() ? "Yhdistetty · live · " + vastausDocs.length + " puhelinta" : "Yhdistetty") : "Ei yhteyttä");
    var ohje = document.getElementById("yhteys-ohje");
    if (ohje) ohje.hidden = ok;
  }
  function oikeatJaetut(x) {
    if (!x || typeof x !== "object" || Array.isArray(x)) return null;
    var o = {};
    Object.keys(x).forEach(function (k) {
      if (/^o\d+$/.test(k) && Array.isArray(x[k]) && x[k].length <= 40) {
        o[k] = x[k].map(function (s) { return typeof s === "string" ? { t: s, n: 1 } : s; })
          .filter(function (s) { return s && typeof s.t === "string" && s.t.length <= 60 && typeof s.n === "number" && s.n > 0 && s.n < 100000; });
        return;
      }
      if (/^(a\d+|t\d+|L-[\w-]+)$/.test(k) && Array.isArray(x[k]) && x[k].length <= 40 &&
          x[k].every(function (n) { return typeof n === "number" && n >= 0 && n < 100000; })) o[k] = x[k];
    });
    return o;
  }
  var paivitysAjastin = null, vieritettyMs = 0;
  window.addEventListener("scroll", function () { vieritettyMs = Date.now(); }, { passive: true });
  window.addEventListener("touchmove", function () { vieritettyMs = Date.now(); }, { passive: true });
  function paivitaPian() {
    if (paivitysAjastin) return;
    paivitysAjastin = setTimeout(function () {
      paivitysAjastin = null;
      if (juontajaReitti()) {
        if (juontajaTila() !== "ohjaus") return;
        // Ohjaus on pitkä vieritettävä sivu: ei piirretä uudelleen kesken vierityksen, ettei sivu nyi.
        if (Date.now() - vieritettyMs < 1200) { paivitaPian(); return; }
        var ae = document.activeElement;
        if (ae && (ae.tagName === "TEXTAREA" || ae.tagName === "INPUT")) { paivitaPian(); return; }
        renderOhjaus(); return;
      }
      var pk = typeof S.nakyma === "number" ? document.getElementById("porukka-" + S.nakyma) : null;
      if (pk) { pk.innerHTML = porukkaHtml(S.nakyma); return; }
      var a = document.activeElement;
      if (a && (a.tagName === "TEXTAREA" || a.tagName === "INPUT")) return;
      if (location.hash.slice(1) !== "poytakortti") renderOsallistuja();
    }, 400);
  }
  var liveAjastin = null, julkaisija = null, jaetutAika = 0;
  var laiteId = store.get("vt-laite", null);
  if (!laiteId) { laiteId = "l" + Math.random().toString(36).slice(2, 10); store.set("vt-laite", laiteId); }
  function johtaja() { return !julkaisija || julkaisija.id === laiteId || Date.now() - julkaisija.aika > 20000; }
  function liveKaytossa() {
    var tila = juontajaReitti() ? juontajaTila() : "";
    return !T.sokkotasting && !koontiTila() && onJuontaja() && (tila === "ohjaus" || tila === "naytto") && store.get(KEY + "-live", true) !== false && johtaja();
  }
  function livePaivitys() {
    if (!liveKaytossa() || liveAjastin) return;
    liveAjastin = setTimeout(function () {
      liveAjastin = null;
      if (!liveKaytossa()) return;
      var muuttui = false;
      T.viinit.forEach(function (w, i) {
        var a = luvut("a" + i, aromit(i).length), o = omatHavainnot(i);
        if (!summa(a) && !o.length && !jaetut["a" + i] && !jaetut["o" + i]) return;
        if (JSON.stringify(a) !== JSON.stringify(jaetut["a" + i])) { jaetut["a" + i] = a; muuttui = true; }
        if (JSON.stringify(o) !== JSON.stringify(jaetut["o" + i] || [])) { jaetut["o" + i] = o; muuttui = true; }
      });
      if (muuttui && Y) {
        store.set(KEY + "-jaetut", jaetut);
        julkaisija = { id: laiteId, aika: Date.now() };
        if (Y.kirjoitaJaetut) Y.kirjoitaJaetut(jaetut, laiteId).catch(function () {}); else laheta();
        paivitaPian();
      }
    }, 2500);
  }
  function kuunteleVastaukset() {
    if (onJuontaja() && Y && !vastausKuuntelu) {
      vastausKuuntelu = Y.kuunteleVastaukset(function (lista) {
        vastausDocs = lista || [];
        paivitaYhteys();
        livePaivitys();
        if (juontajaReitti() && juontajaTila() === "ohjaus") paivitaPian();
      }, function () { vastausKuuntelu = null; });
    } else if (!onJuontaja() && vastausKuuntelu) { vastausKuuntelu(); vastausKuuntelu = null; vastausDocs = []; }
  }
  function alustaYhteys() {
    if (T.esikatselu) return;
    if (!window.VTYhteys || !A.firebase || !A.firebase.apiKey) return;
    try { Y = window.VTYhteys(A.firebase, T.id, !!A.emulaattori); } catch (e) { Y = null; return; }
    Y.onKayttaja(function (u) {
      kayttaja = u;
      if (!u && !juontajaReitti()) Y.anonyymi().catch(function () {});
      viimeksiLahetetty = "";
      if (u) { asetaPresence(); kiinnostavat().forEach(haeKoonti); if (!juontajaReitti() && S.lahja && S.lahja.valinta) tallennaLahjaTalteen(); }
      kuunteleVastaukset();
      if (juontajaReitti()) reitti();
      paivitaYhteys();
    });
    Y.kuunteleTila(function (d) {
      yhteysTila = "yhdistetty";
      var muuttui = false;
      if (d) {
        if (typeof d.dia === "number" && juontajaReitti()) { dia = Math.max(0, Math.min(d.dia, diat().length - 1)); store.set(KEY + "-juontaja", dia); }
        if ((d.teema === "ilta" || d.teema === "vaalea") && d.teema !== store.get("vt-teema", "vaalea")) { store.set("vt-teema", d.teema); if (!juontajaReitti() && !S.teema) muuttui = true; }
        if (typeof d.julkaisija === "string" && typeof d.julkaistuMs === "number") julkaisija = { id: d.julkaisija, aika: d.julkaisija === laiteId ? Date.now() : d.julkaistuMs };
        var uudet = oikeatJaetut(d.jaetut || {});
        if (uudet) { var jaetutMuuttui = JSON.stringify(uudet) !== JSON.stringify(jaetut); muuttui = muuttui || jaetutMuuttui; jaetut = uudet; store.set(KEY + "-jaetut", jaetut); if (jaetutMuuttui) jaetutAika = Date.now(); }
      }
      if (juontajaReitti()) reitti(); else if (muuttui) paivitaPian();
      paivitaYhteys();
    }, function () { yhteysTila = "virhe"; paivitaYhteys(); });
  }

  /* ---------- Juontajan puhelinpaneeli ---------- */
  function diaNimi(d) {
    if (!d) return "";
    if (d.k === "kansi") return "Kansi ja QR-koodi";
    if (d.k === "loppu") return "Kiitos · kiitoslahja";
    if (d.k === "vertailu") return "Yhteenveto · kysymykset";
    if (d.k === "vtulos") return "Illan tulokset ja tähdet" + (onLinjat() ? (d.l === "alkoholiton" ? " (alkoholittomat)" : " (kuohuviinit)") : "");
    if (d.pari) return "Lasi " + d.lasi + " · Maistelu";
    var w = T.viinit[d.i];
    var nimi = onLinjat() ? (w.alkoholiton ? "Alkoholiton " : "Kuohuviini ") + nro(d.i) : "Viini " + (d.i + 1);
    if (d.k === "maistelu") return nimi + " · Maistelu";
    return nimi + (onSokko(w) ? " · Paljastus ja aromit" : " · Aromit");
  }
  function muistiinpano(otsikko, teksti) {
    return teksti ? '<div class="p-muisti"><h3>' + otsikko + '</h3><p style="white-space:pre-line">' + esc(teksti) + "</p></div>" : "";
  }
  function puhelinLuvut(avain, n) {
    var a = [], k;
    for (k = 0; k < n; k++) a.push(0);
    var mA = /^a(\d+)$/.exec(avain), mT = /^t(\d+)$/.exec(avain), m2 = /^L-(.+)-(viini|alkoholiton)$/.exec(avain);
    function ok(x) { return typeof x === "number" && x >= 0 && x < n && Math.floor(x) === x; }
    vastausDocs.forEach(function (d) {
      if (!d || typeof d !== "object") return;
      if (mA || mT) {
        var r = d.v && d.v["v" + (mA || mT)[1]];
        if (!r || typeof r !== "object") return;
        if (mA && Array.isArray(r.a)) r.a.filter(function (x, idx, arr) { return ok(x) && arr.indexOf(x) === idx; }).forEach(function (x) { a[x]++; });
        if (mT && ok(r.t)) a[r.t]++;
      } else if (m2 && d.l === m2[2] && d.L && ok(d.L[m2[1]])) a[d.L[m2[1]]]++;
    });
    return a;
  }
  function luvut(avain, n) {
    var p = puhelinLuvut(avain, n), k = kasin[avain] || [];
    return p.map(function (x, o) { return Math.max(0, x + (k[o] || 0)); });
  }
  function omatHavainnot(i) {
    var m = {}, l = [];
    vastausDocs.forEach(function (d) {
      var r = d && d.v && d.v["v" + i], o = r ? r.o : null;
      var lista = Array.isArray(o) ? o : (typeof o === "string" && o ? [o] : []), nahty = {};
      lista.slice(0, 6).forEach(function (x) {
        var t = String(x || "").trim().slice(0, 40), k = t.toLowerCase();
        if (!t || nahty[k]) return; nahty[k] = 1;
        if (m[k]) m[k].n++; else { m[k] = { t: t, n: 1 }; l.push(m[k]); }
      });
    });
    return l.sort(function (a, b) { return b.n - a.n; }).slice(0, 40);
  }
  function omatLista(i) {
    var l = omatHavainnot(i), j = jaetut["o" + i];
    return '<div class="p-muisti"><h3>Omin sanoin puhelimista (' + l.length + ")" + (j ? " · jaettu" : "") + "</h3>" +
      (l.length ? '<div class="o-omat">' + l.map(function (x) { return "<span>" + esc(x.t) + (x.n > 1 ? " ×" + x.n : "") + "</span>"; }).join("") + "</div>" : '<p class="p-ohje" style="margin:0">Ei vielä omia havaintoja.</p>') +
      '<p class="p-ohje">Jaetaan samalla Näytä kaikille -painikkeella.</p></div>';
  }
  var saannotOk = null, tyhjennysVarma = false;
  function tarkistaSaannot() {
    if (saannotOk !== null || !Y || !Y.koontiLisaa || !onJuontaja() || T.sokkotasting) return;
    saannotOk = "kesken";
    Y.koontiLisaa("loppu", { m: 0 }).then(function () { saannotOk = true; paivitaPian(); }, function () { saannotOk = false; paivitaPian(); });
  }
  function tarkistuslista() {
    if (!Y || T.sokkotasting) return "";
    tarkistaSaannot();
    var n = vastausDocs.length, m = mukana() || 0;
    function rivi(tila, teksti, ohje) {
      return '<li class="p-tark p-tark--' + tila + '"><span class="p-tark__ikoni" aria-hidden="true">' + (tila === "ok" ? "✓" : tila === "ei" ? "!" : "…") + "</span><div><b>" + teksti + "</b>" + (ohje ? "<span>" + ohje + "</span>" : "") + "</div></li>";
    }
    var testi = store.get(KEY + "-testattu", false);
    return '<div class="p-muisti p-tarkistus"><h3>Ennen aloitusta</h3><ul>' +
      rivi(saannotOk === true ? "ok" : saannotOk === false ? "ei" : "odota", saannotOk === true ? "Tietokannan säännöt kunnossa" : saannotOk === false ? "Säännöt puuttuvat" : "Tarkistetaan sääntöjä…",
        saannotOk === false ? "Julkaise uudet säännöt Firebase-konsolissa (Firestore → Rules), muuten tähdet ja vastaukset eivät päivity livenä." : "") +
      rivi(n === 0 && m === 0 ? "ok" : "ei", n === 0 && m === 0 ? "Ei vanhoja vastauksia" : (n || m) + " vastausta tallessa",
        n === 0 && m === 0 ? "" : "Jos nämä ovat testejä, tyhjennä ennen kuin vieraat skannaavat. Tyhjennä myös omasta puhelimesta kohta Aloita alusta.") +
      rivi(testi ? "ok" : "odota", testi ? "Testattu omalla puhelimella" : "Testaa omalla puhelimella", testi ? "" : "Skannaa koodi, käy yksi lasi läpi ja katso, että aromit näkyvät isolla näytöllä.") +
      "</ul>" +
      '<div class="p-tark__napit">' +
      (n || m ? '<button class="vt-painike vt-painike--pieni p-vaara" data-act="p-tyhjenna">' + (tyhjennysVarma ? "Varmasti? Paina uudelleen" : "Tyhjennä vastaukset") + "</button>" : "") +
      '<button class="vt-painike vt-painike--pieni vt-painike--toissijainen" data-act="p-testattu">' + (testi ? "Merkitse testaamattomaksi" : "Testattu ✓") + "</button></div>" +
      (m ? '<p class="p-ohje" style="margin:var(--vali-3) 0 0"><b>' + m + "</b> " + (m === 1 ? "maistaja" : "maistajaa") + " mukana</p>" : "") +
      "</div>";
  }
  function aromiYhteenveto(i) {
    varmistaKoonti(i);
    return '<div class="p-muisti"><h3>Mitä aromeja porukka löysi?</h3><p class="p-ohje" style="margin:0 0 var(--vali-2)">Päivittyy kaikille itsestään, myös isolle näytölle. Sinun ei tarvitse tehdä mitään.</p>' + kuplat(i, false, 18) + "</div>";
  }
  function laskurit(d, k) {
    var X = diaAvaimet(d), dk = k == null ? dia : k;
    if (!X.length) return "";
    var jaettu = X.some(function (x) { return jaetut[x.avain]; });
    function kortti(x) {
      var n = x.vaihtoehdot.length, p = puhelinLuvut(x.avain, n), L = luvut(x.avain, n), j = jaetut[x.avain];
      if (koontiTila()) {
        var lv = liveLuvut(x.avain, n) || p;
        return '<div class="p-laskuri p-laskuri--live"><h3>' + esc(x.kysymys) + "</h3><ul>" + x.vaihtoehdot.map(function (v, o) {
          return '<li class="' + (o === x.oikea ? "on-oikea" : "") + '"><span>' + (o === x.oikea ? "✓ " : "") + (x.tahdet ? "★ " : "") + esc(v) + "</span><b>" + lv[o] + "</b></li>";
        }).join("") + '</ul><span class="p-tila' + (j ? " on" : "") + '">' + (j ? "Näkyy kaikille" : "Piilossa") + " · " + summa(lv) + " vastausta" +
          (x.tahdet && keskiarvo(lv) != null ? " · ★ " + desi(keskiarvo(lv)) : "") + "</span></div>";
      }
      return '<div class="p-laskuri"><h3>' + esc(x.kysymys) + "</h3><ul>" + x.vaihtoehdot.map(function (v, o) {
        return '<li class="' + (o === x.oikea ? "on-oikea" : "") + '"><span>' + (o === x.oikea ? "✓ " : "") + (x.tahdet ? "★ " : "") + esc(v) + '</span><span class="p-puh">📱 ' + p[o] + "</span>" +
          '<button data-act="p-kasin" data-k="' + esc(x.avain) + '" data-o="' + o + '" data-d="-1" aria-label="Vähennä">−</button><b>' + L[o] + "</b>" +
          '<button data-act="p-kasin" data-k="' + esc(x.avain) + '" data-o="' + o + '" data-d="1" aria-label="Lisää">+</button></li>';
      }).join("") + '</ul><span class="p-tila' + (j ? " on" : "") + '">' + (j ? "Jaettu" + (x.moni ? "" : ": " + summa(j) + " vastausta") : "Ei jaettu") +
        (x.tahdet && keskiarvo(L) != null ? " · nyt ★ " + desi(keskiarvo(L)) : "") + "</span></div>";
    }
    var tav = X.filter(function (x) { return !x.tahdet; }), tah = X.filter(function (x) { return x.tahdet; });
    var liveRivi = (koontiTila() && d.k === "paljastus") ? '<p class="p-ohje" style="margin:0 0 var(--vali-2)"><b>Aromit päivittyvät kaikille itsestään</b>, vaikka tämä näkymä olisi kiinni. Laskurit alla ovat sinun käsiäänestystäsi varten.</p>' : (!T.sokkotasting && d.k === "paljastus") ? '<p class="p-ohje" style="margin:0 0 var(--vali-2)">' + (store.get(KEY + "-live", true) !== false ? "<b>Aromit livenä:</b> porukan aromit päivittyvät kaikille itsestään. Tähdet pysyvät piilossa. " : "<b>Live-jako pois.</b> Jaa aromit napista. ") +
      '<button class="vt-linkki" data-act="p-live">' + (store.get(KEY + "-live", true) !== false ? "Laita pois" : "Laita päälle") + "</button></p>" : "";
    if (koontiTila()) liveRivi = '<p class="p-ohje" style="margin:0 0 var(--vali-2)">Luvut päivittyvät itsestään. Paina <b>Näytä kaikille</b>, kun haluat paljastaa tulokset puhelimiin ja isolle näytölle.</p>';
    var jaaNapit = '<div class="p-jaa"><button class="vt-painike" data-act="p-jaa" data-d="' + dk + '">' + (jaettu && !koontiTila() ? "Päivitä kaikille" : "Näytä kaikille") + "</button>" +
      '<button class="vt-painike vt-painike--toissijainen" data-act="p-piilota" data-d="' + dk + '"' + (jaettu ? "" : " disabled") + ">Piilota</button></div>";
    var tahtiRivi = tah.map(function (x) { var lv = (koontiTila() && liveLuvut(x.avain, 6)) || luvut(x.avain, 6), ka = keskiarvo(lv); return esc(x.kysymys.replace(/^★\s*/, "")) + ": " + (ka == null ? "–" : "★ " + desi(ka)) + " (" + summa(lv) + ")"; });
    return '<div class="p-muisti"><h3>Vastaukset · ' + (jaettu ? "näkyvät kaikille" : "eivät vielä näy") + "</h3>" + liveRivi + jaaNapit +
      (koontiTila() ? "" : '<p class="p-ohje" style="margin:0">📱 = puhelimista tulleet. Lisää käsiäänet + ja − napeilla.</p>') +
      tav.map(kortti).join("") +
      (tah.length ? '<h3 style="margin-top:var(--vali-5)">Tähdet viineittäin</h3><p class="p-ohje" style="margin:0 0 var(--vali-2)">Jakaumat näkyvät vain sinulle. Vieraille ja isolle näytölle näytetään keskiarvot.</p>' +
        '<div class="jt-tahtikortit">' + tah.map(function (x) {
          var lv = (koontiTila() && liveLuvut(x.avain, 6)) || luvut(x.avain, 6), ka = keskiarvo(lv);
          return '<div class="jt-tahtikortti"><div class="jt-tahtikortti__yla"><b>' + esc(x.kysymys.replace(/^★\s*/, "")) + "</b><span>" + (ka == null ? "–" : "★ " + desi(ka)) + " · " + summa(lv) + " kpl</span></div>" + tahtiJakauma(lv) + "</div>";
        }).join("") + "</div>" : "") +
      "</div>";
  }
  function kirjautuminen() {
    document.documentElement.dataset.theme = "vaalea";
    document.body.className = "ohjaus";
    app.innerHTML = '<main class="o-kehys"><section class="o-osio" style="padding-top:var(--vali-6)">' + logo(T.logo, "logo") +
      '<h1 class="o-h1">Juontajan kirjautuminen</h1><p class="o-vaimea">' + esc(T.nimi) + "</p>" +
      '<div><label class="o-label" for="k-email">Sähköposti</label><input class="o-kentta" id="k-email" type="email" autocomplete="username" value="' + esc((A.juontajat || [])[0] || "") + '"></div>' +
      '<div><label class="o-label" for="k-salasana">Salasana</label><input class="o-kentta" id="k-salasana" type="password" autocomplete="current-password"></div>' +
      '<button class="vt-painike vt-painike--leveä" data-act="p-kirjaudu">Kirjaudu</button>' +
      '<p class="o-virhe" id="k-virhe" role="alert" hidden></p>' +
      '<p class="o-alatunniste"><a class="vt-linkki" href="#naytto">Ison näytön näkymä</a> · <a class="vt-linkki" href="#">Osallistujan näkymä</a></p>' +
      "</section></main>";
  }
  function ohjausOsio(d, k, url) {
    var h = "";
    if (d.k === "kansi") {
      h = '<h1 class="p-h1">Tervetuloa</h1>' +
        '<div class="p-qr">' + qrSvg(url, "") + "<div>" + (url ? "<b>" + esc(lyhyt(url)) + "</b>" : "<b>Osoite puuttuu</b>") +
        '<button class="vt-painike vt-painike--pieni" data-act="p-iso" data-v="qr">Näytä QR isona</button></div></div>' +
        (url ? "" : '<label class="o-label" for="j-osoite">Osallistujien osoite</label><input class="o-kentta" id="j-osoite" placeholder="https://…">') +
        tarkistuslista() +
        muistiinpano("Muista", "Pyydä kaikkia skannaamaan koodi." + (onLinjat() ? " Jokainen valitsee alussa kuohuviinit tai alkoholittomat ja näkee vain omat juomansa." : "") + (lahjaKaytossa() ? " Kerro, että lopussa odottaa kiitoslahja." : ""));
    } else if (d.k === "vertailu") {
      h = '<h1 class="p-h1">Yhteenveto</h1>' +
        muistiinpano("Ohje", "Osallistujat vastaavat puhelimessa kohdassa Yhteenveto. Seuraavilla dioilla jaat vastaukset ja tähtien keskiarvot.") +
        lopuksi().map(function (q) {
          var t = (onLinjat() ? ["viini", "alkoholiton"] : ["viini"]).map(function (l) {
            var o = lOikea(q, l), vv = lVaihtoehdot(l);
            return (onLinjat() ? (l === "alkoholiton" ? "Alkoholittomat: " : "Kuohuviinit: ") : "") + (o != null ? "✓ " + vv[o] + ". " : "") + lFakta(q, l);
          }).join("\n");
          return muistiinpano(esc(q.kysymys), t);
        }).join("");
    } else if (d.k === "vtulos") {
      h = '<h1 class="p-h1">Illan tulokset' + (onLinjat() ? (d.l === "alkoholiton" ? " · alkoholittomat" : " · kuohuviinit") : "") + "</h1>" + laskurit(d, k);
    } else if (d.k === "maistelu" && d.pari) {
      h = '<div class="o-rivi"><span class="vt-pallo">' + d.lasi + '</span><span class="p-vaihe">Lasi ' + d.lasi + " · maistelu</span></div>" +
        '<h1 class="p-h1">Haistele, maistele, anna tähdet</h1>' +
        d.pari.map(function (i) {
          var w = T.viinit[i];
          return '<div class="p-muisti">' + tyyppi(w) + '<p style="margin:var(--vali-2) 0 0"><b>' + esc(w.nimi) + "</b></p></div>" +
            muistiinpano("Kiinnitä huomiota", w.maistele) + muistiinpano("Omat muistiinpanot", w.juontajalle);
        }).join("");
    } else if (d.k === "loppu") {
      h = '<h1 class="p-h1">Kiitos ja kiitoslahja</h1>' +
        (lahjaKaytossa() ? muistiinpano("Kiitoslahja", "Jokaisen puhelimessa on nyt " + T.lahjakortti.arvo + " € lahjakortti yhteenvedossa. Sen voi käyttää itse tai antaa kaverille.") : "") +
        muistiinpano("Sano näin", "Jos ilta oli hauska, kuva tai pari sanaa Googleen auttaa minua tosi paljon. Koodi on tuossa näytöllä, ja linkki löytyy myös puhelimen yhteenvedon ylimpänä.") +
        muistiinpano("Google-arvio", "Tärkein! Älä yhdistä pyyntöä lahjakorttiin, lahja on kaikille joka tapauksessa.") +
        muistiinpano("Varaukset", "Oma tasting: " + lyhyt(T.varausLinkki));
    } else {
      var w = T.viinit[d.i], sokko = onSokko(w);
      h = '<div class="o-rivi"><span class="vt-pallo">' + nro(d.i) + "</span>" + tyyppi(w) + "</div>" +
        '<h1 class="p-h1">' + esc(w.nimi) + "</h1>";
      if (sokko && d.k === "paljastus" && T.kaytaPaljastussanaa) {
        h += '<div class="p-sana"><span>Paljastussana</span><b>' + esc(w.paljastussana) + "</b>" +
          '<button class="p-sana__nappi" data-act="p-iso" data-v="sana" data-i="' + d.i + '">Näytä isona</button></div>';
      }
      if (d.k === "paljastus") h += koontiTila() ? aromiYhteenveto(d.i) : laskurit(d, k) + omatLista(d.i);
      if (d.k === "maistelu") {
        h += (T.kaytaPaljastussanaa ? '<p class="o-vaimea">Paljastussana seuraavassa vaiheessa: <b>' + esc(w.paljastussana) + "</b></p>" : "") +
          muistiinpano("Kiinnitä huomiota", w.maistele) + muistiinpano("Omat muistiinpanot", w.juontajalle);
      } else {
        h += muistiinpano("Tarina", w.tarina) + muistiinpano("Kiinnitä huomiota", w.maistele) +
          muistiinpano("Ruoaksi", w.ruoaksi) + muistiinpano("Omat muistiinpanot", w.juontajalle);
      }
    }

    return h;
  }
  /* ---------- Juontajan näkymä: osallistujan näkymä + vain juontajalle näkyvät osat ---------- */
  function jtLaatikko(otsikko, sisalto, luokka) {
    if (!sisalto) return "";
    return '<section class="jt' + (luokka ? " " + luokka : "") + '"><div class="jt__yla"><span class="jt-merkki">Vain juontajalle</span>' + (otsikko ? "<b>" + otsikko + "</b>" : "") + "</div>" + sisalto + "</section>";
  }
  function jtIlmanOtsikkoa(h) { return h.replace(/<h1 class="p-h1">[\s\S]*?<\/h1>/, ""); }
  function jtDiat(nak) {
    var D = diat(), l = [];
    D.forEach(function (d, k) {
      if (nak === "alku" ? d.k === "kansi" : nak === "loppu" ? d.k === "loppu" : nak === "vertailu" ? (d.k === "vertailu" || d.k === "vtulos") :
        (d.i === nak || (d.pari && d.pari.indexOf(nak) >= 0))) l.push(k);
    });
    return l;
  }
  function jtNakymaDialle(k) {
    var d = diat()[k];
    if (!d) return "alku";
    if (d.k === "kansi") return "alku";
    if (d.k === "loppu") return "loppu";
    if (d.k === "vertailu" || d.k === "vtulos") return "vertailu";
    if (d.pari) { var o = d.pari.filter(function (i) { return onOma(i); }); return o.length ? o[0] : d.pari[0]; }
    return d.i;
  }
  function jtNaytolle(nak) {
    var D = diat();
    var napit = jtDiat(nak).map(function (k) {
      return k === dia ? '<span class="p-nyt-merkki">Näytöllä nyt · ' + esc(diaNimi(D[k])) + "</span>" :
        '<button class="vt-painike vt-painike--pieni jt-nappi" data-act="p-nayta" data-v="' + k + '">Näytä näytöllä · ' + esc(diaNimi(D[k])) + "</button>";
    }).join("");
    return napit ? '<div class="jt jt--palkki"><span class="jt-merkki">Iso näyttö</span><div class="jt__napit">' + napit + "</div></div>" : "";
  }
  // Juontajalle koko ajan näkyvä tilanne: moniko on vastannut, mitä aromeja ja miten tähdet jakautuvat.
  function tahtiJakauma(lv) {
    var max = Math.max.apply(null, lv.concat([1]));
    return '<div class="jt-tahdet">' + lv.map(function (n, o) {
      return '<div class="jt-tahdet__sarake"><span class="jt-tahdet__n">' + n + '</span><i style="height:' + Math.round(n / max * 100) + '%"></i><span class="jt-tahdet__o">' + o + "★</span></div>";
    }).join("") + "</div>";
  }
  function jtViiniLive(i) {
    if (!koontiTila()) return "";
    var v = Math.max(0, (koonti[i] && typeof koonti[i].m === "number") ? koonti[i].m : 0), m = mukana() || 0;
    var lv = liveLuvut("t" + i, 6) || [0, 0, 0, 0, 0, 0], n = summa(lv), ka = keskiarvo(lv);
    var kd = koontiData(i), aromiN = 0;
    (kd.a || []).forEach(function (x) { aromiN += Math.max(0, x || 0); });
    (kd.o || []).forEach(function (x) { aromiN += Math.max(0, (x && x.n) || 0); });
    var kaveriOsa = "";
    if (kierrosTila() && onKaveriKierros(i)) {
      var aiemmat = T.viinit.map(function (w, j) { return j; }).filter(function (j) { return j < i; });
      var kl = liveLuvut("L-kaveri", aiemmat.length) || aiemmat.map(function () { return 0; }), kmax = Math.max.apply(null, kl.concat([1]));
      kaveriOsa = '<p class="jt-pieni">Viereen valittu</p><ul class="jt-kaverit">' + aiemmat.map(function (j, x) {
        return '<li><span>Lasi ' + nro(j) + " · " + esc(lyhytNimi(j)) + '</span><i style="width:' + Math.round(kl[x] / kmax * 100) + '%"></i><b>' + kl[x] + "</b></li>";
      }).join("") + "</ul>";
    }
    return '<section class="o-osio" style="padding-bottom:0">' + jtLaatikko("Lasi " + nro(i) + (onSokko(T.viinit[i]) ? " · " + esc(lyhytNimi(i)) : "") + " livenä",
      '<div class="jt-luvut"><div><b>' + v + (m ? "/" + m : "") + "</b><span>" + (onSokko(T.viinit[i]) ? "lukinnut" : "painanut Valmis") + "</span></div>" +
      "<div><b>" + n + "</b><span>antanut tähdet</span></div>" +
      "<div><b>" + (ka == null ? "–" : desi(ka)) + "</b><span>tähtien ka.</span></div>" +
      "<div><b>" + aromiN + "</b><span>aromivalintaa</span></div></div>" +
      "<p class=\"jt-pieni\">Tähtijakauma · näkyy vain sinulle, vieraat näkevät keskiarvot vasta lopussa</p>" + tahtiJakauma(lv) +
      kaveriOsa + "<p class=\"jt-pieni\">Porukan aromit näkyvät alla samoin kuin vieraille, jotka ovat vastanneet.</p>") + "</section>";
  }
  function jtViiniLisat(w) {
    var i = T.viinit.indexOf(w), h = "";
    if (onSokko(w) && T.kaytaPaljastussanaa && w.paljastussana) h += '<div class="p-sana"><span>Paljastussana</span><b>' + esc(w.paljastussana) + '</b><button class="p-sana__nappi" data-act="p-iso" data-v="sana" data-i="' + i + '">Näytä isona</button></div>';
    if (w.juontajalle) h += "<p>" + esc(w.juontajalle) + "</p>";
    return jtLaatikko("Juontajan muistiinpanot", h, "jt--kortissa");
  }
  function jtVertailu() {
    var D = diat(), url = osallistujaUrl(), h = "";
    jtDiat("vertailu").forEach(function (k) { h += jtIlmanOtsikkoa(ohjausOsio(D[k], k, url)); });
    if (koontiTila()) {
      var m = mukana() || 0;
      var vastanneet = Math.max.apply(null, [0].concat(lopuksi().map(function (q) { return summa(liveLuvut(lAvain(q.id, S.linja || "viini"), lVaihtoehdot(S.linja || "viini").length) || []); })));
      h = '<div class="jt-luvut"><div><b>' + m + "</b><span>mukana</span></div><div><b>" + vastanneet + "</b><span>vastannut loppukysymykseen</span></div></div>" + h;
    }
    return jtLaatikko("Oikeat vastaukset ja tulosten julkaisu", h);
  }
  function jtLoppu() {
    var D = diat(), url = osallistujaUrl(), h = "";
    jtDiat("loppu").forEach(function (k) { h += jtIlmanOtsikkoa(ohjausOsio(D[k], k, url)); });
    return '<section class="o-osio" style="padding-bottom:0">' + jtLaatikko("Lopetus", h) + "</section>";
  }
  function jtAlku() {
    var D = diat(), url = osallistujaUrl(), teema = store.get("vt-teema", "vaalea"), h = "";
    jtDiat("alku").forEach(function (k) { h += jtIlmanOtsikkoa(ohjausOsio(D[k], k, url)); });
    var asetukset = '<div class="p-asetukset" style="margin-top:var(--vali-4)"><button class="vt-painike vt-painike--toissijainen vt-painike--pieni" data-act="j-teema">Näytön teema: ' + (teema === "ilta" ? "Ilta" : "Vaalea") + "</button>" +
      (Y && onJuontaja() ? '<button class="vt-linkki" data-act="p-ulos">Kirjaudu ulos</button>' : "") +
      '<a class="vt-linkki" href="#naytto">Avaa näyttönäkymä</a><a class="vt-linkki" href="#poytakortti">Pöytäkortit</a><a class="vt-linkki" href="#">Osallistujan näkymä</a></div>';
    return '<section class="o-osio"><h1 class="o-h1">' + esc(T.nimi) + "</h1>" +
      '<p class="o-ingressi">' + esc(T.kuvaus) + "</p>" +
      '<p class="o-vaimea">Osallistujat näkevät alussa tämän tekstin ja Aloitetaan-napin. Välilehdet yllä näyttävät saman kuin vieraiden puhelimissa. Omat napautuksesi tällä puhelimella eivät mene vieraiden laskureihin.</p>' +
      jtLaatikko("Ennen aloitusta", h + asetukset) + "</section>";
  }
  // Ison näytön ohjaus: pieni pyöreä nappi oikeassa alakulmassa, josta paneeli aukeaa.
  var jtPaneeliAuki = false;
  function jtAlapalkki() {
    var D = diat(), seuraava = D[dia + 1];
    var nappi = '<button class="jt-fab' + (jtPaneeliAuki ? " on-auki" : "") + '" data-act="jt-paneeli" aria-expanded="' + jtPaneeliAuki + '" aria-label="Ison näytön ohjaus">' +
      '<span class="jt-fab__ikoni" aria-hidden="true">' + (jtPaneeliAuki ? "×" : "▭") + "</span><span class=\"jt-fab__nro\">" + (dia + 1) + "/" + D.length + "</span></button>";
    if (!jtPaneeliAuki) return nappi + '<div class="p-iso" id="p-iso" hidden data-act="p-sulje"></div>';
    var tama = jtDiat(S.nakyma);
    var lista = D.map(function (d, k) {
      return '<li><button data-act="p-nayta" data-v="' + k + '" aria-current="' + (k === dia) + '"' + (tama.indexOf(k) >= 0 ? ' class="on-tama"' : "") + "><span>" + (k + 1) + "</span>" + esc(diaNimi(d)) + (k === dia ? "<em>näytöllä</em>" : "") + "</button></li>";
    }).join("");
    return '<div class="jt-paneeli" role="dialog" aria-label="Ison näytön ohjaus">' +
      '<div class="jt-paneeli__yla"><span class="jt-merkki">Iso näyttö</span><span id="yhteys" data-luokka="p-chip"></span><button class="vt-linkki" data-act="jt-paneeli">Sulje</button></div>' +
      '<div class="jt-ala__rivi">' +
      '<button class="vt-painike vt-painike--toissijainen jt-ala__ed" data-act="j-ed"' + (dia === 0 ? " disabled" : "") + ' aria-label="Edellinen dia">‹</button>' +
      '<button class="jt-ala__tila" data-act="p-nykyinen"><span>Näytöllä</span><b>' + esc(diaNimi(D[dia])) + "</b>" + (seuraava ? "<small>Seuraavaksi: " + esc(diaNimi(seuraava)) + "</small>" : "") + "</button>" +
      '<button class="vt-painike jt-ala__seur" data-act="j-seur"' + (seuraava ? "" : " disabled") + ' aria-label="Seuraava dia">›</button></div>' +
      '<ol class="jt-dialista">' + lista + "</ol>" +
      '<p class="jt-paneeli__vihje">Korostetut kuuluvat tähän välilehteen. Napauta diaa, niin se vaihtuu isolle näytölle.</p></div>' +
      nappi + '<div class="p-iso" id="p-iso" hidden data-act="p-sulje"></div>';
  }
  function renderOhjaus() {
    if (Y && !onJuontaja()) { asetaJT(false); kirjautuminen(); return; }
    asetaJT(true);
    var D = diat();
    D.forEach(function (x) { if (x.k === "paljastus") varmistaKoonti(x.i); });
    dia = Math.max(0, Math.min(dia, D.length - 1));
    var y = window.scrollY;
    renderOsallistuja();
    window.scrollTo(0, y);
  }
  var ohjelmaAuki = false;
  document.addEventListener("toggle", function (e) { if (e.target.classList && e.target.classList.contains("p-ohjelma")) ohjelmaAuki = e.target.open; }, true);
  function vieritaDiaan(k) {
    var el = document.getElementById("p-dia-" + k);
    if (!el) return;
    var yla = document.querySelector(".p-yla"), ylaK = yla ? yla.getBoundingClientRect().height : 0;
    window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - ylaK - 12));
  }
  function naytaIsona(mita, wi) {
    var el = document.getElementById("p-iso"), D = diat(), d = D[dia];
    if (wi != null && !isNaN(wi)) d = { i: wi };
    if (!el) return;
    if (mita === "qr") {
      var url = osallistujaUrl();
      el.className = "p-iso p-iso--qr";
      el.innerHTML = qrSvg(url, "") + "<b>" + esc(lyhyt(url)) + "</b><span>Napauta sulkeaksesi</span>";
    } else {
      el.className = "p-iso p-iso--sana";
      el.innerHTML = "<small>Paljastussana</small><b>" + esc(T.viinit[d.i].paljastussana) + "</b><span>Napauta sulkeaksesi</span>";
    }
    el.hidden = false;
  }

  /* ================= Pöytäkortti ================= */
  function renderKortti() {
    document.documentElement.dataset.theme = "vaalea";
    document.body.className = "kortti";
    var url = osallistujaUrl();
    var kortti = '<div class="k-kortti">' + logo(T.logo || "/logo-vihrea.png", "logo") + '<span class="k-nimi">' + esc(T.nimi) + "</span><h2>Skannaa ja tule mukaan</h2>" +
      "<p>" + (T.sokkotasting ? "Arvaa lasit, löydä aromit ja anna tähdet." : "Löydä aromit, anna tähdet ja katso, mitä porukka löysi.") + " Ei sovellusta, ei kirjautumista.</p>" +
      qrSvg(url, "") + (url ? '<div class="k-osoite">' + esc(lyhyt(url)) + "</div>" : "") + "</div>";
    app.innerHTML = '<div class="k-tyokalut"><p>Neljä A6-korttia A4-arkilla. Tulosta paksulle kartongille ja leikkaa katkoviivoja pitkin.' +
      (url ? "" : " Liitä ensin osallistujien osoite juontajan näkymän kanteen.") + "</p>" +
      '<button class="vt-painike" data-act="tulosta">Tulosta</button><a class="vt-linkki" href="#juontaja">Takaisin</a></div>' +
      '<div class="k-sivu">' + kortti + kortti + kortti + kortti + "</div>";
  }

  /* ================= Reititys ja tapahtumat ================= */
  function reitti() {
    var h = location.hash.slice(1);
    edellinenTila = juontajaReitti() ? juontajaTila() : null;
    if (!(juontajaReitti() && juontajaTila() === "ohjaus")) asetaJT(false);
    asetaPresence();
    if (juontajaReitti()) { if (juontajaTila() === "ohjaus") renderOhjaus(); else renderJuontaja(); }
    else if (h === "poytakortti") renderKortti();
    else renderOsallistuja();
  }
  var tyhjennysVarmistus = false;

  app.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]");
    if (!t) return;
    var act = t.dataset.act, i = t.dataset.i != null ? +t.dataset.i : null;
    switch (act) {
      case "linja":
        S.linja = t.dataset.v; tallenna();
        Array.prototype.forEach.call(app.querySelectorAll('[data-act="linja"]'), function (b) { var on = b.dataset.v === S.linja; b.setAttribute("aria-pressed", on); b.setAttribute("aria-checked", on); });
        var ry = app.querySelector(".o-linjat"); if (ry) ry.classList.add("on-valittu");
        var al = app.querySelector('[data-act="aloita"]'); if (al) al.disabled = false;
        var vh = document.getElementById("linja-vihje"); if (vh) vh.style.visibility = "hidden";
        break;
      case "aloita":
        if (onLinjat() && !S.linja) return;
        kirjaaMukaan();
        siirtyma("eteen", function () { S.aloitettu = true; S.nakyma = omat()[0]; tallenna(); renderOsallistuja(); window.scrollTo(0, 0); });
        break;
      case "siirry":
        var sv = t.dataset.v === "loppu" || t.dataset.v === "vertailu" || t.dataset.v === "alku" ? t.dataset.v : +t.dataset.v;
        if (sv === S.nakyma) { window.scrollTo({ top: 0, behavior: "smooth" }); break; }
        vaihdaNakyma(sv); kiinnostavat().forEach(haeKoonti); break;
      case "valitse":
        if (S.lukittu[i]) return;
        S.vastaukset[i] = S.vastaukset[i] || {}; S.vastaukset[i][+t.dataset.q] = +t.dataset.o; tallenna(); renderOsallistuja(); break;
      case "kaveri":
        var kv = +t.dataset.v, vanhaK = S.kaveri;
        S.kaveri = vanhaK === kv ? null : kv;
        if (!JT && koontiTila()) {
          var mk = { L: { kaveri: {} } };
          if (vanhaK != null) mk.L.kaveri[vanhaK] = -1;
          if (S.kaveri != null) mk.L.kaveri[S.kaveri] = 1;
          S.kirjattu.L.kaveri = S.kaveri; if (S.kaveri == null) delete S.kirjattu.L.kaveri;
          kirjaaLoppu(mk);
        }
        tallenna(); renderOsallistuja(); break;
      case "lukitse":
        if (!S.kirjattu.v) S.kirjattu.v = {};
        if (!JT && !S.kirjattu.v[i] && koontiTila() && Y.koontiLisaa) { S.kirjattu.v[i] = true; Y.koontiLisaa("v" + i, { m: 1 }).catch(function () { S.kirjattu.v[i] = false; tallenna(); }); }
        S.lukittu[i] = true; S.porukkaNahty[i] = true; tallenna();
        if (kierrosTila()) {
          var keskenL = kierrosOf(i).filter(function (j) { return !S.lukittu[j]; });
          vaihdaNakyma(keskenL.length ? keskenL[0] : kierrosOf(i)[0]);
          haeKoonti(i); break;
        }
        paljastaKuplat = i; renderOsallistuja(); paljastaKuplat = null; haeKoonti(i);
        var kentta = document.getElementById("sana-" + i); if (kentta) kentta.scrollIntoView({ block: "center" });
        break;
      case "paljasta": paljasta(i); break;
      case "p-testattu":
        store.set(KEY + "-testattu", !store.get(KEY + "-testattu", false)); renderOhjaus(); break;
      case "p-tyhjenna":
        if (!tyhjennysVarma) { tyhjennysVarma = true; renderOhjaus(); return; }
        tyhjennysVarma = false; t.disabled = true;
        window.VTData.tyhjennaVastaukset(T.id).then(function () {
          jaetut = {}; store.set(KEY + "-jaetut", jaetut); kasin = {}; store.set(KEY + "-kasin", kasin);
          koonti = {}; saannotOk = null; vastausDocs = []; laheta(); renderOhjaus();
        }, function () { t.disabled = false; alert("Tyhjennys epäonnistui. Kokeile hallinnasta."); });
        break;
      case "p-kirjaudu":
        var em = (document.getElementById("k-email").value || "").trim(), pw = document.getElementById("k-salasana").value || "", ve = document.getElementById("k-virhe");
        t.disabled = true; t.textContent = "Kirjaudutaan…";
        Y.kirjaudu(em, pw).then(function () {
          if (!onJuontaja()) { ve.hidden = false; ve.textContent = "Tunnus ei ole juontajan tunnus."; t.disabled = false; t.textContent = "Kirjaudu"; }
        }, function () { ve.hidden = false; ve.textContent = "Kirjautuminen ei onnistunut. Tarkista sähköposti ja salasana."; t.disabled = false; t.textContent = "Kirjaudu"; });
        break;
      case "p-ulos":
        if (Y) Y.ulos().then(reitti); break;
      case "oma-lisaa":
        var oi = document.getElementById("oma-" + i);
        if (oi && lisaaOma(i, oi.value)) { var uo = omatAromit(i)[omatAromit(i).length - 1], om = {}; om[avainT(uo)] = { t: uo, d: 1 }; kirjaaKoonti(i, null, om); vastattu(i); tallenna(); renderOsallistuja(); var n2 = document.getElementById("oma-" + i); if (n2) n2.focus(); }
        else if (oi) { oi.select(); }
        break;
      case "aromit-kiinni":
        var keskenK = document.getElementById("oma-" + i);
        if (keskenK && keskenK.value.trim() && lisaaOma(i, keskenK.value)) { var uoK = omatAromit(i)[omatAromit(i).length - 1], omK = {}; omK[avainT(uoK)] = { t: uoK, d: 1 }; kirjaaKoonti(i, null, omK); vastattu(i); }
        var ekaKerta = !S.porukkaNahty[i];
        if (!S.kirjattu.v) S.kirjattu.v = {};
        if (!JT && !S.kirjattu.v[i] && koontiTila() && Y.koontiLisaa) { S.kirjattu.v[i] = true; Y.koontiLisaa("v" + i, { m: 1 }).catch(function () { S.kirjattu.v[i] = false; tallenna(); }); }
        siirtyma("kiinni", function () {
          S.aromiKiinni[i] = true; S.porukkaNahty[i] = true; tallenna();
          if (ekaKerta) paljastaKuplat = i;
          renderOsallistuja(); paljastaKuplat = null;
          vieNakyviin(app.querySelector("#porukka-" + i) || app.querySelector(".o-aromit-kiinni"), 16);
        });
        haeKoonti(i);
        break;
      case "aromit-auki":
        siirtyma("kiinni", function () {
          S.aromiKiinni[i] = false; tallenna(); renderOsallistuja();
          vieNakyviin(app.querySelector(".o-vt-aromit"), 16);
        });
        break;
      case "oma-pois":
        if (lukossa(i)) return;
        var lo = omatAromit(i).slice(), pois = lo.splice(+t.dataset.j, 1)[0]; S.omaAromi[i] = lo;
        if (pois) { var om2 = {}; om2[avainT(pois)] = { t: pois, d: -1 }; kirjaaKoonti(i, null, om2); }
        tallenna(); renderOsallistuja(); break;
      case "seuraava":
        var ii = +t.dataset.i, kesken = document.getElementById("oma-" + ii);
        if (kesken && kesken.value.trim() && lisaaOma(ii, kesken.value)) { var uo2 = omatAromit(ii)[omatAromit(ii).length - 1], om3 = {}; om3[avainT(uo2)] = { t: uo2, d: 1 }; kirjaaKoonti(ii, null, om3); }
        if (!S.lukittu[ii] && (S.arviot[ii] != null || (S.aromit[ii] || []).length || omatAromit(ii).length)) { S.lukittu[ii] = true; S.paljastettu[ii] = true; }
        var seurNak = t.dataset.v === "loppu" || t.dataset.v === "vertailu" ? t.dataset.v : +t.dataset.v;
        if (JT) { var seurDia = jtDiat(seurNak)[0]; if (seurDia != null && seurDia !== dia) { dia = seurDia; store.set(KEY + "-juontaja", dia); laheta(); } }
        vaihdaNakyma(seurNak);
        kiinnostavat().forEach(haeKoonti); break;
      case "kuva-iso":
        var ov = document.createElement("div"); ov.className = "o-kuva-iso"; ov.setAttribute("role", "dialog");
        ov.innerHTML = '<img alt="" src="' + t.getAttribute("src") + '"><span>Sulje napauttamalla</span>';
        ov.addEventListener("click", function () { ov.remove(); }); document.body.appendChild(ov); break;
      case "aromi":
        if (lukossa(i)) return;
        vastattu(i);
        var va = S.aromit[i] || [], ao = +t.dataset.o, ix = va.indexOf(ao);
        var muutos = {}; muutos[ao] = ix >= 0 ? -1 : 1; kirjaaKoonti(i, muutos, null);
        if (ix >= 0) va.splice(ix, 1); else { va.push(ao); poppaa = "a-" + i + "-" + ao; }
        S.aromit[i] = va; tallenna(); renderOsallistuja(); break;
      case "tahti":
        if (lukossa(i)) return;
        vastattu(i);
        S.arviot[i] = +t.dataset.v; kirjaaTahti(i, S.arviot[i]); poppaa = "t-" + i; tallenna(); renderOsallistuja(); break;
      case "l-valitse":
        if (S.loppu.lukittu) return;
        S.loppu.v[t.dataset.id] = +t.dataset.o; tallenna(); renderOsallistuja(); break;
      case "l-lukitse":
        S.loppu.lukittu = true; kirjaaLopuksi(); tallenna(); renderOsallistuja(); window.scrollTo(0, 0); haeKoonti("loppu"); break;
      case "p-kasin":
        var ka = kasin[t.dataset.k] || [], o2 = +t.dataset.o, nyt = luvut(t.dataset.k, 40)[o2] || 0;
        if (+t.dataset.d < 0 && nyt <= 0) return;
        ka[o2] = (ka[o2] || 0) + (+t.dataset.d); kasin[t.dataset.k] = ka; store.set(KEY + "-kasin", kasin); livePaivitys(); renderOhjaus(); break;
      case "p-live":
        store.set(KEY + "-live", store.get(KEY + "-live", true) === false); livePaivitys(); renderOhjaus(); break;
      case "p-jaa":
        if (t.dataset.d != null) { dia = +t.dataset.d; store.set(KEY + "-juontaja", dia); }
        var dNyt = diat()[dia];
        diaAvaimet(dNyt).forEach(function (x) { jaetut[x.avain] = luvut(x.avain, x.vaihtoehdot.length); });
        if (dNyt && dNyt.k === "paljastus") jaetut["o" + dNyt.i] = omatHavainnot(dNyt.i);
        store.set(KEY + "-jaetut", jaetut); laheta(); renderOhjaus(); break;
      case "p-piilota":
        var dPois = diat()[t.dataset.d != null ? +t.dataset.d : dia];
        diaAvaimet(dPois).forEach(function (x) { delete jaetut[x.avain]; });
        if (dPois && dPois.k === "paljastus") delete jaetut["o" + dPois.i];
        store.set(KEY + "-jaetut", jaetut); laheta(); renderOhjaus(); break;
      case "arvio":
        S.arviot[i] = +t.dataset.v; tallenna(); renderOsallistuja(); break;
      case "kopioi": kopioi(viinilistaTeksti(), "kopio-tila", "kopio-teksti", "Viinilista kopioitu. Liitä se vaikka muistiinpanoihin."); break;
      case "lahja-valinta":
        S.lahja.valinta = t.dataset.v; tallenna(); tallennaLahjaTalteen(); renderOsallistuja();
        var kortti = document.getElementById("lahjakortti"); if (kortti) kortti.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      case "lahja-kopioi": kopioi(lahjaViesti(), "lahja-tila", "lahja-teksti", "Viesti kopioitu. Liitä se haluamaasi sovellukseen."); break;
      case "lahja-jaa":
        try { navigator.share({ text: lahjaViesti() }).catch(function () {}); } catch (err) {}
        break;
      case "alkuun":
        siirtyma("taakse", function () { S.aloitettu = false; tallenna(); renderOsallistuja(); window.scrollTo(0, 0); });
        break;
      case "tyhjenna-esikatselu":
        S = uusiTila(); tallenna(); renderOsallistuja(); window.scrollTo(0, 0); break;
      case "tyhjenna":
        if (!tyhjennysVarmistus) { tyhjennysVarmistus = true; t.textContent = "Varmasti? Vastaukset ja muistiinpanot poistuvat. Paina uudelleen."; return; }
        tyhjennysVarmistus = false; peruKirjaukset(); var lahjaTalteen = S.lahja; S = uusiTila(); if (lahjaTalteen) S.lahja = lahjaTalteen; if (JT) { S.aloitettu = true; S.nakyma = "alku"; if (onLinjat()) S.linja = "viini"; } tallenna(); renderOsallistuja(); window.scrollTo(0, 0); break;
      case "j-ed": case "j-seur":
        siirraDia(act === "j-ed" ? -1 : 1);
        if (JT) { var jn = jtNakymaDialle(dia); if (jn !== S.nakyma) { S.nakyma = jn; tallenna(); renderOhjaus(); window.scrollTo(0, 0); } }
        break;
      case "jt-paneeli": jtPaneeliAuki = !jtPaneeliAuki; renderOhjaus(); break;
      case "p-nykyinen": var jn2 = jtNakymaDialle(dia); jtPaneeliAuki = false; S.nakyma = jn2; tallenna(); renderOhjaus(); window.scrollTo(0, 0); break;
      case "p-nayta": asetaDia(+t.dataset.v); break;
      case "p-vierita": vieritaDiaan(+t.dataset.v); break;
      case "j-teema": vaihdaTeema(); break;
      case "o-teema": S.teema = osallistujaTeema() === "ilta" ? "vaalea" : "ilta"; tallenna(); renderOsallistuja(); break;
      case "p-hyppaa": var ohj = t.closest("details"); if (ohj) ohj.open = false; ohjelmaAuki = false; vieritaDiaan(+t.dataset.v); break;
      case "p-iso": naytaIsona(t.dataset.v, t.dataset.i == null ? null : +t.dataset.i); break;
      case "p-sulje": t.hidden = true; break;
      case "j-koko":
        try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () {}); } catch (err) {}
        break;
      case "tulosta": try { window.print(); } catch (err) {} break;
    }
  });

  function normalisoi(s) { return String(s || "").trim().toLowerCase(); }
  function paljasta(i) {
    var w = T.viinit[i];
    if (T.kaytaPaljastussanaa) {
      var k = document.getElementById("sana-" + i);
      if (normalisoi(k && k.value) !== normalisoi(w.paljastussana)) {
        var v = document.getElementById("virhe-" + i); if (v) v.hidden = false;
        return;
      }
    }
    S.paljastettu[i] = true; tallenna(); renderOsallistuja(); window.scrollTo(0, 0);
  }

  function kopioi(teksti, tilaId, taId, valmis) {
    var tila = document.getElementById(tilaId);
    function nayta() {
      var ta = document.getElementById(taId);
      ta.value = teksti; ta.hidden = false; ta.focus(); ta.select();
      tila.textContent = "Kopioi teksti tästä kentästä.";
    }
    try {
      navigator.clipboard.writeText(teksti).then(function () { tila.textContent = valmis; }, nayta);
    } catch (e) { nayta(); }
  }

  app.addEventListener("input", function (e) {
    var t = e.target;
    if (t.dataset.muistiinpano != null) { S.muistiinpanot[+t.dataset.muistiinpano] = t.value; tallenna(); }
    if (t.dataset.lahja != null && S.lahja) { S.lahja[t.dataset.lahja] = t.value; tallenna(); paivitaJako(); }
  });
  app.addEventListener("keydown", function (e) {
    var t = e.target;
    if (e.key === "Enter" && t.dataset.sana != null) { e.preventDefault(); paljasta(+t.dataset.sana); }
    if (e.key === "Enter" && t.dataset.omaInput != null) { e.preventDefault(); var ob = app.querySelector('[data-act="oma-lisaa"][data-i="' + t.dataset.omaInput + '"]'); if (ob) ob.click(); }
    if (e.key === "Enter" && t.id === "nimimerkki") { e.preventDefault(); app.querySelector('[data-act="aloita"]').click(); }
    if (e.key === "Enter" && t.id === "j-osoite") { e.preventDefault(); tallennaOsoite(t.value); }
    if (e.key === "Enter" && t.id === "k-salasana") { e.preventDefault(); app.querySelector('[data-act="p-kirjaudu"]').click(); }
  });
  app.addEventListener("change", function (e) { if (e.target.id === "j-osoite") tallennaOsoite(e.target.value); });
  function tallennaOsoite(v) { v = (v || "").trim(); if (!v) return; if (!/^https?:\/\//.test(v)) v = "https://" + v; store.set("vt-osoite", v); reitti(); }

  document.addEventListener("keydown", function (e) {
    if (!juontajaReitti() || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); siirraDia(1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); siirraDia(-1); }
  });
  var edellinenTila = null;
  window.addEventListener("resize", function () {
    if (location.hash === "#juontaja" && juontajaTila() !== edellinenTila) { reitti(); return; }
    skaalaa();
  });
  window.addEventListener("hashchange", function () { reitti(); window.scrollTo(0, 0); });
  reitti();
  alustaYhteys();
})();
