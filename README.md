# Viinitasting.com · tasting

- **Hallinta:** https://tasting.viinitasting.com/hallinta/ – tastingien luonti, muokkaus, linkit ja QR-koodit, vastausten tyhjennys.
- **Osallistujat:** `https://tasting.viinitasting.com/?t=<tunnus>` – lisäksi `#ohjaus` (juontajan puhelin), `#naytto` (iso näyttö), `#poytakortti`.

Tastingien sisältö ja kuvat ovat Firestoressa (`tastingit/{tunnus}`, `tastingit/{tunnus}/kuvat`). Vastaukset ovat polussa `tilaisuudet/{tunnus}/vastaukset`.

## Tiedostot
- `index.html` – lataa tastingin tunnuksella ja käynnistää sovelluksen.
- `app.js`, `app.css`, `qr.js` – osallistujan, juontajan ja ison näytön sovellus.
- `hallinta/` – hallintanäkymä.
- `pohjat/` – Clauden valmistelemat setit, jotka tuodaan hallinnasta painikkeella "Tuo setti".
- `asetukset.js` – Firebase-yhteys ja juontajan sähköposti.
- `yhteys.js` – Firebase SDK (13.4.0) ja yhteyskerros, rakennettu tiedostosta `kehitys/yhteys.js` esbuildilla.
- `firestore.rules` – Firestoren tietoturvasäännöt (liitetään Firebase-konsoliin).
