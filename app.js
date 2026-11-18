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
  function uusiTila() { return { nimi: "", linja: null, loppu: { v: {}, lukittu: false }, aromit: {}, aloitettu: false, nakyma: 0, vastaukset: {}, lukittu: {}, paljastettu: {}, arviot: {}, muistiinpanot: {} }; }
  var S = store.get(KEY, null) || uusiTila();
  if (!S.loppu) S.loppu = { v: {}, lukittu: false };
  if (!S.aromit) S.aromit = {};
  var jaetut = store.get(KEY + "-jaetut", {});
  var kasin = store.get(KEY + "-kasin", {});
  function tallenna() { store.set(KEY, S); asetaPresence(); }

  function onSokko(w) { return w.sokko !== false; }
  function onAuki(i) { return !onSokko(T.viinit[i]) || !!S.paljastettu[i]; }
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
  function keskiarvoLista(indeksit, omat) {
    return '<ul class="o-keskiarvot">' + indeksit.map(function (i) {
      var j = jaetut["t" + i], ka = j ? keskiarvo(j) : null, oma = omat ? S.arviot[i] : null;
      return "<li><span>Lasi " + nro(i) + " · " + esc(lyhytNimi(i)) + (oma != null ? ' <span class="o-vaimea" style="display:inline">(sinä ' + oma + ")</span>" : "") + "</span>" +
        "<b>" + (ka == null ? "–" : "★ " + desi(ka)) + "</b>" +
        '<span class="pk-palkki"><i style="width:' + (ka == null ? 0 : Math.round(ka * 20)) + '%"></i></span></li>';
    }).join("") + "</ul>";
  }
  function summa(a) { var s = 0; (a || []).forEach(function (n) { s += n; }); return s; }
  function palkit(vaihtoehdot, luvut, oikea, oma) {
    var s = summa(luvut);
    return '<ul class="pk">' + vaihtoehdot.map(function (v, o) {
      var n = luvut[o] || 0, pros = s ? Math.round(100 * n / s) : 0;
      return '<li class="' + (o === oma ? "on-oma " : "") + (o === oikea ? "on-oikea" : "") + '"><span class="pk-teksti">' + (o === oikea ? "✓ " : "") + esc(v) +
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
  function renderOsallistuja() {
    document.documentElement.dataset.theme = "vaalea";
    document.body.className = "osallistuja";
    if (!S.aloitettu) { app.innerHTML = aloitus(); return; }
    if (S.nakyma !== "loppu" && S.nakyma !== "vertailu" && !onOma(S.nakyma)) S.nakyma = omat()[0];
    if (S.nakyma === "vertailu" && !lopuksi().length) S.nakyma = "loppu";
    var sisalto = S.nakyma === "loppu" ? yhteenveto() : S.nakyma === "vertailu" ? vertailuNakyma() : viiniNakyma(S.nakyma);
    app.innerHTML = '<main class="o-kehys">' + ylapalkki() + sisalto + "</main>";
  }

  function ylapalkki() {
    var tabit = omat().map(function (i) {
      var w = T.viinit[i], valmis = onAuki(i) && onSokko(w);
      return '<li><button class="o-tab' + (valmis ? " o-tab--valmis" : "") + '" data-act="siirry" data-v="' + i + '" aria-current="' + (S.nakyma === i) + '" aria-label="' + iso(sana(w)) + " " + nro(i) + '">' + nro(i) + "</button></li>";
    }).join("");
    if (lopuksi().length) tabit += '<li><button class="o-tab o-tab--loppu' + (S.loppu.lukittu ? " o-tab--valmis" : "") + '" data-act="siirry" data-v="vertailu" aria-current="' + (S.nakyma === "vertailu") + '">Lopuksi</button></li>';
    tabit += '<li><button class="o-tab o-tab--loppu" data-act="siirry" data-v="loppu" aria-current="' + (S.nakyma === "loppu") + '">Yhteenveto</button></li>';
    return '<header class="o-yla">' + logo(T.logo, "logo") + '<span class="o-yla__nimi">' + esc(T.nimi) + "</span></header>" +
      '<nav aria-label="Viinit"><ul class="o-tabit">' + tabit + "</ul></nav>";
  }

  function aloitus() {
    return '<main class="o-kehys"><section class="o-osio" style="padding-top:var(--vali-6)">' +
      logo(T.logo, "logo") +
      '<p class="o-display">tervetuloa</p>' +
      '<div><h1 class="o-h1">' + esc(T.nimi) + '</h1><p class="o-vaimea" style="margin-top:var(--vali-2)">Juontajana ' + esc(T.juontaja) + "</p></div>" +
      '<p class="o-ingressi">' + esc(T.kuvaus) + "</p>" +
      '<div><label class="o-label" for="nimimerkki">Nimimerkki (vapaaehtoinen)</label>' +
      '<input class="o-kentta" id="nimimerkki" autocomplete="nickname" maxlength="30" value="' + esc(S.nimi) + '"></div>' +
      (onLinjat() ? '<div><span class="o-label">Mitä maistat?</span><div class="o-linjat" role="group" aria-label="Mitä maistat?">' +
        '<button class="o-linja" data-act="linja" data-v="viini" aria-pressed="' + (S.linja === "viini") + '">Kuohuviinit<small>' + linjanViinit("viini").length + ' kuohuviiniä</small></button>' +
        '<button class="o-linja o-linja--alk" data-act="linja" data-v="alkoholiton" aria-pressed="' + (S.linja === "alkoholiton") + '">Alkoholittomat<small>' + linjanViinit("alkoholiton").length + ' alkoholitonta</small></button>' +
        "</div></div>" : "") +
      '<button class="vt-painike vt-painike--leveä" data-act="aloita"' + (onLinjat() && !S.linja ? " disabled" : "") + '>Aloita</button>' +
      (onLinjat() && !S.linja ? '<p class="o-vaimea">Valitse ensin kuohuviinit tai alkoholittomat.</p>' : "") +
      (lahjaKaytossa() ? '<p class="o-vaimea">Lopussa odottaa ' + T.lahjakortti.arvo + ' € kiitoslahja.</p>' : "") +
      '<p class="o-vaimea">Ei sovellusta, ei kirjautumista. Aromisi, tähtesi ja loppuvastauksesi lähtevät nimettöminä juontajan yhteenvetoon. Muistiinpanot jäävät vain tähän puhelimeen.</p>' +
      "</section>" +
      (T.naytaJuontajaLinkki ? '<p class="o-alatunniste"><a class="vt-linkki" href="#juontaja">Juontajalle</a></p>' : "") +
      "</main>";
  }

  function maistelu(i) {
    var lukittu = !!S.lukittu[i], valitut = S.aromit[i] || [], t = S.arviot[i];
    var chipit = aromit(i).map(function (a, o) {
      return '<button class="o-aromi" data-act="aromi" data-i="' + i + '" data-o="' + o + '" aria-pressed="' + (valitut.indexOf(o) >= 0) + '"' + (lukittu ? " disabled" : "") + ">" + esc(a) + "</button>";
    }).join("");
    var tahdet = '<button class="o-tahti o-tahti--nolla" data-act="tahti" data-i="' + i + '" data-v="0" aria-pressed="' + (t === 0) + '" aria-label="0 tähteä"' + (lukittu ? " disabled" : "") + ">0</button>";
    for (var k = 1; k <= 5; k++) tahdet += '<button class="o-tahti" data-act="tahti" data-i="' + i + '" data-v="' + k + '" aria-pressed="' + (t != null && k <= t) + '" aria-label="' + k + ' tähteä"' + (lukittu ? " disabled" : "") + ">★</button>";
    return '<fieldset class="o-kysymys"><legend>Mitä aromeja löydät?</legend><p class="o-vaimea" style="clear:both;margin-bottom:var(--vali-3)">Valitse kaikki, jotka löydät.</p><div class="o-aromit">' + chipit + "</div></fieldset>" +
      '<fieldset class="o-kysymys"><legend>Montako tähteä annat?</legend><div class="o-tahdet">' + tahdet + '</div><p class="o-vaimea" style="margin-top:var(--vali-2)">0 = ei maistu, 5 = loistava</p></fieldset>';
  }

  var kuvaVarasto = {};
  function kuvaTag(polku, luokka) {
    var src = kuvaVarasto[polku];
    return '<img class="' + luokka + '" data-kuva="' + esc(polku) + '" alt=""' + (src ? ' src="' + src + '"' : "") + ">";
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
        if (!src || !/^data:image\//.test(src)) return;
        kuvaVarasto[p] = src;
        Array.prototype.forEach.call(document.querySelectorAll('img[data-kuva="' + p + '"]'), function (x) { x.src = src; });
      }, function () { delete kuvaVarasto[p]; });
    });
  }
  new MutationObserver(function () { taytaKuvat(); }).observe(document.getElementById("app"), { childList: true, subtree: true });
  function viiniKortti(w) {
    var tiedot = [["Tuottaja", w.tuottaja], ["Alue", w.alue], ["Maa", w.maa], ["Rypäleet", w.rypaleet]]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("");
    return '<article class="vt-kortti o-viini">' + tyyppi(w) +
      '<h2 class="o-viini__nimi">' + esc(w.nimi) + "</h2>" +
      '<dl class="o-tiedot">' + tiedot + "</dl>" +
      (w.tarina ? "<p>" + esc(w.tarina) + "</p>" : "") +
      kuvaGalleria(w) +
      (w.maistele ? "<h3>Kiinnitä huomiota</h3><p>" + esc(w.maistele) + "</p>" : "") +
      (w.ruoaksi ? "<h3>Ruoaksi</h3><p>" + esc(w.ruoaksi) + "</p>" : "") +
      "</article>";
  }

  function tulos(w, i) {
    var valitut = S.aromit[i] || [], j = jaetut["a" + i], t = S.arviot[i];
    var nimet = valitut.map(function (o) { return aromit(i)[o]; }).filter(Boolean);
    return '<div class="vt-kortti o-havainto"><h2 class="o-h2">Sinun havaintosi</h2>' +
      "<p>Tähdet: <b class=\"o-tahtirivi\">" + tahtiTeksti(t || 0) + "</b> " + (t == null ? "ei annettu" : t + "/5") + "</p>" +
      "<p>Aromit: <b>" + (nimet.length ? esc(nimet.join(", ")) : "ei valittuja") + "</b></p>" +
      (j ? '<div class="o-jakauma"><span class="o-jakauma__otsikko">Koko porukan aromit</span>' + palkitMoni(aromit(i), j, valitut) + "</div>"
         : '<p class="o-vaimea">Koko porukan aromit tulevat tähän, kun juontaja jakaa ne. Tähtien tulokset näytetään lopuksi.</p>') +
      "</div>";
  }

  function arvio(i) {
    return '<div><label class="o-label" for="muistiinpano-' + i + '">Omat muistiinpanot</label>' +
      '<textarea class="o-kentta" id="muistiinpano-' + i + '" data-muistiinpano="' + i + '" placeholder="Mitä maistoit? Ostaisitko tämän?">' + esc(S.muistiinpanot[i] || "") + "</textarea></div>";
  }

  function viiniNakyma(i) {
    var w = T.viinit[i], sokko = onSokko(w);
    var h = '<section class="o-osio"><div class="o-rivi"><span class="vt-pallo">' + nro(i) + "</span>" + tyyppi(w, !onAuki(i)) + "</div>";
    if (!onAuki(i)) {
      h += '<h1 class="o-h1">' + iso(sana(w)) + " " + nro(i) + '</h1><p class="o-ingressi">Haistele ja maistele. Juontaja paljastaa ' + (w.alkoholiton ? "juoman" : "viinin") + ', kun kaikki ovat vastanneet.</p>';
      h += maistelu(i);
      if (!S.lukittu[i]) {
        var valmis = S.arviot[i] != null;
        h += '<button class="vt-painike vt-painike--leveä" data-act="lukitse" data-i="' + i + '"' + (valmis ? "" : " disabled") + ">Lukitse vastaukset</button>";
        if (!valmis) h += '<p class="o-vaimea">Anna tähdet, niin voit lukita vastauksesi.</p>';
      } else if (T.kaytaPaljastussanaa) {
        h += '<div class="vt-vinkki o-odota"><span class="vt-vinkki__nimi">Vastaukset lukittu</span>' +
          "<p>Kun juontaja kertoo paljastussanan, kirjoita se tähän.</p>" +
          '<label class="o-label" for="sana-' + i + '">Paljastussana</label>' +
          '<input class="o-kentta" id="sana-' + i + '" data-sana="' + i + '" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="go">' +
          '<p class="o-virhe" id="virhe-' + i + '" role="alert" hidden>Sana ei täsmää. Kuuntele juontajaa ja kokeile uudelleen.</p>' +
          '<button class="vt-painike vt-painike--leveä" data-act="paljasta" data-i="' + i + '">Paljasta viini</button></div>';
      } else {
        h += '<div class="vt-vinkki o-odota"><span class="vt-vinkki__nimi">Vastaukset lukittu</span><p>Avaa viini, kun juontaja paljastaa sen.</p>' +
          '<button class="vt-painike vt-painike--leveä" data-act="paljasta" data-i="' + i + '">Paljasta viini</button></div>';
      }
    } else {
      if (sokko) h += tulos(w, i);
      h += viiniKortti(w) + arvio(i);
      var om = omat(), seur = om[om.indexOf(i) + 1];
      var loppuun = lopuksi().length ? "vertailu" : "loppu";
      h += '<button class="vt-painike vt-painike--leveä" data-act="siirry" data-v="' + (seur == null ? loppuun : seur) + '">' + (seur == null ? (lopuksi().length ? "Lopuksi" : "Yhteenveto") : "Seuraava " + sana(w)) + "</button>";
    }
    return h + "</section>";
  }

  function vertailuNakyma() {
    var l = S.linja || "viini", L = S.loppu, vv = lVaihtoehdot(l);
    var h = '<section class="o-osio"><h1 class="o-h1">Lopuksi</h1>';
    if (!L.lukittu) {
      h += '<p class="o-ingressi">Mieti kaikkia kolmea lasia yhdessä. Voit maistaa vielä uudelleen.</p>';
      h += lopuksi().map(function (q) {
        var napit = vv.map(function (v, o) {
          return '<button class="o-vaihtoehto" data-act="l-valitse" data-id="' + esc(q.id) + '" data-o="' + o + '" aria-pressed="' + (L.v[q.id] === o) + '">' + esc(v) + "</button>";
        }).join("");
        return '<fieldset class="o-kysymys"><legend>' + esc(q.kysymys) + '</legend><div class="o-vaihtoehdot o-vaihtoehdot--yksi">' + napit + "</div></fieldset>";
      }).join("");
      var valmis = lopuksi().every(function (q) { return L.v[q.id] != null; });
      h += '<button class="vt-painike vt-painike--leveä" data-act="l-lukitse"' + (valmis ? "" : " disabled") + ">Lukitse ja katso tulokset</button>";
      if (!valmis) h += '<p class="o-vaimea">Vastaa kaikkiin, niin voit lukita vastaukset.</p>';
    } else {
      var ok = 0, pk = 0, jaettuja = 0;
      var rivit = lopuksi().map(function (q) {
        var v = L.v[q.id], o = lOikea(q, l), j = jaetut[lAvain(q.id, l)], f = lFakta(q, l);
        var r = "<li>" + esc(q.kysymys);
        if (o != null) {
          pk++;
          if (v === o) ok++;
          r += "<b>" + esc(vv[o]) + "</b>" + (v === o ? 'Sinun vastauksesi <span class="o-merkki o-merkki--oikein">Oikein</span>'
            : "Sinun vastauksesi: " + esc(v == null ? "ei vastausta" : vv[v]) + ' <span class="o-merkki o-merkki--vaarin">Väärin</span>');
        } else {
          r += '<b class="o-oma">Sinä: ' + esc(v == null ? "ei vastausta" : vv[v]) + "</b>";
        }
        if (f) r += '<span class="o-fakta">' + esc(f) + "</span>";
        if (j) { jaettuja++; r += '<div class="o-jakauma"><span class="o-jakauma__otsikko">Koko porukka · ' + summa(j) + " vastausta</span>" + palkit(vv, j, o, v) + "</div>"; }
        return r + "</li>";
      }).join("");
      if (pk) h += '<div class="o-tulos"><span class="o-tulos__luku">' + ok + "/" + pk + '</span><span class="o-tulos__teksti">oikein vertailussa</span></div>';
      h += '<ul class="o-vastaukset">' + rivit + "</ul>";
      if (!jaettuja) h += '<p class="o-vaimea">Koko porukan vastaukset tulevat tähän, kun juontaja jakaa ne.</p>';
      if (omat().some(function (i) { return jaetut["t" + i]; })) h += '<div><h2 class="o-h2">Tähtien keskiarvot</h2>' + keskiarvoLista(omat(), true) + "</div>";
    }
    h += '<button class="vt-painike vt-painike--toissijainen vt-painike--leveä" data-act="siirry" data-v="loppu">Yhteenveto</button>';
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
    function rivi(i) {
      var w = T.viinit[i], auki = nakyvissa(i), oma = onOma(i), a = oma ? S.arviot[i] || 0 : 0;
      var merkki = w.alkoholiton ? '<span class="o-alk-merkki">Alkoholiton</span>' : "";
      return "<li" + (w.alkoholiton ? ' class="o-alk"' : "") + '><span class="vt-pallo">' + nro(i) + "</span><div>" +
        (auki ? "<b>" + esc(w.nimi) + "</b>" + merkki + "<span>" + esc([w.alue, w.maa].filter(Boolean).join(", ")) + (oma && S.arviot[i] != null ? " · sinä ★ " + S.arviot[i] : "") + (jaetut["t" + i] && keskiarvo(jaetut["t" + i]) != null ? " · porukka ★ " + desi(keskiarvo(jaetut["t" + i])) : "") + "</span>" +
                (oma && S.muistiinpanot[i] ? "<span>" + esc(S.muistiinpanot[i]) + "</span>" : "") +
                (oma && paras > 0 && a === paras ? '<span class="o-suosikki">Suosikkisi</span>' : "")
              : "<b>" + iso(sana(w)) + " " + nro(i) + "</b>" + merkki + "<span>Ei vielä paljastettu</span>") +
        "</div></li>";
    }
    var lista;
    if (onLinjat()) {
      var muu = S.linja === "alkoholiton" ? "viini" : "alkoholiton";
      var ryhma = function (l, oma) {
        return '<h3 class="o-ryhma' + (l === "alkoholiton" ? " o-ryhma--alk" : "") + '">' + (l === "alkoholiton" ? "Alkoholittomat" : "Kuohuviinit") + (oma ? " · sinun lasisi" : "") + "</h3>" +
          '<ul class="o-lista">' + linjanViinit(l).map(rivi).join("") + "</ul>";
      };
      lista = ryhma(S.linja || "viini", true) + ryhma(muu, false);
    } else {
      lista = '<ul class="o-lista">' + T.viinit.map(function (w, i) { return rivi(i); }).join("") + "</ul>";
    }
    var otsikko = S.nimi ? "Kiitos, " + esc(S.nimi) : "Kiitos illasta";
    var h = '<section class="o-osio"><h1 class="o-h1">' + otsikko + "</h1>";
    if (p.kaikki) {
      h += '<div class="o-tulos"><span class="o-tulos__luku">' + p.oikein + "/" + p.kaikki + '</span><span class="o-tulos__teksti">oikein sokkovisassa' +
        (p.yht < p.kaikki ? "<br>" + (p.kaikki - p.yht) + " kysymystä vielä paljastamatta" : "") + "</span></div>";
    }
    var lahja = lahjaKaytossa();
    if (lahja) h += lahjaOsio();
    h += arvioPyynto();
    h += '<div><h2 class="o-h2">' + (onLinjat() ? "Illan juomat" : "Illan viinit") + "</h2>" + lista + "</div>" +
      '<div><button class="vt-painike vt-painike--toissijainen vt-painike--leveä" data-act="kopioi">Kopioi viinilista</button>' +
      '<p class="o-vaimea" id="kopio-tila" role="status" style="margin-top:var(--vali-2)"></p>' +
      '<textarea class="o-kentta o-kopio" id="kopio-teksti" readonly hidden></textarea></div>';
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
    var h = '<div class="o-lahja"><span class="o-lahja__nimi">Kiitoslahja</span><span class="o-lahja__summa">' + L.arvo + " €</span>" +
      "<p>Saat " + L.arvo + " € alennuksen omasta tastingista. Käytä se itse tai anna kaverille lahjaksi.</p>" +
      '<div class="o-valinta" role="group" aria-label="Kenelle lahjakortti">' +
      '<button data-act="lahja-valinta" data-v="itse" aria-pressed="' + (l.valinta === "itse") + '">Käytän itse</button>' +
      '<button data-act="lahja-valinta" data-v="lahja" aria-pressed="' + (l.valinta === "lahja") + '">Annan lahjaksi</button></div></div>';
    if (!l.valinta) return h;
    var j = jakoLinkit(), lahjaksi = l.valinta === "lahja";
    h += '<div class="vt-kortti o-koodi" id="lahjakortti"><div><span class="o-koodi__nimi">Lahjakortin koodi</span>' +
      '<span class="o-koodi__koodi">' + esc(l.koodi) + '</span><span class="o-vaimea">Voimassa ' + pvm(l.voimassa) + " asti</span></div>";
    if (lahjaksi) {
      h += '<div><label class="o-label" for="l-kenelle">Kenelle? (etunimi, vapaaehtoinen)</label>' +
        '<input class="o-kentta" id="l-kenelle" data-lahja="kenelle" maxlength="40" autocomplete="off" value="' + esc(l.kenelle) + '"></div>' +
        '<div><label class="o-label" for="l-tervehdys">Oma tervehdys (vapaaehtoinen)</label>' +
        '<textarea class="o-kentta" id="l-tervehdys" data-lahja="tervehdys" maxlength="300" placeholder="Tämä pitää kokea porukalla.">' + esc(l.tervehdys) + "</textarea></div>";
    }
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
      (lahjaksi ? "" : '<a class="vt-painike vt-painike--leveä" href="' + esc(T.varausLinkki) + '" target="_blank" rel="noopener">Varaa tasting</a>') +
      '<p class="o-ehdot">Voimassa ' + pvm(l.voimassa) + " asti. Yksi lahjakortti tastingvarausta kohden. Kerro koodi varauksen yhteydessä. Ei vaihdeta rahaksi. Myöntäjä " + esc(L.myontaja) + ".</p></div>";
    return h;
  }
  function arvioPyynto() {
    var linkki = T.googleArvioLinkki;
    return '<div class="vt-kortti o-arviopyynto"><h2 class="o-h2">Oliko ilta mieleen?</h2>' +
      "<p>Kerro siitä Googlessa. Arvio auttaa muita löytämään tastingin.</p>" +
      (lahjaKaytossa() ? '<p class="o-vaimea">Kiitoslahja on sinun joka tapauksessa.</p>' : "") +
      (linkki ? '<a class="vt-painike vt-painike--toissijainen vt-painike--leveä" href="' + esc(linkki) + '" target="_blank" rel="noopener">Kirjoita arvio Googleen</a>'
              : '<button class="vt-painike vt-painike--toissijainen vt-painike--leveä" disabled>Google-linkki puuttuu</button><p class="o-ehdot">Lisää linkki asetukseen googleArvioLinkki.</p>') +
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
      T.viinit.forEach(function (w, i) { if (onSokko(w)) a.push({ k: "maistelu", i: i }); a.push({ k: "paljastus", i: i }); });
      if (lopuksi().length) { a.push({ k: "vertailu" }); a.push({ k: "vtulos", l: "viini" }); }
    }
    a.push({ k: "loppu" });
    return a;
  }

  function diaAvaimet(d) {
    if (!d) return [];
    if (d.k === "paljastus") {
      return [{ avain: "a" + d.i, kysymys: "Mitä aromeja löysit?", vaihtoehdot: aromit(d.i), oikea: null, fakta: "", moni: true }];
    }
    if (d.k === "vtulos") {
      var vv = lVaihtoehdot(d.l);
      return lopuksi().map(function (q) { return { avain: lAvain(q.id, d.l), kysymys: q.kysymys, vaihtoehdot: vv, oikea: lOikea(q, d.l), fakta: lFakta(q, d.l) }; })
        .concat(linjanViinit(d.l).map(function (i) { return { avain: "t" + i, kysymys: "★ Lasi " + nro(i) + " · " + lyhytNimi(i), vaihtoehdot: TAHDET, oikea: null, fakta: "", tahdet: true }; }));
    }
    return [];
  }
  function tulosKortit(d, luokka) {
    var X = diaAvaimet(d), kortit = [];
    X.filter(function (x) { return !x.tahdet; }).forEach(function (x) {
      var j = jaetut[x.avain];
      kortit.push('<div class="j-tulos"><b>' + esc(x.kysymys) + "</b>" +
        (j ? (x.moni ? palkitMoni(x.vaihtoehdot, j, null) : palkit(x.vaihtoehdot, j, x.oikea, null) + '<span class="j-tulos__n">' + summa(j) + " vastausta</span>")
           : x.oikea != null ? '<span class="j-tulos__oikea">✓ ' + esc(x.vaihtoehdot[x.oikea]) + "</span>"
           : '<span class="j-tulos__odota">Tulokset tulevat, kun juontaja jakaa ne.</span>') +
        (x.fakta ? '<span class="j-tulos__fakta">' + esc(x.fakta) + "</span>" : "") + "</div>");
    });
    if (d.k === "vtulos") kortit.push('<div class="j-tulos"><b>Tähtien keskiarvot</b>' + keskiarvoLista(linjanViinit(d.l), false) + "</div>");
    return '<div class="j-tulokset' + luokka + '" style="grid-template-columns:repeat(' + kortit.length + ', 1fr)">' + kortit.join("") + "</div>";
  }
  function renderJuontaja() {
    var D = diat();
    dia = Math.max(0, Math.min(dia, D.length - 1));
    var d = D[dia], url = osallistujaUrl(), h = "", luokka = "";
    var teema = store.get("vt-teema", "vaalea");
    document.documentElement.dataset.theme = teema;
    document.body.className = "juontaja";

    if (d.k === "kansi") {
      luokka = " j-lava--kansi";
      h = logo(T.logoValkoinen, "j-logo") +
        '<div class="j-palstat"><div class="j-palsta" style="justify-content:flex-end"><span class="j-ylatunniste">Juontajana ' + esc(T.juontaja) + "</span>" +
        '<p class="j-display" style="margin-top:calc(20 * var(--u))">tervetuloa</p><p class="j-ala">' + esc(T.nimi) + "</p></div>" +
        '<div class="j-palsta j-palsta--kapea" style="align-items:center;justify-content:flex-end">' + qrSvg(url, "j-qr") +
        (url ? '<div class="j-osoite">' + esc(lyhyt(url)) + '</div><div class="j-ala" style="margin-top:calc(8 * var(--u));font-size:calc(34 * var(--u))">Skannaa koodi puhelimella</div>'
             : '<label class="j-asetus">Liitä osallistujien osoite<input id="j-osoite" placeholder="https://…" value=""></label>') +
        "</div></div>";
    } else if (d.k === "maistelu") {
      var lasi = d.pari ? d.lasi : nro(d.i);
      h = '<div class="j-rivi"><span class="j-pallo">' + lasi + '</span><span class="j-ylatunniste">Lasi ' + lasi + "</span></div>" +
        '<h1 class="j-otsikko">Haistele, maistele, anna tähdet</h1><p class="j-ala">Valitse puhelimessa kaikki aromit, jotka löydät, ja anna 0–5 tähteä.</p>' +
        '<div class="j-aromit">' + (T.aromit || []).map(function (a) { return "<span>" + esc(a) + "</span>"; }).join("") + "</div>" +
        (url ? '<div class="j-qr-pieni"><span>Myöhästyitkö?<br>' + esc(lyhyt(url)) + "</span>" + qrSvg(url, "") + "</div>" : "");
    } else if (d.k === "paljastus") {
      var v = T.viinit[d.i];
      var meta = [v.tuottaja, [v.alue, v.maa].filter(Boolean).join(", "), v.rypaleet].filter(Boolean).map(esc).join(" · ");
      h = '<div class="j-otsake"><span class="j-pallo">' + nro(d.i) + '</span><div><h1 class="j-otsikko">' + esc(v.nimi) + "</h1>" +
        '<div class="j-meta">' + tyyppi(v) + "<span>" + meta + "</span></div></div></div>" +
        '<div class="j-tulokset" style="grid-template-columns:1.5fr 1fr">' +
          tulosKortit(d, "").replace(/^<div class="j-tulokset" style="[^"]*">/, "").replace(/<\/div>$/, "") +
          '<div class="j-tulos">' + ((v.kuvat || [])[0] ? kuvaTag(v.kuvat[0], "j-kuva") : "") + "<b>Kiinnitä huomiota</b><span class=\"j-huomio\">" + esc(v.maistele || "") + "</span></div></div>";
    } else if (d.k === "vertailu") {
      h = '<div class="j-rivi"><span class="j-ylatunniste">Lopuksi</span></div>' +
        '<h1 class="j-otsikko">Mieti kaikkia kolmea yhdessä</h1><p class="j-ala">Vastaa puhelimessa kohdassa Lopuksi ja lukitse vastauksesi.</p>' +
        '<ol class="j-kysymykset">' + lopuksi().map(function (q) { return "<li><b>" + esc(q.kysymys) + "</b></li>"; }).join("") + "</ol>";
    } else if (d.k === "vtulos") {
      var alk = d.l === "alkoholiton";
      h = '<div class="j-rivi"><span class="vt-tyyppi vt-tyyppi--kuohu' + (alk ? " vt-tyyppi--alkoholiton" : "") + '">' + (onLinjat() ? (alk ? "Alkoholittomat" : "Kuohuviinit") : "Viinit") + "</span></div>" +
        '<h1 class="j-otsikko" style="font-size:calc(76 * var(--u))">Illan tulokset</h1>' + tulosKortit(d, " j-tulokset--4");
    } else {
      luokka = " j-lava--loppu";
      var vihrea = teema === "ilta" ? T.logo : T.logoValkoinen;
      h = logo(vihrea, "j-logo") + '<div class="j-palstat"><div class="j-palsta">' +
        '<p class="j-display">kiitos</p><p class="j-ala">Yhteenveto, pisteet ja omat muistiinpanot jäävät puhelimeesi.</p>' +
        (lahjaKaytossa() ? '<p class="j-ala">Puhelimessasi odottaa ' + T.lahjakortti.arvo + ' € kiitoslahja. Käytä se itse tai anna kaverille.</p>' : "") +
        '<p class="j-ala" style="font-weight:800">Varaa oma tasting: ' + esc(lyhyt(T.varausLinkki)) + "</p></div></div>";
    }

    app.innerHTML = '<div class="j-kehys"><div class="j-lava' + luokka + '" id="lava">' + h + "</div></div>" +
      '<nav class="j-ohjaus" aria-label="Diojen ohjaus">' +
      '<button data-act="j-ed" aria-label="Edellinen dia">‹</button><span class="j-laskuri">' + (dia + 1) + " / " + D.length + "</span>" +
      '<button data-act="j-seur" aria-label="Seuraava dia">›</button>' +
      '<button data-act="j-teema">' + (teema === "ilta" ? "Vaalea" : "Ilta") + "</button>" +
      '<button data-act="j-koko">Koko näyttö</button>' +
      '<a href="#ohjaus">Puhelinohjaus</a><a href="#poytakortti">Pöytäkortti</a><a href="#">Osallistujan näkymä</a>' +
      '<span id="yhteys" data-luokka="j-chip"></span></nav>';
    skaalaa();
    paivitaYhteys();
  }
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
    omat().forEach(function (i) { if (S.lukittu[i]) v["v" + i] = { a: (S.aromit[i] || []).slice(0, 40), t: S.arviot[i] == null ? null : S.arviot[i] }; });
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
    if (!el) return;
    var ok = !!Y && yhteysTila === "yhdistetty", tila = juontajaTila();
    if (tila === "ohjaus") ok = ok && onJuontaja();
    el.className = el.dataset.luokka + (ok ? " on" : "");
    el.textContent = !Y ? "Paikallinen tila" : tila === "ohjaus" ? (ok ? "Yhdistetty · " + vastausDocs.length + " puhelinta" : onJuontaja() ? "Ei yhteyttä" : "Ei kirjautunut") : (ok ? "Yhdistetty" : "Ei yhteyttä");
    var ohje = document.getElementById("yhteys-ohje");
    if (ohje) ohje.hidden = ok;
  }
  function oikeatJaetut(x) {
    if (!x || typeof x !== "object" || Array.isArray(x)) return null;
    var o = {};
    Object.keys(x).forEach(function (k) {
      if (/^(a\d+|t\d+|L-[\w-]+)$/.test(k) && Array.isArray(x[k]) && x[k].length <= 40 &&
          x[k].every(function (n) { return typeof n === "number" && n >= 0 && n < 100000; })) o[k] = x[k];
    });
    return o;
  }
  var paivitysAjastin = null;
  function paivitaPian() {
    if (paivitysAjastin) return;
    paivitysAjastin = setTimeout(function () {
      paivitysAjastin = null;
      if (juontajaReitti()) { if (juontajaTila() === "ohjaus") renderOhjaus(); return; }
      var a = document.activeElement;
      if (a && (a.tagName === "TEXTAREA" || a.tagName === "INPUT")) return;
      if (location.hash.slice(1) !== "poytakortti") renderOsallistuja();
    }, 400);
  }
  function kuunteleVastaukset() {
    if (onJuontaja() && Y && !vastausKuuntelu) {
      vastausKuuntelu = Y.kuunteleVastaukset(function (lista) {
        vastausDocs = lista || [];
        paivitaYhteys();
        if (juontajaReitti() && juontajaTila() === "ohjaus") paivitaPian();
      }, function () { vastausKuuntelu = null; });
    } else if (!onJuontaja() && vastausKuuntelu) { vastausKuuntelu(); vastausKuuntelu = null; vastausDocs = []; }
  }
  function alustaYhteys() {
    if (!window.VTYhteys || !A.firebase || !A.firebase.apiKey) return;
    try { Y = window.VTYhteys(A.firebase, T.id, !!A.emulaattori); } catch (e) { Y = null; return; }
    Y.onKayttaja(function (u) {
      kayttaja = u;
      if (!u && !juontajaReitti()) Y.anonyymi().catch(function () {});
      viimeksiLahetetty = "";
      if (u) asetaPresence();
      kuunteleVastaukset();
      if (juontajaReitti()) reitti();
      paivitaYhteys();
    });
    Y.kuunteleTila(function (d) {
      yhteysTila = "yhdistetty";
      var muuttui = false;
      if (d) {
        if (typeof d.dia === "number" && juontajaReitti()) { dia = Math.max(0, Math.min(d.dia, diat().length - 1)); store.set(KEY + "-juontaja", dia); }
        if (d.teema === "ilta" || d.teema === "vaalea") store.set("vt-teema", d.teema);
        var uudet = oikeatJaetut(d.jaetut || {});
        if (uudet) { muuttui = JSON.stringify(uudet) !== JSON.stringify(jaetut); jaetut = uudet; store.set(KEY + "-jaetut", jaetut); }
      }
      if (juontajaReitti()) reitti(); else if (muuttui) paivitaPian();
      paivitaYhteys();
    }, function () { yhteysTila = "virhe"; paivitaYhteys(); });
  }

  /* ---------- Juontajan puhelinpaneeli ---------- */
  function diaNimi(d) {
    if (!d) return "";
    if (d.k === "kansi") return "Kansi ja QR-koodi";
    if (d.k === "loppu") return "Kiitos ja kiitoslahja";
    if (d.k === "vertailu") return "Lopuksi · kysymykset";
    if (d.k === "vtulos") return "Illan tulokset ja tähdet" + (onLinjat() ? (d.l === "alkoholiton" ? " (alkoholittomat)" : " (kuohuviinit)") : "");
    if (d.pari) return "Lasi " + d.lasi + " · Maistelu";
    var w = T.viinit[d.i];
    var nimi = onLinjat() ? (w.alkoholiton ? "Alkoholiton " : "Kuohuviini ") + nro(d.i) : "Viini " + (d.i + 1);
    if (d.k === "maistelu") return nimi + " · Maistelu";
    return nimi + " · Paljastus ja aromit";
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
  function laskurit(d) {
    var X = diaAvaimet(d);
    if (!X.length) return "";
    var jaettu = X.some(function (x) { return jaetut[x.avain]; });
    function kortti(x) {
      var n = x.vaihtoehdot.length, p = puhelinLuvut(x.avain, n), L = luvut(x.avain, n), j = jaetut[x.avain];
      return '<div class="p-laskuri"><h3>' + esc(x.kysymys) + "</h3><ul>" + x.vaihtoehdot.map(function (v, o) {
        return '<li class="' + (o === x.oikea ? "on-oikea" : "") + '"><span>' + (o === x.oikea ? "✓ " : "") + (x.tahdet ? "★ " : "") + esc(v) + '</span><span class="p-puh">📱 ' + p[o] + "</span>" +
          '<button data-act="p-kasin" data-k="' + esc(x.avain) + '" data-o="' + o + '" data-d="-1" aria-label="Vähennä">−</button><b>' + L[o] + "</b>" +
          '<button data-act="p-kasin" data-k="' + esc(x.avain) + '" data-o="' + o + '" data-d="1" aria-label="Lisää">+</button></li>';
      }).join("") + '</ul><span class="p-tila' + (j ? " on" : "") + '">' + (j ? "Jaettu" + (x.moni ? "" : ": " + summa(j) + " vastausta") : "Ei jaettu") +
        (x.tahdet && keskiarvo(L) != null ? " · nyt ★ " + desi(keskiarvo(L)) : "") + "</span></div>";
    }
    var tav = X.filter(function (x) { return !x.tahdet; }), tah = X.filter(function (x) { return x.tahdet; });
    return '<div class="p-muisti"><h3>Vastaukset · ' + (jaettu ? "näkyvät kaikille" : "eivät vielä näy") + "</h3>" +
      '<p class="p-ohje" style="margin:0">📱 = puhelimista tulleet. Lisää käsiäänet + ja − napeilla.</p>' +
      tav.map(kortti).join("") +
      (tah.length ? '<h3 style="margin-top:var(--vali-5)">Tähdet · ' + tah.map(function (x) { var ka = keskiarvo(luvut(x.avain, 6)); return ka == null ? "–" : "★ " + desi(ka); }).join(" · ") + "</h3>" + tah.map(kortti).join("") : "") +
      '<div class="p-jaa"><button class="vt-painike" data-act="p-jaa">' + (jaettu ? "Päivitä kaikille" : "Näytä kaikille") + "</button>" +
      '<button class="vt-painike vt-painike--toissijainen" data-act="p-piilota"' + (jaettu ? "" : " disabled") + ">Piilota</button></div></div>";
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
  function renderOhjaus() {
    if (Y && !onJuontaja()) { kirjautuminen(); return; }
    var D = diat();
    dia = Math.max(0, Math.min(dia, D.length - 1));
    var d = D[dia], url = osallistujaUrl(), teema = store.get("vt-teema", "vaalea"), h = "";
    document.documentElement.dataset.theme = "vaalea";
    document.body.className = "ohjaus";

    if (d.k === "kansi") {
      h = '<h1 class="p-h1">Tervetuloa</h1>' +
        '<div class="p-qr">' + qrSvg(url, "") + "<div>" + (url ? "<b>" + esc(lyhyt(url)) + "</b>" : "<b>Osoite puuttuu</b>") +
        '<button class="vt-painike vt-painike--pieni" data-act="p-iso" data-v="qr">Näytä QR isona</button></div></div>' +
        (url ? "" : '<label class="o-label" for="j-osoite">Osallistujien osoite</label><input class="o-kentta" id="j-osoite" placeholder="https://…">') +
        muistiinpano("Muista", "Pyydä kaikkia skannaamaan koodi ja kirjoittamaan nimimerkki." + (onLinjat() ? " Jokainen valitsee alussa kuohuviinit tai alkoholittomat ja näkee vain omat juomansa." : "") + (lahjaKaytossa() ? " Kerro, että lopussa odottaa kiitoslahja." : ""));
    } else if (d.k === "vertailu") {
      h = '<h1 class="p-h1">Lopuksi</h1>' +
        muistiinpano("Ohje", "Osallistujat vastaavat puhelimessa kohdassa Lopuksi. Seuraavilla dioilla jaat vastaukset ja tähtien keskiarvot.") +
        lopuksi().map(function (q) {
          var t = (onLinjat() ? ["viini", "alkoholiton"] : ["viini"]).map(function (l) {
            var o = lOikea(q, l), vv = lVaihtoehdot(l);
            return (onLinjat() ? (l === "alkoholiton" ? "Alkoholittomat: " : "Kuohuviinit: ") : "") + (o != null ? "✓ " + vv[o] + ". " : "") + lFakta(q, l);
          }).join("\n");
          return muistiinpano(esc(q.kysymys), t);
        }).join("");
    } else if (d.k === "vtulos") {
      h = '<h1 class="p-h1">Illan tulokset' + (onLinjat() ? (d.l === "alkoholiton" ? " · alkoholittomat" : " · kuohuviinit") : "") + "</h1>" + laskurit(d);
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
        muistiinpano("Google-arvio", "Pyydä kaikilta arviota Googleen, ilman palkkiota. Älä yhdistä pyyntöä lahjakorttiin.") +
        muistiinpano("Varaukset", "Oma tasting: " + lyhyt(T.varausLinkki));
    } else {
      var w = T.viinit[d.i], sokko = onSokko(w);
      h = '<div class="o-rivi"><span class="vt-pallo">' + nro(d.i) + "</span>" + tyyppi(w) + "</div>" +
        '<h1 class="p-h1">' + esc(w.nimi) + "</h1>";
      if (sokko && d.k === "paljastus" && T.kaytaPaljastussanaa) {
        h += '<div class="p-sana"><span>Paljastussana</span><b>' + esc(w.paljastussana) + "</b>" +
          '<button class="p-sana__nappi" data-act="p-iso" data-v="sana">Näytä isona</button></div>';
      }
      if (sokko && d.k === "paljastus") h += laskurit(d);
      if (d.k === "maistelu") {
        h += (T.kaytaPaljastussanaa ? '<p class="o-vaimea">Paljastussana seuraavassa vaiheessa: <b>' + esc(w.paljastussana) + "</b></p>" : "") +
          muistiinpano("Kiinnitä huomiota", w.maistele) + muistiinpano("Omat muistiinpanot", w.juontajalle);
      } else {
        h += muistiinpano("Tarina", w.tarina) + muistiinpano("Kiinnitä huomiota", w.maistele) +
          muistiinpano("Ruoaksi", w.ruoaksi) + muistiinpano("Omat muistiinpanot", w.juontajalle);
      }
    }

    var ohjelma = D.map(function (x, k) {
      return '<li><button data-act="p-hyppaa" data-v="' + k + '" aria-current="' + (k === dia) + '"><span>' + (k + 1) + "</span>" + esc(diaNimi(x)) + "</button></li>";
    }).join("");
    var seuraava = D[dia + 1];

    app.innerHTML = '<div class="p-kehys">' +
      '<header class="p-yla"><div><span class="o-ylatunniste">Juontaja</span><span class="p-yla__nimi">' + esc(T.nimi) + "</span></div>" +
      '<span id="yhteys" data-luokka="p-chip"></span></header>' +
      '<p class="p-ohje" id="yhteys-ohje">' + (Y ? "Odotetaan yhteyttä. Iso näyttö seuraa puhelintasi, kun osoite …#naytto on auki läppärillä tai televisiossa." : "Yhteysasetukset puuttuvat, joten sovellus toimii vain tällä laitteella.") + "</p>" +
      '<section class="p-nyt vt-kortti"><span class="p-vaihe">Nyt näytöllä · ' + (dia + 1) + " / " + D.length + "</span>" + h + "</section>" +
      '<details class="p-ohjelma"><summary>Ohjelma</summary><ol>' + ohjelma + "</ol></details>" +
      '<div class="p-asetukset"><button class="vt-painike vt-painike--toissijainen vt-painike--pieni" data-act="j-teema">Näytön teema: ' + (teema === "ilta" ? "Ilta" : "Vaalea") + "</button>" +
      (Y && onJuontaja() ? '<button class="vt-linkki" data-act="p-ulos">Kirjaudu ulos</button>' : "") +
      '<a class="vt-linkki" href="#naytto">Avaa näyttönäkymä</a><a class="vt-linkki" href="#poytakortti">Pöytäkortit</a><a class="vt-linkki" href="#">Osallistujan näkymä</a></div>' +
      "</div>" +
      '<nav class="p-ala" aria-label="Diojen ohjaus"><p>' + (seuraava ? "Seuraavaksi: " + esc(diaNimi(seuraava)) : "Viimeinen dia") + "</p>" +
      '<div class="p-napit"><button class="vt-painike vt-painike--toissijainen" data-act="j-ed"' + (dia === 0 ? " disabled" : "") + ' aria-label="Edellinen dia">‹</button>' +
      '<button class="vt-painike" data-act="j-seur"' + (seuraava ? "" : " disabled") + ">Seuraava ›</button></div></nav>" +
      '<div class="p-iso" id="p-iso" hidden data-act="p-sulje"></div>';
    paivitaYhteys();
  }
  function naytaIsona(mita) {
    var el = document.getElementById("p-iso"), D = diat(), d = D[dia];
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
    var kortti = '<div class="k-kortti">' + logo(T.logo, "logo") + "<h2>Skannaa ja tule mukaan</h2>" +
      "<p>Viinien tiedot, sokkovisa ja omat muistiinpanot puhelimeesi. Ei sovellusta, ei kirjautumista.</p>" +
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
        var nk = document.getElementById("nimimerkki"); if (nk) S.nimi = (nk.value || "").trim();
        S.linja = t.dataset.v; tallenna(); renderOsallistuja(); break;
      case "aloita":
        if (onLinjat() && !S.linja) return;
        S.nimi = (document.getElementById("nimimerkki").value || "").trim();
        S.aloitettu = true; S.nakyma = omat()[0]; tallenna(); renderOsallistuja(); window.scrollTo(0, 0); break;
      case "siirry":
        S.nakyma = t.dataset.v === "loppu" || t.dataset.v === "vertailu" ? t.dataset.v : +t.dataset.v; tallenna(); renderOsallistuja(); window.scrollTo(0, 0); break;
      case "valitse":
        if (S.lukittu[i]) return;
        S.vastaukset[i] = S.vastaukset[i] || {}; S.vastaukset[i][+t.dataset.q] = +t.dataset.o; tallenna(); renderOsallistuja(); break;
      case "lukitse":
        S.lukittu[i] = true; tallenna(); renderOsallistuja();
        var kentta = document.getElementById("sana-" + i); if (kentta) kentta.scrollIntoView({ block: "center" });
        break;
      case "paljasta": paljasta(i); break;
      case "p-kirjaudu":
        var em = (document.getElementById("k-email").value || "").trim(), pw = document.getElementById("k-salasana").value || "", ve = document.getElementById("k-virhe");
        t.disabled = true; t.textContent = "Kirjaudutaan…";
        Y.kirjaudu(em, pw).then(function () {
          if (!onJuontaja()) { ve.hidden = false; ve.textContent = "Tunnus ei ole juontajan tunnus."; t.disabled = false; t.textContent = "Kirjaudu"; }
        }, function () { ve.hidden = false; ve.textContent = "Kirjautuminen ei onnistunut. Tarkista sähköposti ja salasana."; t.disabled = false; t.textContent = "Kirjaudu"; });
        break;
      case "p-ulos":
        if (Y) Y.ulos().then(reitti); break;
      case "aromi":
        if (S.lukittu[i]) return;
        var va = S.aromit[i] || [], ao = +t.dataset.o, ix = va.indexOf(ao);
        if (ix >= 0) va.splice(ix, 1); else va.push(ao);
        S.aromit[i] = va; tallenna(); renderOsallistuja(); break;
      case "tahti":
        if (S.lukittu[i]) return;
        S.arviot[i] = +t.dataset.v; tallenna(); renderOsallistuja(); break;
      case "l-valitse":
        if (S.loppu.lukittu) return;
        S.loppu.v[t.dataset.id] = +t.dataset.o; tallenna(); renderOsallistuja(); break;
      case "l-lukitse":
        S.loppu.lukittu = true; tallenna(); renderOsallistuja(); window.scrollTo(0, 0); break;
      case "p-kasin":
        var ka = kasin[t.dataset.k] || [], o2 = +t.dataset.o, nyt = luvut(t.dataset.k, 40)[o2] || 0;
        if (+t.dataset.d < 0 && nyt <= 0) return;
        ka[o2] = (ka[o2] || 0) + (+t.dataset.d); kasin[t.dataset.k] = ka; store.set(KEY + "-kasin", kasin); renderOhjaus(); break;
      case "p-jaa":
        diaAvaimet(diat()[dia]).forEach(function (x) { jaetut[x.avain] = luvut(x.avain, x.vaihtoehdot.length); });
        store.set(KEY + "-jaetut", jaetut); laheta(); renderOhjaus(); break;
      case "p-piilota":
        diaAvaimet(diat()[dia]).forEach(function (x) { delete jaetut[x.avain]; });
        store.set(KEY + "-jaetut", jaetut); laheta(); renderOhjaus(); break;
      case "arvio":
        S.arviot[i] = +t.dataset.v; tallenna(); renderOsallistuja(); break;
      case "kopioi": kopioi(viinilistaTeksti(), "kopio-tila", "kopio-teksti", "Viinilista kopioitu. Liitä se vaikka muistiinpanoihin."); break;
      case "lahja-valinta":
        S.lahja.valinta = t.dataset.v; tallenna(); renderOsallistuja();
        var kortti = document.getElementById("lahjakortti"); if (kortti) kortti.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      case "lahja-kopioi": kopioi(lahjaViesti(), "lahja-tila", "lahja-teksti", "Viesti kopioitu. Liitä se haluamaasi sovellukseen."); break;
      case "lahja-jaa":
        try { navigator.share({ text: lahjaViesti() }).catch(function () {}); } catch (err) {}
        break;
      case "tyhjenna":
        if (!tyhjennysVarmistus) { tyhjennysVarmistus = true; t.textContent = "Varmasti? Vastaukset ja muistiinpanot poistuvat. Paina uudelleen."; return; }
        tyhjennysVarmistus = false; S = uusiTila(); tallenna(); renderOsallistuja(); window.scrollTo(0, 0); break;
      case "j-ed": siirraDia(-1); break;
      case "j-seur": siirraDia(1); break;
      case "j-teema": vaihdaTeema(); break;
      case "p-hyppaa": asetaDia(+t.dataset.v); window.scrollTo(0, 0); break;
      case "p-iso": naytaIsona(t.dataset.v); break;
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
