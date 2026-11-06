// Test di js/foto.js — lanciare con: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../js/foto.js");

const photo = (file) => ({ file, w: 1600, h: 1067, tw: 600, th: 400 });
const EVENTS = [
  { id: "r1", title: "Raduno", start: "2026-04-07T20:30:00", end: "00:00", place: "Gallarate" },
  { id: "r2", title: "Raduno", start: "2026-05-29T20:30:00", end: "00:00", place: "Gallarate" },
  { id: "r3", title: "Raduno", start: "2026-10-23T20:30:00", end: "00:00", place: "Gallarate" },
];
const MANIFEST = {
  "2025-01-01": { cover: 0, photos: [photo("001.webp")] },
  "2026-04-07": { cover: 0, photos: [] },
  "2026-05-29": { cover: 0, photos: [photo("001.webp")] },
  "2026-10-23": { cover: 0, photos: [photo("001.webp"), photo("002.webp")] },
};

test("eventDate usa la stringa start, senza conversioni di fuso orario", () => {
  assert.equal(F.eventDate({ start: "2026-04-07T00:30:00" }), "2026-04-07");
});

test("galleryEntries: solo date con raduno e foto, dalla più recente", () => {
  const entries = F.galleryEntries(EVENTS, MANIFEST);
  assert.deepEqual(entries.map((e) => e.date), ["2026-10-23", "2026-05-29"]);
  assert.equal(entries[0].event.id, "r3");
  assert.deepEqual(entries[0].photos.map((p) => p.file), ["001.webp", "002.webp"]);
});

test("galleryEntries con manifest vuoto o non valido", () => {
  assert.deepEqual(F.galleryEntries(EVENTS, {}), []);
  assert.deepEqual(F.galleryEntries(EVENTS, null), []);
});

test("entryForDate trova la voce o undefined", () => {
  const entries = F.galleryEntries(EVENTS, MANIFEST);
  assert.equal(F.entryForDate(entries, "2026-05-29").event.id, "r2");
  assert.equal(F.entryForDate(entries, "2026-04-07"), undefined);
});

test("parseHash accetta solo date con foto", () => {
  const entries = F.galleryEntries(EVENTS, MANIFEST);
  assert.equal(F.parseHash("#2026-10-23", entries), "2026-10-23");
  for (const h of ["#club", "#2026-13-45", "", "#2026-04-07", "#2026-10-23x"]) {
    assert.equal(F.parseHash(h, entries), null, h);
  }
});

test("thumbUrl e fullUrl", () => {
  assert.equal(F.thumbUrl("2026-10-23", { file: "001.webp" }), "foto/2026-10-23/mini/001.webp");
  assert.equal(F.fullUrl("2026-10-23", { file: "001.webp" }), "foto/2026-10-23/grandi/001.webp");
});

test("altText", () => {
  assert.equal(
    F.altText({ title: "Raduno", start: "2026-10-23T20:30:00" }, 4, 24),
    "Raduno del 23 ottobre 2026, foto 5 di 24"
  );
});

test("stepIndex resta nei limiti, senza ricominciare da capo", () => {
  assert.equal(F.stepIndex(0, -1, 5), 0);
  assert.equal(F.stepIndex(4, 1, 5), 4);
  assert.equal(F.stepIndex(2, 1, 5), 3);
  assert.equal(F.stepIndex(0, 1, 1), 0);
});
