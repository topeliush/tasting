(function () {
  function get(u) { return fetch(u).then(function (r) { return r.json(); }); }
  function post(u, d) { return fetch(u, { method: "POST", body: JSON.stringify(d) }).then(function () {}); }
  function del(u) { return fetch(u, { method: "DELETE" }).then(function () {}); }
  function poll(url, cb, map) {
    var edel = null;
    function k() { get(url).then(function (d) { var s = JSON.stringify(d); if (s !== edel) { edel = s; cb(map ? map(d) : d); } }).catch(function () {}); }
    k(); var id = setInterval(k, 250); return function () { clearInterval(id); };
  }
  var kuuntelijat = [];
  function kayttaja() { try { return JSON.parse(localStorage.getItem("mock-user")); } catch (e) { return null; } }
  function aseta(u) { localStorage.setItem("mock-user", JSON.stringify(u)); kuuntelijat.forEach(function (cb) { cb(u); }); }
  window.VTYhteys = function (config, t) {
    return {
      onKayttaja: function (cb) { kuuntelijat.push(cb); setTimeout(function () { cb(kayttaja()); }, 30); },
      anonyymi: function () { aseta({ uid: "u" + Math.random().toString(36).slice(2), email: "", anon: true }); return Promise.resolve(); },
      kirjaudu: function (e, p) { if (p !== "salasana") return Promise.reject(new Error("x")); aseta({ uid: "juontaja", email: e.toLowerCase(), anon: false }); return Promise.resolve(); },
      ulos: function () { aseta(null); return Promise.resolve(); },
      kuunteleTila: function (cb) { return poll("/api/doc/tilaisuudet/" + t, cb); },
      kirjoitaTila: function (d) { return post("/api/doc/tilaisuudet/" + t, d); },
      kirjoitaJaetut: function (j, kuka) { return get("/api/doc/tilaisuudet/" + t).then(function (d) { d = d || {}; d.jaetut = j; d.julkaisija = kuka; d.julkaistuMs = Date.now(); return post("/api/doc/tilaisuudet/" + t, d); }); },
      koontiMuutos: function (i, a, o) {
        var u = "/api/doc/tilaisuudet/" + t + "/koonti/v" + i;
        return get(u).then(function (d) {
          d = d || {}; d.a = d.a || {}; d.o = d.o || {};
          if (a) Object.keys(a).forEach(function (k) { d.a[k] = (d.a[k] || 0) + a[k]; });
          if (o) Object.keys(o).forEach(function (k) { var x = d.o[k] || { t: o[k].t, n: 0 }; x.t = o[k].t; x.n += o[k].d; d.o[k] = x; });
          return post(u, d);
        });
      },
      haeKoonti: function (i) { return get("/api/doc/tilaisuudet/" + t + "/koonti/" + (typeof i === "string" ? i : "v" + i)); },
      koontiLisaa: function (id, muutos) {
        var u = "/api/doc/tilaisuudet/" + t + "/koonti/" + id;
        function lisaa(kohde, m) { Object.keys(m).forEach(function (k) { if (typeof m[k] === "number") kohde[k] = (kohde[k] || 0) + m[k]; else { kohde[k] = kohde[k] || {}; lisaa(kohde[k], m[k]); } }); }
        return get(u).then(function (d) { d = d || {}; lisaa(d, muutos); return post(u, d); });
      },
      tallennaLahja: function (d) { var x = JSON.parse(JSON.stringify(d)); x.tasting = t; x.kaytetty = false; x.luotuMs = Date.now(); return post("/api/doc/lahjakortit/" + d.koodi, x); },
      tallennaVastaus: function (uid, d) { return post("/api/doc/tilaisuudet/" + t + "/vastaukset/" + uid, d); },
      kuunteleVastaukset: function (cb) { return poll("/api/col/tilaisuudet/" + t + "/vastaukset", cb, function (l) { return l.map(function (x) { return x.data; }); }); }
    };
  };
  window.VTData = {
    haeTasting: function (id) { return get("/api/doc/tastingit/" + id); },
    listaa: function () { return get("/api/col/tastingit").then(function (l) { return l.map(function (x) { x.data.id = x.id; return x.data; }); }); },
    tallenna: function (id, d) { d = JSON.parse(JSON.stringify(d)); d.muokattu = Date.now(); return post("/api/doc/tastingit/" + id, d); },
    poista: function (id) { return del("/api/doc/tastingit/" + id); },
    tallennaKuva: function (id, data) { var k = "k" + Math.random().toString(36).slice(2, 8); return post("/api/doc/tastingit/" + id + "/kuvat/" + k, { data: data }).then(function () { return id + "/" + k; }); },
    haeKuva: function (p) { if (/^(\/|https?:)/.test(String(p))) return Promise.resolve(p); var o = p.split("/"); return get("/api/doc/tastingit/" + o[0] + "/kuvat/" + o[1]).then(function (d) { return d ? d.data : null; }); },
    poistaKuva: function (p) { var o = p.split("/"); return del("/api/doc/tastingit/" + o[0] + "/kuvat/" + o[1]); },
    tyhjennaVastaukset: function (id) { return get("/api/col/tilaisuudet/" + id + "/vastaukset").then(function (l) { return Promise.all(l.map(function (x) { return del("/api/doc/tilaisuudet/" + id + "/vastaukset/" + x.id); })).then(function () { return del("/api/doc/tilaisuudet/" + id); }).then(function () { return l.length; }); }); },
    listaaLahjat: function () { return get("/api/col/lahjakortit").then(function (l) { return l.map(function (x) { x.data.id = x.id; return x.data; }); }); },
    merkitseLahja: function (k, v) { return get("/api/doc/lahjakortit/" + k).then(function (d) { d.kaytetty = !!v; d.kaytettyMs = v ? Date.now() : null; return post("/api/doc/lahjakortit/" + k, d); }); },
    laskeVastaukset: function (id) { return get("/api/col/tilaisuudet/" + id + "/vastaukset").then(function (l) { return l.length; }); }
  };
})();
