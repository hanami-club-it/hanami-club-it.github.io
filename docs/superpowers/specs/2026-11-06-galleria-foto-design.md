# Galleria foto dei raduni — Design

Data: 2026-11-06
Stato: approvato in chat, in attesa di revisione del documento

## Obiettivo

Mostrare sul sito le foto dei raduni passati:

- ogni card "Eventi passati" in home ha una foto di copertina e porta alle foto di quel raduno;
- una pagina **Galleria** mostra, per ogni raduno, alcune anteprime e un bottone "Vedi tutte" che apre tutte le foto di quel raduno.

Vincoli:

- hosting gratuito;
- nessun servizio terzo che riceva i dati dei visitatori (coerente con i font ospitati in locale);
- aggiungere le foto di un nuovo raduno deve essere semplice e ripetibile.

## Decisioni prese

| Tema | Decisione |
|---|---|
| Hosting | Foto ottimizzate nello stesso repository, pubblicate da GitHub Pages |
| "Vedi tutte" | Vista dedicata al raduno, con indirizzo `galleria.html#AAAA-MM-GG` |
| Collegamento foto ↔ raduno | Il nome della cartella è la data del raduno (`AAAA-MM-GG`) |
| Copertina | File chiamato `copertina.*` nella cartella sorgente, altrimenti la prima foto |
| Anteprime | Copertina più le 5 foto successive in ordine di nome file (6 in totale) |
| Formato pubblicato | WebP: grande con lato lungo 1600px, miniatura con lato lungo 600px |
| Metadati | EXIF/XMP rimossi (GPS compreso); resta solo il profilo colore |

Limiti GitHub Pages: sito ≤ 1 GB e circa 100 GB di traffico al mese. Con circa 300 KB per foto (grande + miniatura) il sito regge circa 3.000 foto. Se servisse, il piano B è Cloudflare R2: cambia solo l'URL di base delle immagini.

## Struttura file

```
galleria.html            nuova pagina
js/eventi.js             elenco EVENTS condiviso (spostato da main.js)
js/main.js               home: usa EVENTS da eventi.js e foto.json
js/galleria.js           logica pagina galleria e visore
css/style.css            stili galleria, card con copertina, visore
foto/
  foto.json              generato dallo script, non va modificato a mano
  AAAA-MM-GG/
    grandi/001.webp …
    mini/001.webp …
scripts/prepara-foto.py  script di preparazione delle foto
```

### `js/eventi.js`

Definisce `window.HANAMI_EVENTS`, con gli stessi oggetti che oggi stanno in `EVENTS` (`id`, `title`, `start`, `end`, `place`, `price` facoltativo). Viene caricato prima di `main.js` e di `galleria.js`. La data del raduno è la parte `AAAA-MM-GG` di `start`.

### `foto/foto.json`

```json
{
  "2026-10-23": {
    "cover": 0,
    "photos": [
      { "file": "001.webp", "w": 1600, "h": 1067, "tw": 600, "th": 400 }
    ]
  }
}
```

- La chiave è la data del raduno.
- `photos` è in ordine di visualizzazione e la copertina è sempre la prima (`cover: 0`).
- `w/h` sono le dimensioni della foto grande, `tw/th` quelle della miniatura. Servono a riservare lo spazio prima del caricamento, così la pagina non si sposta.
- Percorsi: `foto/<data>/grandi/<file>` e `foto/<data>/mini/<file>`.

La pagina lo scarica con `fetch("foto/foto.json")`. Se il file manca o non è valido, il sito funziona come se non ci fossero foto.

## Esperienza utente

### Menu e footer

Menu e footer di entrambe le pagine diventano **Eventi · Galleria · Il club**. Dalla galleria, "Eventi" e "Il club" puntano a `index.html#eventi` e `index.html#club`.

### Home: card "Eventi passati"

Per un raduno con foto:

- la copertina (miniatura) sostituisce la grafica SVG, e il riquadro della data resta in alto a sinistra;
- l'etichetta "Concluso" diventa "📷 N foto";
- l'intera card è un link a `galleria.html#AAAA-MM-GG`;
- nessun filtro grigio.

Per un raduno senza foto la card resta com'è oggi: SVG in grigio, etichetta "Concluso", non cliccabile.

### Galleria: vista generale (`galleria.html`)

- Intestazione con il titolo "Galleria".
- Un blocco per ogni raduno con foto, dal più recente:
  - titolo con data e luogo, presi da `eventi.js`;
  - griglia di 6 anteprime, 3 per riga su desktop e 2 su telefono;
  - bottone "Vedi tutte (N)", che è un link a `#AAAA-MM-GG`.
- Il clic su un'anteprima apre il visore su quella foto.
- Se nessun raduno ha foto, compare il messaggio "Le foto dei raduni arriveranno presto."
- Le foto di una data che non corrisponde a nessun raduno in `eventi.js` non vengono mostrate.

### Galleria: vista singolo raduno (`galleria.html#AAAA-MM-GG`)

- Link "← Tutti i raduni" (verso `galleria.html`), titolo con data e luogo, griglia di tutte le miniature.
- La vista segue `location.hash`: reagisce all'evento `hashchange` e il tasto indietro del browser funziona.
- Un hash senza foto corrispondenti mostra la vista generale.
- Al cambio di vista la pagina torna in cima.

### Visore a schermo intero

- Elemento `<dialog>`, come il modale di iscrizione.
- Contenuto: foto grande, contatore "5 / 24", pulsanti ‹ › e ✕.
- Comandi: frecce della tastiera, Esc, swipe orizzontale su touch, clic sullo sfondo per chiudere.
- Scorre le foto del solo raduno corrente e non ricomincia da capo arrivato in fondo: alla prima e all'ultima foto la freccia corrispondente è disabilitata.
- Precarica la foto successiva e la precedente.
- `alt` delle foto: "Raduno del 23 ottobre 2026, foto 5 di 24".

### Prestazioni

- Miniature con `loading="lazy"`, `decoding="async"` e `width`/`height` impostati.
- Le foto grandi si scaricano solo nel visore.

## Script `scripts/prepara-foto.py`

Uso: `python3 scripts/prepara-foto.py <cartella-sorgente> [<data> …]`

Dipendenze: Python 3, Pillow e `sips` (incluso in macOS) per i file HEIC.

Comportamento:

1. Elabora le sottocartelle della sorgente con nome `AAAA-MM-GG`, oppure solo le date indicate. Le altre cartelle le salta e lo segnala.
2. Ordina i file per nome e mette per prima la `copertina.*`, se c'è.
3. Accetta `.jpg .jpeg .png .heic .heif .webp`, senza distinguere maiuscole e minuscole. Gli HEIC li converte prima in JPEG temporanei con `sips`.
4. Per ogni immagine:
   - applica l'orientamento EXIF (`ImageOps.exif_transpose`) e converte in RGB;
   - salva la grande (lato lungo ≤ 1600px, WebP qualità ~80) e la miniatura (lato lungo ≤ 600px, WebP qualità ~75);
   - non riduce le foto se sono già più piccole;
   - non scrive EXIF né XMP, quindi niente GPS, modello del telefono o data. Mantiene solo il profilo colore ICC, che non contiene dati personali e senza il quale le foto in Display P3 uscirebbero spente;
   - nomi di uscita `001.webp`, `002.webp`, …
5. Un file illeggibile lo salta, lo segnala e continua con gli altri.
6. Ogni data elaborata viene rigenerata da zero: prima svuota `foto/<data>/`, poi scrive i file nuovi. Le altre date in `foto/` restano intatte.
7. Aggiorna `foto/foto.json` unendo le date elaborate a quelle già presenti.
8. Avvisa se una data non corrisponde a nessun raduno in `js/eventi.js` (lettura delle date `start` con una regex).
9. Stampa un riepilogo: per ogni data numero di foto e peso, più il peso totale di `foto/`.

## Flusso per aggiungere le foto di un raduno

1. Scaricare le foto da Google Foto in `~/Desktop/foto-raduni/AAAA-MM-GG/`, rinominando la copertina come `copertina.jpg` se si vuole.
2. Lanciare `python3 scripts/prepara-foto.py ~/Desktop/foto-raduni AAAA-MM-GG`.
3. Controllare in locale, poi commit e push.

## Verifiche

- **Script**, su una cartella di test con:
  - una foto verticale con orientamento EXIF;
  - un HEIC;
  - un file non valido;
  - una cartella con nome sbagliato;
  - una data senza raduno;
  - una `copertina.jpg`.

  Controlli: orientamento corretto, dimensioni massime rispettate, nessun EXIF o GPS nelle WebP, ordine con la copertina per prima, `foto.json` coerente.
- **Pagine**, con catture in Chrome headless a larghezza desktop e mobile:
  - home con card con e senza foto;
  - galleria generale;
  - vista del singolo raduno;
  - visore aperto;
  - hash non valido;
  - `foto.json` assente.
- `node --check` sui file JS.
- Test finale dell'utente in locale, swipe da telefono compreso, prima di commit e push.

## Fuori ambito

- Download delle foto originali ad alta risoluzione.
- Didascalie per singola foto.
- Hosting esterno (Cloudflare R2): resta un'opzione futura.
