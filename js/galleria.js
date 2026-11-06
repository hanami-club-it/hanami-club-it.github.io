/* =========================================================
   Hanami Club — galleria.js
   Vista generale (anteprime per raduno), vista del singolo raduno
   (galleria.html#AAAA-MM-GG) e visore a schermo intero.
   ========================================================= */
(() => {
  "use strict";

  const F = window.HANAMI_FOTO;
  const EVENTS = window.HANAMI_EVENTS || [];
  const PREVIEW_COUNT = 6;
  const root = document.getElementById("galleryRoot");
  const fmtLong = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let entries = [];

  const eventHeading = (entry) =>
    `${escapeHTML(entry.event.title)} · ${fmtLong.format(new Date(`${entry.date}T12:00:00`))}`;

  function thumbs(entry, count) {
    const n = entry.photos.length;
    return entry.photos.slice(0, count).map((p, i) => `
      <button class="gallery__thumb" type="button" data-date="${entry.date}" data-index="${i}">
        <img src="${F.thumbUrl(entry.date, p)}" alt="${escapeHTML(F.altText(entry.event, i, n))}"
             width="${p.tw}" height="${p.th}" loading="lazy" decoding="async">
      </button>`).join("");
  }

  function renderOverview() {
    if (!entries.length) {
      root.innerHTML = `
        <div class="section__head"><h1 class="section__title"><span class="text-pink">Galleria</span></h1></div>
        <p class="events__empty">Le foto dei raduni arriveranno presto.</p>`;
      return;
    }
    root.innerHTML = `
      <div class="section__head">
        <div>
          <p class="eyebrow">I nostri raduni</p>
          <h1 class="section__title"><span class="text-pink">Galleria</span></h1>
        </div>
      </div>
      ${entries.map((entry) => `
        <article class="gallery__event">
          <header class="gallery__event-head">
            <h2 class="gallery__event-title">${eventHeading(entry)}</h2>
            <p class="gallery__event-place">${escapeHTML(entry.event.place)}</p>
          </header>
          <div class="gallery__grid">${thumbs(entry, PREVIEW_COUNT)}</div>
          <a class="btn btn--ghost gallery__more" href="#${entry.date}">Vedi tutte (${entry.photos.length})</a>
        </article>`).join("")}`;
  }

  function renderEvent(entry) {
    root.innerHTML = `
      <a class="gallery__back" href="galleria.html">← Tutti i raduni</a>
      <header class="gallery__event-head gallery__event-head--page">
        <h1 class="gallery__event-title">${eventHeading(entry)}</h1>
        <p class="gallery__event-place">${escapeHTML(entry.event.place)} · ${entry.photos.length} foto</p>
      </header>
      <div class="gallery__grid">${thumbs(entry, entry.photos.length)}</div>`;
  }

  function render() {
    const date = F.parseHash(location.hash, entries);
    if (date) renderEvent(F.entryForDate(entries, date));
    else renderOverview();
  }

  /* ---------- Visore ---------- */
  function openViewer(entry, index) {
    // Implementato nel visore (Task 5)
    void entry; void index;
  }

  root.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".gallery__thumb");
    if (!btn) return;
    const entry = F.entryForDate(entries, btn.dataset.date);
    if (entry) openViewer(entry, Number(btn.dataset.index), btn);
  });

  // "Torna su" non deve cambiare l'hash (cambierebbe vista)
  document.addEventListener("click", (ev) => {
    const top = ev.target.closest('a[href="#top"]');
    if (!top) return;
    ev.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("hashchange", () => {
    render();
    window.scrollTo(0, 0);
  });

  F.loadManifest().then((manifest) => {
    entries = F.galleryEntries(EVENTS, manifest);
    render();
  });
})();
