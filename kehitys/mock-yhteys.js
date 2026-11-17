window.VTYhteys = function (config, t) {
  var kuuntelijat = [];
  function kayttaja() { try { return JSON.parse(localStorage.getItem("mock-user")); } catch (e) { return null; } }
  function aseta(u) { localStorage.setItem("mock-user", JSON.stringify(u)); kuuntelijat.forEach(function (cb) { cb(u); }); }
  function poll(url, cb) {
    var edel = null;
    function k() { fetch(url).then(function (r) { return r.json(); }).then(function (d) { var s = JSON.stringify(d); if (s !== edel) { edel = s; cb(d); } }).catch(function () {}); }
    k(); var id = setInterval(k, 250); return function () { clearInterval(id); };
  }
  function post(url, d) { return fetch(url, { method: "POST", body: JSON.stringify(d) }).then(function () {}); }
  return {
    onKayttaja: function (cb) { kuuntelijat.push(cb); setTimeout(function () { cb(kayttaja()); }, 50); },
    anonyymi: function () { aseta({ uid: "u" + Math.random().toString(36).slice(2), email: "", anon: true }); return Promise.resolve(); },
    kirjaudu: function (e, p) { if (p !== "salasana") return Promise.reject(new Error("x")); aseta({ uid: "juontaja", email: e.toLowerCase(), anon: false }); return Promise.resolve(); },
    ulos: function () { aseta(null); return Promise.resolve(); },
    kuunteleTila: function (cb) { return poll("/api/tila/" + t, cb); },
    kirjoitaTila: function (d) { return post("/api/tila/" + t, d); },
    tallennaVastaus: function (uid, d) { return post("/api/v/" + t + "/" + uid, d); },
    kuunteleVastaukset: function (cb) { return poll("/api/v/" + t, function (o) { cb(Object.keys(o).map(function (k) { return o[k]; })); }); }
  };
};
