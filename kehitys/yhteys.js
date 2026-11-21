// Viinitasting tasting: Firebase-yhteys. Bundlataan esbuildilla tiedostoksi yhteys.js.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, onAuthStateChanged, connectAuthEmulator } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, collection, serverTimestamp, increment, connectFirestoreEmulator } from "firebase/firestore";

var P = null;
function perus() {
  if (P) return P;
  var A = window.VT_ASETUKSET || {};
  var app = initializeApp(A.firebase);
  var auth = getAuth(app), db = getFirestore(app);
  if (A.emulaattori) { connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); connectFirestoreEmulator(db, "127.0.0.1", 8080); }
  P = { auth: auth, db: db };
  return P;
}
function kuvaRef(db, polku) { var o = String(polku).split("/"); return doc(db, "tastingit", o[0], "kuvat", o[1]); }
function pois(x) { return JSON.parse(JSON.stringify(x)); }

window.VTYhteys = function (config, tilaisuus) {
  var p = perus(), auth = p.auth, db = p.db;
  var tilaDoc = doc(db, "tilaisuudet", tilaisuus);
  return {
    onKayttaja: function (cb) {
      return onAuthStateChanged(auth, function (u) { cb(u ? { uid: u.uid, email: (u.email || "").toLowerCase(), anon: u.isAnonymous } : null); });
    },
    anonyymi: function () { return signInAnonymously(auth); },
    kirjaudu: function (email, salasana) { return signInWithEmailAndPassword(auth, email, salasana); },
    ulos: function () { return signOut(auth); },
    kuunteleTila: function (cb, virhe) { return onSnapshot(tilaDoc, function (s) { cb(s.exists() ? s.data() : null); }, virhe); },
    kirjoitaTila: function (data) { return setDoc(tilaDoc, { dia: data.dia, teema: data.teema, jaetut: data.jaetut, paivitetty: serverTimestamp() }); },
    kirjoitaJaetut: function (jaetut, julkaisija) {
      var d = { jaetut: jaetut, julkaisija: julkaisija, julkaistuMs: Date.now() };
      return updateDoc(tilaDoc, d).catch(function () { return setDoc(tilaDoc, d, { merge: true }); });
    },
    // Aromikoonti: osallistujat kasvattavat laskureita suoraan, joten yhteenveto päivittyy ilman juontajan laitetta.
    koontiMuutos: function (i, a, o) {
      var d = {};
      if (a) { d.a = {}; Object.keys(a).forEach(function (k) { d.a[k] = increment(a[k]); }); }
      if (o) { d.o = {}; Object.keys(o).forEach(function (k) { d.o[k] = { t: o[k].t, n: increment(o[k].d) }; }); }
      return setDoc(doc(db, "tilaisuudet", tilaisuus, "koonti", "v" + i), d, { merge: true });
    },
    haeKoonti: function (i) {
      return getDoc(doc(db, "tilaisuudet", tilaisuus, "koonti", typeof i === "string" ? i : "v" + i)).then(function (s) { return s.exists() ? s.data() : null; });
    },
    // Tähdet ja loppukysymykset: osallistujat päivittävät laskureita (+1 uusi, -1 vanha) dokumenttiin koonti/loppu.
    koontiLisaa: function (id, muutos) {
      function inc(o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = typeof o[k] === "number" ? increment(o[k]) : inc(o[k]); }); return r; }
      return setDoc(doc(db, "tilaisuudet", tilaisuus, "koonti", id), inc(muutos), { merge: true });
    },
    tallennaVastaus: function (uid, data) {
      return setDoc(doc(db, "tilaisuudet", tilaisuus, "vastaukset", uid), { l: data.l, v: data.v, L: data.L, paivitetty: serverTimestamp() });
    },
    // Kiitoslahjan koodi talteen: osallistuja voi vain luoda, vain juontaja lukee ja merkitsee käytetyksi.
    tallennaLahja: function (d) {
      return setDoc(doc(db, "lahjakortit", d.koodi), { koodi: d.koodi, arvo: d.arvo, tasting: tilaisuus, asiakas: d.asiakas || "", nimi: d.nimi || "", voimassa: d.voimassa, valinta: d.valinta || "", luotu: serverTimestamp(), kaytetty: false });
    },
    kuunteleVastaukset: function (cb, virhe) {
      return onSnapshot(collection(db, "tilaisuudet", tilaisuus, "vastaukset"), function (qs) { cb(qs.docs.map(function (d) { return d.data(); })); }, virhe);
    }
  };
};

window.VTData = {
  haeTasting: function (id) { var db = perus().db; return getDoc(doc(db, "tastingit", id)).then(function (s) { return s.exists() ? s.data() : null; }); },
  listaa: function () {
    var db = perus().db;
    return getDocs(collection(db, "tastingit")).then(function (qs) { return qs.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }); });
  },
  tallenna: function (id, data) { var db = perus().db; var d = pois(data); d.muokattu = Date.now(); return setDoc(doc(db, "tastingit", id), d); },
  poista: function (id) { var db = perus().db; return deleteDoc(doc(db, "tastingit", id)); },
  tallennaKuva: function (id, data) {
    var db = perus().db, k = "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return setDoc(doc(db, "tastingit", id, "kuvat", k), { data: data, luotu: Date.now() }).then(function () { return id + "/" + k; });
  },
  // Repon staattiset kuvat (esim. /kuvat/face/kartta.jpg) näytetään suoraan, muut haetaan Firestoresta.
  haeKuva: function (polku) { if (/^(\/|https?:)/.test(String(polku))) return Promise.resolve(polku); var db = perus().db; return getDoc(kuvaRef(db, polku)).then(function (s) { return s.exists() ? s.data().data : null; }); },
  poistaKuva: function (polku) { var db = perus().db; return deleteDoc(kuvaRef(db, polku)); },
  tyhjennaVastaukset: function (id) {
    var db = perus().db;
    return getDocs(collection(db, "tilaisuudet", id, "vastaukset")).then(function (qs) {
      return Promise.all(qs.docs.map(function (d) { return deleteDoc(d.ref); }));
    }).then(function (r) {
      return getDocs(collection(db, "tilaisuudet", id, "koonti")).then(function (qs) {
        return Promise.all(qs.docs.map(function (d) { return deleteDoc(d.ref); }));
      }).then(function () { return deleteDoc(doc(db, "tilaisuudet", id)); }).then(function () { return r.length; });
    });
  },
  haeKoonnit: function (id) {
    var db = perus().db;
    return getDocs(collection(db, "tilaisuudet", id, "koonti")).then(function (qs) { var r = {}; qs.docs.forEach(function (d) { r[d.id] = d.data(); }); return r; });
  },
  listaaLahjat: function () {
    var db = perus().db;
    return getDocs(collection(db, "lahjakortit")).then(function (qs) {
      return qs.docs.map(function (d) { var x = d.data(); x.id = d.id; x.luotuMs = x.luotu && x.luotu.toMillis ? x.luotu.toMillis() : 0; delete x.luotu; return x; });
    });
  },
  merkitseLahja: function (koodi, kaytetty) { var db = perus().db; return updateDoc(doc(db, "lahjakortit", koodi), { kaytetty: !!kaytetty, kaytettyMs: kaytetty ? Date.now() : null }); },
  haeVastaukset: function (id) { var db = perus().db; return getDocs(collection(db, "tilaisuudet", id, "vastaukset")).then(function (qs) { return qs.docs.map(function (d) { return d.data(); }); }); },
  laskeVastaukset: function (id) { var db = perus().db; return getDocs(collection(db, "tilaisuudet", id, "vastaukset")).then(function (qs) { return qs.size; }); }
};
