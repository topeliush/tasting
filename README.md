# Viinitasting.com · tasting

Osallistujien tasting-sovellus osoitteessa https://tasting.viinitasting.com.

- `tek/` – yksi tilaisuus. Osallistujat: `/tek/`, juontajan puhelin: `/tek/#ohjaus`, iso näyttö: `/tek/#naytto`, pöytäkortit: `/tek/#poytakortti`.
- `app.js`, `app.css` – yhteinen sovellus kaikille tilaisuuksille.
- `asetukset.js` – Firebase-yhteys ja juontajan sähköposti.
- `yhteys.js` – Firebase SDK (13.4.0) ja yhteyskerros, rakennettu tiedostosta `kehitys/yhteys.js` esbuildilla.
- `firestore.rules` – Firestoren tietoturvasäännöt (liitetään Firebase-konsoliin).

## Uusi tilaisuus
1. Kopioi `tek/` uudeksi kansioksi, esim. `kevat-2027/`.
2. Vaihda `index.html`-tiedostossa `id` uniikiksi ja `osoite` uuteen osoitteeseen, sekä juomat, aromit ja lopuksi-kysymykset.
