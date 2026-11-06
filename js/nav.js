/* =========================================================
   Hanami Club — nav.js
   Barra di navigazione e anno nel footer, comuni a tutte le pagine.
   ========================================================= */
(() => {
  "use strict";

  const nav = document.querySelector(".nav");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");

  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
    links.classList.toggle("is-open", open);
    nav.classList.toggle("menu-open", open);
  }
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  links.addEventListener("click", (ev) => { if (ev.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") setMenu(false); });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
