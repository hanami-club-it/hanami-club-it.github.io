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
        <div class="section__head"><h1 class="section__title" tabindex="-1"><span class="text-pink">Galleria</span></h1></div>
        <p class="events__empty">Le foto dei raduni arriveranno presto.</p>`;
      return;
    }
    root.innerHTML = `
      <div class="section__head">
        <div>
          <p class="eyebrow">I nostri raduni</p>
          <h1 class="section__title" tabindex="-1"><span class="text-pink">Galleria</span></h1>
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
        <h1 class="gallery__event-title" tabindex="-1">${eventHeading(entry)}</h1>
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
  const viewer = document.getElementById("viewer");
  const vImg = document.getElementById("viewerImg");
  const vCount = document.getElementById("viewerCount");
  const vPrev = viewer.querySelector(".viewer__prev");
  const vNext = viewer.querySelector(".viewer__next");
  const view = { entry: null, index: 0, opener: null };

  function preload(i) {
    const p = view.entry.photos[i];
    if (p) new Image().src = F.fullUrl(view.entry.date, p);
  }

  function show(i) {
    const { entry } = view;
    const n = entry.photos.length;
    const p = entry.photos[i];
    view.index = i;
    vImg.src = F.fullUrl(entry.date, p);
    vImg.width = p.w;
    vImg.height = p.h;
    vImg.alt = F.altText(entry.event, i, n);
    vCount.textContent = `${i + 1} / ${n}`;
    vPrev.disabled = i === 0;
    vNext.disabled = i === n - 1;
    preload(i + 1);
    preload(i - 1);
  }

  const step = (delta) => {
    const next = F.stepIndex(view.index, delta, view.entry.photos.length);
    if (next !== view.index) show(next);
  };

  function openViewer(entry, index, opener) {
    view.entry = entry;
    view.opener = opener || null;
    show(index);
    if (typeof viewer.showModal === "function") viewer.showModal();
    else viewer.setAttribute("open", "");
  }

  vPrev.addEventListener("click", () => step(-1));
  vNext.addEventListener("click", () => step(1));
  viewer.querySelector(".viewer__close").addEventListener("click", () => viewer.close());
  // Clic fuori dalla foto e dai pulsanti: chiude
  viewer.addEventListener("click", (ev) => {
    if (ev.target === viewer || ev.target.classList.contains("viewer__stage")) viewer.close();
  });
  // Su document: se il pulsante con il focus viene disabilitato, il focus
  // esce dal dialog ma le frecce devono continuare a funzionare
  document.addEventListener("keydown", (ev) => {
    if (!viewer.open) return;
    if (ev.key === "ArrowLeft") { ev.preventDefault(); step(-1); }
    else if (ev.key === "ArrowRight") { ev.preventDefault(); step(1); }
  });
  viewer.addEventListener("close", () => {
    vImg.removeAttribute("src");
    if (view.opener) view.opener.focus();
  });

  // Swipe orizzontale (touch e penna)
  let swipe = null;
  vImg.addEventListener("pointerdown", (ev) => { swipe = { x: ev.clientX, y: ev.clientY }; });
  vImg.addEventListener("pointerup", (ev) => {
    if (!swipe) return;
    const dx = ev.clientX - swipe.x;
    const dy = ev.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
  });
  vImg.addEventListener("pointercancel", () => { swipe = null; });
  vImg.addEventListener("dragstart", (ev) => ev.preventDefault());

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

  // Cambio vista (link o tasto indietro): chiude il visore se aperto, così
  // "indietro" su Android chiude la foto invece di lasciarla sopra la nuova vista,
  // e porta il focus sul titolo della nuova vista per chi usa tastiera o screen reader
  window.addEventListener("hashchange", () => {
    if (viewer.open) {
      view.opener = null;
      viewer.close();
    }
    render();
    window.scrollTo(0, 0);
    const title = root.querySelector("h1");
    if (title) title.focus({ preventScroll: true });
  });

  F.loadManifest().then((manifest) => {
    entries = F.galleryEntries(EVENTS, manifest);
    render();
  });
})();
