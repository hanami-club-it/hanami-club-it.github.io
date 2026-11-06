# Galleria foto dei raduni — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Obiettivo:** pagina Galleria con anteprime per raduno, vista "Vedi tutte" e visore a schermo intero. In home, copertina sulle card degli eventi passati. Foto ottimizzate da uno script e pubblicate da GitHub Pages.

**Architettura:**
- Sito statico senza build: HTML, CSS e JS vanilla.
- Uno script Python trasforma le cartelle `AAAA-MM-GG` di foto in WebP dentro `foto/` e scrive `foto/foto.json`.
- Il JS legge `foto.json` e l'elenco raduni condiviso (`js/eventi.js`). La logica pura sta in `js/foto.js`, testabile con Node; il DOM sta in `main.js` (home) e `galleria.js` (galleria e visore).

**Stack:**
- Python 3.13 con Pillow 11 (unittest della libreria standard) e `sips` di macOS per l'HEIC.
- JS vanilla, testato con `node --test` (Node 23).
- Verifica visiva con Chrome headless.

**Spec:** `docs/superpowers/specs/2026-11-06-galleria-foto-design.md`

## Vincoli globali

- Nessuna libreria esterna e nessuna CDN: tutto è servito dal sito stesso.
- Tutti i testi visibili sono in italiano.
- Foto grande: lato lungo ≤ 1600px, WebP qualità 80. Miniatura: lato lungo ≤ 600px, WebP qualità 75. Le immagini più piccole non vengono ingrandite.
- Nelle WebP non va scritto EXIF né XMP. Va mantenuto solo il profilo ICC.
- File di uscita `001.webp`, `002.webp`… in `foto/<data>/grandi/` e `foto/<data>/mini/`.
- `foto.json`: `{ "<data>": { "cover": 0, "photos": [ { "file", "w", "h", "tw", "th" } ] } }`, con la copertina sempre per prima.
- Anteprime in galleria: 6. Vista singolo raduno: `galleria.html#AAAA-MM-GG`.
- Menu e footer di entrambe le pagine: **Eventi · Galleria · Il club**.
- Testo alternativo delle foto: `"<titolo> del <d mese aaaa>, foto <i> di <n>"`, ad esempio `Raduno del 23 ottobre 2026, foto 5 di 24`.
- Etichetta delle card con foto: `📷 <n> foto`.
- Messaggio con galleria vuota: `Le foto dei raduni arriveranno presto.`
- Commit diretti su `master` (flusso del progetto); push solo dopo l'ok dell'utente.

## Punti da controllare in revisione

1. **Fuso orario:** la data di un raduno deve essere la parte `AAAA-MM-GG` della stringa `start`, non un `Date` convertito. Un raduno alle `00:30` non deve finire al giorno prima. Test in Task 2.
2. **File scaricati da Google Foto:** estensioni maiuscole (`.JPG`, `.HEIC`), video `.MP4` e file `.json` nello zip. Le immagini vanno accettate qualunque sia il maiuscolo; gli altri file vanno saltati senza bloccare lo script. Test in Task 1.
3. **Rilancio con meno foto:** dopo aver tolto foto dalla cartella sorgente e rilanciato lo script, in `foto/<data>/` non devono restare WebP vecchie. Test in Task 1.
4. **Hash non valido:** `#club`, `#2026-13-45` o una data senza foto devono mostrare la vista generale, senza errori in console. Test in Task 2 (`parseHash`) e verifica in Task 4.
5. **Ai bordi del visore:** raduno con una sola foto, oppure freccia o swipe sull'ultima foto. Nessun giro da capo e nessun errore; le frecce vanno disabilitate. Test in Task 2 (`stepIndex`) e verifica in Task 5.
6. **`foto.json` assente o pagina aperta come file locale:** il sito funziona come senza foto. Verifica in Task 3 e Task 4.

---

### Task 1: Script `scripts/prepara-foto.py`

**File:**
- Crea: `scripts/prepara-foto.py`
- Crea: `tests/test_prepara_foto.py`
- Crea: `foto/foto.json` con contenuto `{}`

**Interfacce:**
- Produce (funzioni del modulo, importato nei test con `importlib.util.spec_from_file_location`):
  - `IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"}`
  - `event_dates(eventi_js: str) -> set[str]`: date `AAAA-MM-GG` estratte da `start: "AAAA-MM-GGT…"`
  - `ordered_sources(folder: Path) -> list[Path]`: solo immagini, ordinate per `name.lower()`, con `copertina.*` per prima; esclude i file nascosti
  - `process_date(src: Path, out_root: Path, date: str) -> tuple[dict | None, list[str]]`: rigenera `out_root/<date>/` da zero e restituisce la voce del manifest (o `None` se non ci sono foto valide; in quel caso la cartella di uscita viene rimossa) più l'elenco degli avvisi
  - `update_manifest(out_root: Path, entries: dict[str, dict | None]) -> dict`: unisce le voci a `foto.json`, rimuove le chiavi con valore `None`, scrive con le chiavi ordinate e restituisce il manifest
  - `main(argv: list[str]) -> int`: `prepara-foto.py <sorgente> [data …] [--out DIR] [--eventi FILE]`. Valori predefiniti: `<repo>/foto` e `<repo>/js/eventi.js`, ricavati da `Path(__file__).resolve().parent.parent`. Restituisce 0 se va tutto bene, 1 se la sorgente non esiste
- Formato del manifest: quello indicato nei Vincoli globali.

- [ ] **Passo 1: scrivere i test che falliscono** in `tests/test_prepara_foto.py`, con `unittest` e `tempfile.TemporaryDirectory`. Un helper `make_jpeg(path, size, exif=None)` crea immagini con Pillow. Test:
  - `test_event_dates`: dal testo `start: "2026-10-23T20:30:00"` e `start: "2026-04-07T00:30:00"` ricava `{"2026-10-23", "2026-04-07"}`.
  - `test_ordered_sources_cover_first_and_case_insensitive`: con i file `b.JPG`, `a.jpg`, `copertina.jpeg`, `video.MP4`, `meta.json` e `.DS_Store`, il risultato è `["copertina.jpeg", "a.jpg", "b.JPG"]`.
  - `test_process_date_sizes_and_names`: da un 4000×3000 e un 800×600 escono `grandi/001.webp` 1600×1200, `mini/001.webp` 600×450 e `grandi/002.webp` 800×600, che non viene ingrandita. La voce ha `cover == 0` e `photos[0] == {"file": "001.webp", "w": 1600, "h": 1200, "tw": 600, "th": 450}`.
  - `test_process_date_applies_orientation`: un JPEG 400×200 con EXIF `Orientation=6` produce una WebP 200×400.
  - `test_process_date_strips_exif_gps`: un JPEG con EXIF GPS (tag 0x8825) produce una WebP in cui `Image.open(...).getexif()` è vuoto e `info` non contiene `"exif"` né `"xmp"`.
  - `test_process_date_rerun_removes_stale`: dopo un primo giro con 3 foto e un secondo con 2, in `grandi/` ci sono esattamente `001.webp` e `002.webp`.
  - `test_process_date_corrupt_file_warns_and_continues`: con `rotto.jpg` (byte casuali) e una foto valida, il manifest ha 1 foto e gli avvisi contengono `"rotto.jpg"`.
  - `test_process_date_no_valid_photos_returns_none`: una cartella con solo `video.mp4` restituisce `None` e `out_root/<date>` non esiste.
  - `test_process_date_heic` (`skipUnless(shutil.which("sips"))`): un HEIC creato con `sips -s format heic` viene convertito in una WebP valida.
  - `test_update_manifest_merges_and_removes`: con `foto.json` esistente `{"2026-04-07": {...}}`, l'aggiornamento `{"2026-10-23": X, "2026-04-07": None}` produce `{"2026-10-23": X}` su disco.
  - `test_main_skips_bad_folder_names_and_warns_unknown_date`: con le cartelle `appunti/` e `2025-01-01/` (data assente da `eventi.js`), la funzione restituisce 0. L'output contiene `"appunti"` (saltata) e un avviso per `2025-01-01`, la cui voce va comunque nel manifest.

- [ ] **Passo 2: lanciare i test e verificare che falliscano**
  Comando: `python3 -m unittest tests/test_prepara_foto.py -v`
  Atteso: errore all'import, perché `scripts/prepara-foto.py` non esiste.

- [ ] **Passo 3: implementare lo script.** Note:
  - HEIC/HEIF: `sips -s format jpeg <in> --out <tmp>.jpg` in una `TemporaryDirectory`, poi si procede come per un JPEG.
  - Pipeline: `Image.open` → `ImageOps.exif_transpose` → `convert("RGB")` → `thumbnail((1600, 1600))` per la grande e `thumbnail((600, 600))` per la miniatura, ognuna da una copia → `save(..., "WEBP", quality=…, method=6, icc_profile=img.info.get("icc_profile"))`, senza passare `exif`.
  - Gli errori di apertura o conversione (`OSError`, `Image.DecompressionBombError`, `subprocess.CalledProcessError`) generano un avviso `"<nome>: saltato (<motivo>)"`.
  - Riepilogo finale stampato da `main`: per ogni data `"<data>: N foto, X.X MB"`, poi `"Totale foto/: X.X MB"`.
  - Docstring in cima allo script con il flusso d'uso in 3 passi preso dalla spec.

- [ ] **Passo 4: lanciare i test e verificare che passino**
  Comando: `python3 -m unittest tests/test_prepara_foto.py -v`
  Atteso: tutti `ok`, oppure `skipped` solo per HEIC se `sips` manca.

- [ ] **Passo 5: commit**
  ```bash
  git add scripts/prepara-foto.py tests/test_prepara_foto.py foto/foto.json
  git commit -m "Script prepara-foto: WebP ottimizzate e foto.json per la galleria"
  ```

---

### Task 2: Logica pura `js/foto.js`

**File:**
- Crea: `js/foto.js`
- Crea: `tests/foto.test.js`

**Interfacce:**
- Produce `window.HANAMI_FOTO` nel browser e `module.exports` in Node, con:
  - `eventDate(event) -> string`: `event.start.slice(0, 10)`
  - `galleryEntries(events, manifest) -> Array<{ date, event, photos }>`: solo le date che hanno un raduno e almeno una foto, ordinate per data decrescente; `photos` mantiene l'ordine del manifest
  - `entryForDate(entries, date) -> entry | undefined`
  - `thumbUrl(date, photo) -> string` = `foto/<date>/mini/<file>`; `fullUrl(date, photo) -> string` = `foto/<date>/grandi/<file>`
  - `parseHash(hash, entries) -> string | null`: la data se `hash` corrisponde a `/^#\d{4}-\d{2}-\d{2}$/` e c'è una voce per quella data, altrimenti `null`
  - `altText(event, index, total) -> string`: `index` parte da 0; data formattata con `Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" })` su `new Date(eventDate(event) + "T12:00:00")`
  - `stepIndex(index, delta, total) -> number`: limita il risultato a `[0, total - 1]`, senza giro da capo
  - `loadManifest(url = "foto/foto.json") -> Promise<object>`: `fetch` con `cache: "no-cache"`; restituisce `{}` per qualsiasi errore o JSON che non sia un oggetto (non coperta dai test unitari)
- File caricato con un `<script>` classico, senza moduli ES: un'IIFE che assegna `window.HANAMI_FOTO` se `window` esiste e `module.exports` se `module` esiste.

- [ ] **Passo 1: scrivere i test che falliscono** in `tests/foto.test.js` (`node:test`, `node:assert/strict`, `require("../js/foto.js")`):
  - `eventDate`: `{start: "2026-04-07T00:30:00"}` → `"2026-04-07"`.
  - `galleryEntries`: con 3 raduni (date 04-07, 05-29, 10-23) e un manifest con foto per 05-29 e 10-23, una voce `2025-01-01` senza raduno e una voce 04-07 con `photos: []`, il risultato ha date `["2026-10-23", "2026-05-29"]`.
  - `parseHash`: `"#2026-10-23"` → `"2026-10-23"`. `"#club"`, `"#2026-13-45"`, `""` e `"#2026-04-07"` (data senza voce) → `null`.
  - `thumbUrl` / `fullUrl`: `("2026-10-23", {file: "001.webp"})` → `"foto/2026-10-23/mini/001.webp"` / `"foto/2026-10-23/grandi/001.webp"`.
  - `altText({title: "Raduno", start: "2026-10-23T20:30:00"}, 4, 24)` → `"Raduno del 23 ottobre 2026, foto 5 di 24"`.
  - `stepIndex`: `(0, -1, 5)` → 0; `(4, 1, 5)` → 4; `(2, 1, 5)` → 3; `(0, 1, 1)` → 0.

- [ ] **Passo 2: lanciare i test e verificare che falliscano**
  Comando: `node --test tests/`
  Atteso: FAIL, `Cannot find module '../js/foto.js'`.

- [ ] **Passo 3: implementare `js/foto.js`** con le firme indicate sopra.

- [ ] **Passo 4: lanciare i test e verificare che passino**
  Comando: `node --test tests/`
  Atteso: tutti i test `ok`.

- [ ] **Passo 5: commit**
  ```bash
  git add js/foto.js tests/foto.test.js
  git commit -m "Logica galleria: voci per raduno, URL foto, hash, testo alternativo"
  ```

---

### Task 3: Raduni condivisi, menu e copertine in home

**File:**
- Crea: `js/eventi.js` (l'array `EVENTS` di `js/main.js` spostato senza modifiche, con il suo commento, in `window.HANAMI_EVENTS`)
- Modifica: `js/main.js`
  - `const EVENTS = window.HANAMI_EVENTS;` al posto dell'array
  - in `eventCard`, la variante per i raduni passati con foto
  - il primo render resta sincrono; dopo `loadManifest()` si fa di nuovo `renderEvents()`
- Modifica: `index.html`
  - script in quest'ordine prima di `main.js`: `js/eventi.js`, `js/foto.js`
  - aggiungere `<a href="galleria.html">Galleria</a>` tra "Eventi" e "Il club" nel menu e nel footer
- Modifica: `css/style.css`: stili `.event--photo` e `.event__cover`

**Interfacce:**
- Consuma: `HANAMI_FOTO.loadManifest`, `galleryEntries`, `entryForDate`, `eventDate`, `thumbUrl` (Task 2).
- Produce: `window.HANAMI_EVENTS` (array dei raduni) per il Task 4.

**Comportamento della card passata con foto** (spec, "Home: card Eventi passati"):
- è un `<a class="event event--past event--photo" href="galleria.html#<data>">`;
- `.event__visual` contiene `<img class="event__cover" src="<thumbUrl della photos[0]>" alt="" loading="lazy" decoding="async" width height>`, con `object-fit: cover` e senza filtro grigio;
- `.tag` mostra `📷 <n> foto`;
- il riquadro della data resta com'è.

Le card senza foto restano identiche a oggi.

- [ ] **Passo 1: preparare dati di prova (da non committare).** Generare 3 JPEG sintetici con Pillow in una cartella scratch `<scratch>/raduni/2026-10-23/` e lanciare:
  `python3 scripts/prepara-foto.py <scratch>/raduni`
  Atteso: `2026-10-23: 3 foto`; `foto/foto.json` contiene la chiave `2026-10-23`.

- [ ] **Passo 2: implementare le modifiche elencate sopra.**

- [ ] **Passo 3: verificare**
  - `node --check js/main.js js/eventi.js js/foto.js` → nessun output.
  - Cattura con Chrome headless, a 1280px e a 390px, di un'anteprima con `.hero{min-height:0}` (come nella sessione precedente, cartella scratch con link simbolici a `css`, `js`, `fonts` e `foto`). Atteso:
    - la card del 23/10 ha la copertina e `📷 3 foto`;
    - le altre 3 card sono grigie con "Concluso";
    - nel menu c'è "Galleria".
  - Rinominare temporaneamente `foto/foto.json` e ricaricare. Atteso: tutte e 4 le card grigie e nessun errore in console (`--enable-logging=stderr --v=0` e grep di `Uncaught`).

- [ ] **Passo 4: ripulire i dati di prova**
  Comando: `git checkout foto/foto.json && rm -rf foto/2026-*`
  Atteso: `git status --short foto/` vuoto.

- [ ] **Passo 5: commit**
  ```bash
  git add js/eventi.js js/main.js index.html css/style.css
  git commit -m "Home: copertina sulle card dei raduni passati e link Galleria"
  ```

---

### Task 4: Pagina `galleria.html`: vista generale e vista del singolo raduno

**File:**
- Crea: `galleria.html`
  - stesso `<head>` di `index.html` (font, CSS, favicon) con titolo `Galleria — Hanami Club` e meta description sulla galleria
  - stessa nav e footer, con link `index.html#eventi`, `galleria.html`, `index.html#club` e logo che punta a `index.html`
  - `<main>` con `<section class="section gallery" id="galleria">`
  - script: `js/eventi.js`, `js/foto.js`, `js/galleria.js`
- Crea: `js/galleria.js` (IIFE)
- Modifica: `css/style.css`: blocco `/* ---------- Galleria ---------- */`
- Modifica: `js/main.js`
  - spostare in `js/galleria.js`, duplicandolo, il solo codice della nav (scroll ed hamburger), oppure estrarlo in `js/nav.js` caricato da entrambe le pagine
  - scelta: **estrarre in `js/nav.js`**, così non si duplica
- Modifica: `index.html`: caricare `js/nav.js` prima di `js/main.js`

**Interfacce:**
- Consuma: `window.HANAMI_EVENTS` (Task 3) e `HANAMI_FOTO.*` (Task 2).
- Produce, per il Task 5, in `js/galleria.js`: `openViewer(entry, index)`, chiamata dai clic sulle miniature con `data-date` e `data-index`. In questo task è un segnaposto vuoto.

**Comportamento** (spec, "Galleria: vista generale" e "Galleria: vista singolo raduno"):
- `render()` legge `parseHash(location.hash, entries)`:
  - con `null` → vista generale: per ogni voce, `<h2>` con data lunga e luogo, griglia delle prime 6 `photos` e `<a class="btn btn--ghost" href="#<data>">Vedi tutte (<n>)</a>`;
  - con una data → `<a href="galleria.html">← Tutti i raduni</a>`, titolo e griglia di tutte le foto;
  - se `entries` è vuoto → `<p class="events__empty">Le foto dei raduni arriveranno presto.</p>`.
- Ogni miniatura è `<button class="gallery__thumb" data-date data-index>` con `<img src=thumbUrl alt=altText width=tw height=th loading="lazy" decoding="async">`.
- Griglia: `grid-template-columns: repeat(3, 1fr)`, con 2 colonne sotto i 600px e `aspect-ratio: 1` sulle miniature (`object-fit: cover`).
- `window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); })`.
- Avvio: `loadManifest().then(m => { entries = galleryEntries(HANAMI_EVENTS, m); render(); })`.

- [ ] **Passo 1: preparare dati di prova** come nel Task 3, Passo 1, ma con 2 date (`2026-10-23` con 8 foto, `2026-10-04` con 1 foto).

- [ ] **Passo 2: implementare** `js/nav.js`, `galleria.html`, `js/galleria.js` e il CSS.

- [ ] **Passo 3: verificare**
  - `node --check js/*.js && node --test tests/` → tutti `ok`.
  - Catture con Chrome headless (1280px e 390px) di:
    - `galleria.html`: 2 blocchi, il 23/10 per primo con 6 miniature e "Vedi tutte (8)", il 04/10 con 1 miniatura e "Vedi tutte (1)";
    - `galleria.html#2026-10-23`: "← Tutti i raduni" e 8 miniature;
    - `galleria.html#club` e `galleria.html#2026-04-07`: vista generale;
    - `galleria.html` con `foto.json` rinominato: messaggio "Le foto dei raduni arriveranno presto.".
  - In nessuna cattura ci sono errori in console.
  - In home, la nav funziona ancora (hamburger a 390px) dopo l'estrazione in `nav.js`.

- [ ] **Passo 4: ripulire i dati di prova** (come nel Task 3, Passo 4).

- [ ] **Passo 5: commit**
  ```bash
  git add galleria.html js/galleria.js js/nav.js js/main.js index.html css/style.css
  git commit -m "Pagina Galleria: anteprime per raduno e vista Vedi tutte"
  ```

---

### Task 5: Visore a schermo intero

**File:**
- Modifica: `galleria.html`: `<dialog class="viewer" id="viewer" aria-label="Foto">` con:
  - `<img class="viewer__img">`;
  - `<p class="viewer__count">`;
  - i pulsanti `.viewer__prev` (`aria-label="Foto precedente"`), `.viewer__next` (`aria-label="Foto successiva"`) e `.viewer__close` (`aria-label="Chiudi"`).
- Modifica: `js/galleria.js`: implementare `openViewer(entry, index)`.
- Modifica: `css/style.css`: blocco `/* ---------- Visore ---------- */`
  - dialog a tutto schermo con sfondo `rgba(0,0,0,.92)`;
  - immagine `max-width: 100%; max-height: calc(100svh - 120px); object-fit: contain`;
  - pulsanti nello stile di `.modal__close`, con hover rosa.

**Interfacce:**
- Consuma: `stepIndex`, `fullUrl`, `altText` (Task 2) e `openViewer` (segnaposto del Task 4).

**Comportamento** (spec, "Visore a schermo intero"):
- `show(i)`:
  - imposta `src` ed `alt` della foto;
  - aggiorna il contatore `"<i+1> / <n>"`;
  - disabilita `prev` se `i === 0` e `next` se `i === n - 1`;
  - precarica le foto `i ± 1` con `new Image().src`.
- Tastiera, con dialog aperto: `ArrowLeft` → `show(stepIndex(i, -1, n))` e `ArrowRight` → `show(stepIndex(i, 1, n))`. Esc chiude, come fa nativamente `<dialog>`.
- Swipe: `pointerdown` e `pointerup` sull'immagine; con `|dx| > 50` e `|dx| > |dy|` va avanti o indietro.
- Il clic sullo sfondo (`ev.target === dialog`) chiude.
- Alla chiusura il focus torna alla miniatura che ha aperto il visore.

- [ ] **Passo 1: preparare dati di prova** come nel Task 4, Passo 1.

- [ ] **Passo 2: implementare** il visore come descritto sopra.

- [ ] **Passo 3: verificare**
  - `node --check js/galleria.js && node --test tests/` → `ok`.
  - Verifica scriptata con Chrome headless e `--remote-debugging-port`. In alternativa, aggiungere temporaneamente in un'anteprima scratch, non nel repository, un piccolo script che apre il visore sull'ultima foto del 23/10 e fa la cattura. Atteso:
    - contatore `8 / 8`;
    - freccia › disabilitata;
    - sul raduno del 04/10 (1 foto) entrambe le frecce disabilitate.
  - Il test manuale completo lo fa l'utente al passo 5: frecce, Esc, clic sullo sfondo, swipe da telefono.

- [ ] **Passo 4: ripulire i dati di prova** (come nel Task 3, Passo 4).

- [ ] **Passo 5: commit**
  ```bash
  git add galleria.html js/galleria.js css/style.css
  git commit -m "Galleria: visore a schermo intero con frecce, swipe e tastiera"
  ```

---

### Task 6: Verifica finale con l'utente

**File:** nessuno nuovo. Al massimo correzioni emerse dal test.

- [ ] **Passo 1:** `python3 -m unittest tests/test_prepara_foto.py -v && node --test tests/` → tutto `ok`.
- [ ] **Passo 2:**
  - Se l'utente ha già messo le foto vere in `~/Desktop/foto-raduni/<data>/`: `python3 scripts/prepara-foto.py ~/Desktop/foto-raduni` e controllo del riepilogo (circa 300 KB per foto).
  - Altrimenti: dati di prova come nel Task 4.
- [ ] **Passo 3:** server locale su `http://127.0.0.1:8765`. L'utente verifica home, galleria, "Vedi tutte", visore e swipe da telefono (sulla stessa rete Wi-Fi: `python3 -m http.server 8765 --bind 0.0.0.0` e IP del Mac).
- [ ] **Passo 4:**
  - Con foto vere: `git add foto/ && git commit -m "Foto dei raduni"`.
  - Con dati di prova: pulizia come nel Task 3, Passo 4.
- [ ] **Passo 5:** push su `master` solo dopo l'ok esplicito dell'utente.
