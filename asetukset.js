// Viinitasting tasting: yhteysasetukset.
// firebase: Firebase-konsolin "Project settings → Your apps → Web app" -kohdan firebaseConfig.
// Arvot ovat julkisia tunnisteita, eivät salasanoja. Tietoturvan hoitavat Firestoren säännöt.
// juontajat: sähköpostit, joilla voi kirjautua juontajaksi (sama lista on firestore.rules-tiedostossa).
window.VT_ASETUKSET = {
  firebase: {
    apiKey: "AIzaSyCPjuSWUBtH9gUpI1uEHHdMJosEGWWNGMQ",
    authDomain: "viinitasting-tasting.firebaseapp.com",
    projectId: "viinitasting-tasting",
    storageBucket: "viinitasting-tasting.firebasestorage.app",
    messagingSenderId: "820618087305",
    appId: "1:820618087305:web:fcbb1eb8f19998b12faf58"
  },
  juontajat: ["tophaavisto@icloud.com"],
  // Etusivun ja vanhentuneen linkin napit. Tyhjä kauppaLinkki = nappia ei näytetä (lisää osoite, kun verkkokauppa on julkinen).
  varausLinkki: "https://viinitasting.com/laske",
  arvioLinkki: "https://g.page/r/Ccf877ZSMJM8ECE/review",
  kauppaLinkki: ""
};
