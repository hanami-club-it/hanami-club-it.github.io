/* =========================================================
   Hanami Club — foto.js
   Logica della galleria senza DOM: usata da main.js (home) e
   galleria.js, testata con `node --test tests/*.test.js`.
   ========================================================= */
(function () {
  "use strict";

  const DATE_HASH = /^#(\d{4}-\d{2}-\d{2})$/;
  const fmtLongDate = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });

  // La data del raduno è la parte AAAA-MM-GG di start: niente Date, così
  // il fuso orario non può spostarla al giorno prima.
  const eventDate = (event) => event.start.slice(0, 10);

  function galleryEntries(events, manifest) {
    if (!manifest || typeof manifest !== "object") return [];
    const byDate = new Map(events.map((e) => [eventDate(e), e]));
    return Object.keys(manifest)
      .filter((date) => byDate.has(date) && Array.isArray(manifest[date].photos) && manifest[date].photos.length > 0)
      .sort()
      .reverse()
      .map((date) => ({ date, event: byDate.get(date), photos: manifest[date].photos }));
  }

  const entryForDate = (entries, date) => entries.find((e) => e.date === date);

  const thumbUrl = (date, photo) => `foto/${date}/mini/${photo.file}`;
  const fullUrl = (date, photo) => `foto/${date}/grandi/${photo.file}`;

  function parseHash(hash, entries) {
    const m = DATE_HASH.exec(hash || "");
    return m && entryForDate(entries, m[1]) ? m[1] : null;
  }

  function altText(event, index, total) {
    const day = fmtLongDate.format(new Date(`${eventDate(event)}T12:00:00`));
    return `${event.title} del ${day}, foto ${index + 1} di ${total}`;
  }

  const stepIndex = (index, delta, total) => Math.min(Math.max(index + delta, 0), Math.max(total - 1, 0));

  function loadManifest(url = "foto/foto.json") {
    return fetch(url, { cache: "no-cache" })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => (data && typeof data === "object" && !Array.isArray(data) ? data : {}))
      .catch(() => ({}));
  }

  const api = { eventDate, galleryEntries, entryForDate, thumbUrl, fullUrl, parseHash, altText, stepIndex, loadManifest };
  if (typeof window !== "undefined") window.HANAMI_FOTO = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
