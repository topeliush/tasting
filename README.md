# Viinitasting.com · tasting

- **Hallinta:** https://tasting.viinitasting.com/hallinta/ – tastingien luonti, muokkaus, linkit ja QR-koodit, vastausten tyhjennys.
- **Osallistujat:** `https://tasting.viinitasting.com/?t=<tunnus>` – lisäksi `#ohjaus` (juontajan puhelin), `#naytto` (iso näyttö), `#poytakortti`.

Tastingien sisältö ja kuvat ovat Firestoressa (`tastingit/{tunnus}`, `tastingit/{tunnus}/kuvat`). Vastaukset ovat polussa `tilaisuudet/{tunnus}/vastaukset`. Kiitoslahjojen koodit tallentuvat kokoelmaan `lahjakortit/{koodi}` (osallistuja voi vain luoda, juontaja näkee ne hallinnan Lahjakortit-osiossa ja merkitsee käytetyksi). Osallistujien yhteiset laskurit (aromit `koonti/v{n}`, tähdet, loppukysymykset ja osallistujamäärä `koonti/loppu`) päivittyvät suoraan puhelimista.

## Tiedostot
- `index.html` – lataa tastingin tunnuksella ja käynnistää sovelluksen.
- `app.js`, `app.css`, `qr.js` – osallistujan, juontajan ja ison näytön sovellus.
- `emojit.js` – aromien emojit (yhteinen sovellukselle ja hallinnalle).
- `/?esikatselu=<tunnus>` – hallinnan Esikatsele-nappi: tallentamaton setti, ei tallennuksia.
- `hallinta/` – hallintanäkymä.
- `pohjat/` – Clauden valmistelemat setit, jotka tuodaan hallinnasta painikkeella "Tuo setti".
- `kuvat/<setti>/` – settien valmiit kuvat (esim. karttakuvat). Pohjassa kuvan polku alkaa `/kuvat/`; jo tuotuun settiin ne saa hallinnan painikkeella "Hae kuvat valmiista setistä" (muista tallentaa).
- `kehitys/kartat/` – karttakuvien generaattori (d3-geo + world-atlas, renderöinti headless Chromella): `npm i d3-geo topojson-client world-atlas @fontsource/nunito`, sitten `bash tee.sh`.
- `asetukset.js` – Firebase-yhteys ja juontajan sähköposti.
- `yhteys.js` – Firebase SDK (13.4.0) ja yhteyskerros, rakennettu tiedostosta `kehitys/yhteys.js` esbuildilla.
- `firestore.rules` – Firestoren tietoturvasäännöt (liitetään Firebase-konsoliin).

## Omatoimisetit
- **Omatoimipohja** (`pohja: true`): hallinnan Uusi tasting → Käyttö: Omatoimipohja. Ei avaudu linkillä kenellekään (Firestore-säännöt), testataan Esikatsele-napilla. Tunnus `pohja-<nimi>`.
- **Omatoimisetti asiakkaalle** (`omatoimi: true`, `voimassaAstiMs`): Uusi tasting → Pohja: Kopio pohjasta → Käyttö: Omatoimisetti asiakkaalle. Saa arvaamattoman tunnuksen `o-` + 12 merkkiä ja on voimassa 30 pv. Linkit ja QR -kohdassa: Kopioi viesti asiakkaalle ja Jatka 30 pv.
- Säännöt: yksittäisen setin saa lukea tunnuksella, settilistaa ei voi hakea ilman juontajan kirjautumista. Vanhentunut omatoimisetti ja pohja eivät avaudu, eikä niihin voi kirjata vastauksia, aromeja tai lahjakortteja. Lahjakortin arvon on vastattava setin lahjakorttia.
- Älä tallenna omatoimipohjia `pohjat/`-kansioon: kansio ja repo ovat julkisia.
