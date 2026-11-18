// Viinitasting tasting: Firebase-yhteys. Bundlataan esbuildilla tiedostoksi yhteys.js.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, onAuthStateChanged, connectAuthEmulator } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, collection, serverTimestamp, connectFirestoreEmulator } from "firebase/firestore";

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
    tallennaVastaus: function (uid, data) {
      return setDoc(doc(db, "tilaisuudet", tilaisuus, "vastaukset", uid), { l: data.l, v: data.v, L: data.L, paivitetty: serverTimestamp() });
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
  haeKuva: function (polku) { var db = perus().db; return getDoc(kuvaRef(db, polku)).then(function (s) { return s.exists() ? s.data().data : null; }); },
  poistaKuva: function (polku) { var db = perus().db; return deleteDoc(kuvaRef(db, polku)); },
  tyhjennaVastaukset: function (id) {
    var db = perus().db;
    return getDocs(collection(db, "tilaisuudet", id, "vastaukset")).then(function (qs) {
      return Promise.all(qs.docs.map(function (d) { return deleteDoc(d.ref); }));
    }).then(function (r) { return deleteDoc(doc(db, "tilaisuudet", id)).then(function () { return r.length; }); });
  },
  laskeVastaukset: function (id) { var db = perus().db; return getDocs(collection(db, "tilaisuudet", id, "vastaukset")).then(function (qs) { return qs.size; }); }
};
