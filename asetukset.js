// Viinitasting tasting: yhteysasetukset.
// firebase: Firebase-konsolin "Project settings → Your apps → Web app" -kohdan firebaseConfig.
// Arvot ovat julkisia tunnisteita, eivät salasanoja. Tietoturvan hoitavat Firestoren säännöt.
// juontajat: sähköpostit, joilla voi kirjautua juontajaksi (sama lista on firestore.rules-tiedostossa).
window.VT_ASETUKSET = {
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },
  juontajat: [""]
};
