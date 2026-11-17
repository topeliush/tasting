// Viinitasting tasting: Firebase-yhteys. Bundlataan esbuildilla tiedostoksi public/yhteys.js.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, onAuthStateChanged, connectAuthEmulator } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot, collection, serverTimestamp, connectFirestoreEmulator } from "firebase/firestore";

window.VTYhteys = function (config, tilaisuus, emulaattori) {
  var app = initializeApp(config);
  var auth = getAuth(app);
  var db = getFirestore(app);
  if (emulaattori) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  var tilaDoc = doc(db, "tilaisuudet", tilaisuus);
  return {
    onKayttaja: function (cb) {
      return onAuthStateChanged(auth, function (u) {
        cb(u ? { uid: u.uid, email: (u.email || "").toLowerCase(), anon: u.isAnonymous } : null);
      });
    },
    anonyymi: function () { return signInAnonymously(auth); },
    kirjaudu: function (email, salasana) { return signInWithEmailAndPassword(auth, email, salasana); },
    ulos: function () { return signOut(auth); },
    kuunteleTila: function (cb, virhe) {
      return onSnapshot(tilaDoc, function (s) { cb(s.exists() ? s.data() : null); }, virhe);
    },
    kirjoitaTila: function (data) {
      return setDoc(tilaDoc, { dia: data.dia, teema: data.teema, jaetut: data.jaetut, paivitetty: serverTimestamp() });
    },
    tallennaVastaus: function (uid, data) {
      return setDoc(doc(db, "tilaisuudet", tilaisuus, "vastaukset", uid), { l: data.l, v: data.v, L: data.L, paivitetty: serverTimestamp() });
    },
    kuunteleVastaukset: function (cb, virhe) {
      return onSnapshot(collection(db, "tilaisuudet", tilaisuus, "vastaukset"), function (qs) {
        cb(qs.docs.map(function (d) { return d.data(); }));
      }, virhe);
    }
  };
};
