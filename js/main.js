/* =========================================================
   Hanami Club — main.js
   ========================================================= */
(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Google Form iscrizioni ----------
     Le iscrizioni dal modale vengono inviate a questo Google Form.
     Gli ID "entry.N" si leggono dal link precompilato del form.
     Le opzioni (ruolo, regolamento) devono coincidere carattere per
     carattere con quelle del form, altrimenti Google scarta la risposta.
  */
  const GOOGLE_FORM = {
    action: "https://docs.google.com/forms/d/e/1FAIpQLSeIfJsyfQRoNb-WZJqBc1h9cee6qH4RKsm8_v2-BzTtJtYR5Q/formResponse",
    fields: {
      event: "entry.691811434",
      name: "entry.1024230649",
      email: "entry.378858091",
      car: "entry.1673246653",
      role: "entry.1126059279",
      terms: "entry.1482558823",
    },
    termsValue: "Accetto il regolamento dell'evento e le norme di controllo sicurezza.",
  };

  const EVENTS = window.HANAMI_EVENTS || [];

  /* ---------- Storage sicuro ---------- */
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignorato */ }
    },
  };
  const registered = new Set(store.get("hanami:registered", []));

  /* ---------- Formattazione ---------- */
  const fmtDay = new Intl.DateTimeFormat("it-IT", { day: "2-digit" });
  const fmtMonth = new Intl.DateTimeFormat("it-IT", { month: "short" });
  const fmtLong = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtTime = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });
  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Visual card evento ---------- */
  function eventVisual(seed) {
    const P = "#f542f5";
    let cars = "";
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 62;
      cars += `<g opacity="${1 - i * 0.12}"><rect x="${x}" y="105" width="52" height="22" rx="7" fill="none" stroke="${P}" stroke-width="3"/><circle cx="${x + 11}" cy="116" r="4" fill="${P}"/><circle cx="${x + 41}" cy="116" r="4" fill="${P}"/></g>`;
    }
    return `<svg viewBox="0 0 400 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><radialGradient id="g${seed}" cx="70%" cy="40%" r="70%"><stop offset="0" stop-color="${P}" stop-opacity=".35"/><stop offset="1" stop-color="${P}" stop-opacity="0"/></radialGradient></defs>
      <rect width="400" height="170" fill="url(#g${seed})"/>
      <line x1="0" y1="140" x2="400" y2="140" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>${cars}</svg>`;
  }

  const ICON_PIN = `<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
  const ICON_CLOCK = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
  const ICON_CAL = `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`;

  /* ---------- Render eventi ---------- */
  const grid = document.getElementById("eventsGrid");
  const empty = document.getElementById("eventsEmpty");
  const pastGrid = document.getElementById("pastGrid");
  const pastBlock = document.getElementById("pastEvents");

  const isUpcoming = (e) => new Date(e.start).getTime() > Date.now();

  function upcomingEvents() {
    return EVENTS.filter(isUpcoming).sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  function pastEvents() {
    return EVENTS.filter((e) => !isUpcoming(e)).sort((a, b) => new Date(b.start) - new Date(a.start));
  }

  function priceLabel(e) {
    if (e.price === undefined) return "";
    return `<span class="event__price">${e.price === 0 ? "Gratis" : `€${e.price} <small>a persona</small>`}</span>`;
  }

  // Foto per data (da foto/foto.json); vuoto finché il manifest non è caricato
  const FOTO = window.HANAMI_FOTO;
  let photoEntries = [];

  function pastPhotoCard(e, i, entry) {
    const d = new Date(e.start);
    const cover = entry.photos[0];
    return `
      <a class="event event--past event--photo" href="galleria.html#${entry.date}" style="animation-delay:${i * 60}ms"
         aria-label="Foto del raduno del ${fmtLong.format(d)}">
        <div class="event__visual">
          <img class="event__cover" src="${FOTO.thumbUrl(entry.date, cover)}" alt="" width="${cover.tw}" height="${cover.th}" loading="lazy" decoding="async">
          <div class="event__date"><strong>${fmtDay.format(d)}</strong><span>${fmtMonth.format(d).replace(".", "")}</span></div>
          <span class="tag">📷 ${entry.photos.length} foto</span>
        </div>
        <div class="event__body">
          <h3 class="event__title">${escapeHTML(e.title)}</h3>
          <ul class="event__info">
            <li>${ICON_CAL}<span>${fmtLong.format(d)}</span></li>
            <li>${ICON_CLOCK}<span>${fmtTime.format(d)} – ${escapeHTML(e.end)}</span></li>
            <li>${ICON_PIN}<span>${escapeHTML(e.place)}</span></li>
          </ul>
        </div>
      </a>`;
  }

  function eventCard(e, i, past) {
    if (past && FOTO) {
      const entry = FOTO.entryForDate(photoEntries, FOTO.eventDate(e));
      if (entry) return pastPhotoCard(e, i, entry);
    }
    const d = new Date(e.start);
    let foot = "";
    if (!past) {
      const btn = registered.has(e.id)
        ? `<button class="btn btn--sm btn--ghost" disabled>Iscritto ✓</button>`
        : `<button class="btn btn--sm btn--pink" data-register="${e.id}">Iscriviti</button>`;
      foot = `<div class="event__foot">${priceLabel(e) || "<span></span>"}${btn}</div>`;
    }
    return `
      <article class="event${past ? " event--past" : ""}" style="animation-delay:${i * 60}ms">
        <div class="event__visual">
          ${eventVisual(`${past ? "p" : "u"}${i}`)}
          <div class="event__date"><strong>${fmtDay.format(d)}</strong><span>${fmtMonth.format(d).replace(".", "")}</span></div>
          ${past ? `<span class="tag">Concluso</span>` : ""}
        </div>
        <div class="event__body">
          <h3 class="event__title">${escapeHTML(e.title)}</h3>
          <ul class="event__info">
            <li>${ICON_CAL}<span>${fmtLong.format(d)}</span></li>
            <li>${ICON_CLOCK}<span>${fmtTime.format(d)} – ${escapeHTML(e.end)}</span></li>
            <li>${ICON_PIN}<span>${escapeHTML(e.place)}</span></li>
          </ul>
          ${foot}
        </div>
      </article>`;
  }

  function renderEvents() {
    const upcoming = upcomingEvents();
    empty.hidden = upcoming.length > 0;
    grid.innerHTML = upcoming.map((e, i) => eventCard(e, i, false)).join("");

    const past = pastEvents();
    pastBlock.hidden = past.length === 0;
    pastGrid.innerHTML = past.map((e, i) => eventCard(e, i, true)).join("");
  }

  /* ---------- Modale iscrizione ---------- */
  const modal = document.getElementById("registerModal");
  const regForm = document.getElementById("registerForm");
  const regError = document.getElementById("registerError");
  const modalFormView = document.getElementById("modalForm");
  const modalSuccessView = document.getElementById("modalSuccess");
  let activeEvent = null;

  grid.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-register]");
    if (!btn) return;
    activeEvent = EVENTS.find((e) => e.id === btn.dataset.register);
    if (!activeEvent) return;

    const d = new Date(activeEvent.start);
    document.getElementById("modalTitle").textContent = activeEvent.title;
    document.getElementById("modalMeta").textContent =
      `${fmtLong.format(d)} · ${fmtTime.format(d)} · ${activeEvent.place}`;

    regForm.reset();
    regError.textContent = "";
    regForm.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    modalFormView.hidden = false;
    modalSuccessView.hidden = true;

    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
    document.getElementById("rName").focus();
  });

  // Chiudi cliccando sul backdrop
  modal.addEventListener("click", (ev) => { if (ev.target === modal) modal.close(); });

  const fmtShort = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });

  // Invia l'iscrizione al Google Form. Con mode "no-cors" la risposta è
  // opaca: la promise fallisce solo per errori di rete, non se Google
  // rifiuta i dati (per questo i valori devono combaciare con il form).
  function sendToGoogleForm(event, data) {
    const f = GOOGLE_FORM.fields;
    const body = new URLSearchParams();
    body.append(f.event, `${event.title} · ${fmtShort.format(new Date(event.start))} [${event.id}]`);
    body.append(f.name, data.get("name").toString().trim());
    body.append(f.email, data.get("email").toString().trim());
    body.append(f.car, data.get("car").toString().trim());
    body.append(f.role, data.get("role").toString());
    body.append(f.terms, GOOGLE_FORM.termsValue);
    return fetch(GOOGLE_FORM.action, { method: "POST", mode: "no-cors", body });
  }

  const regSubmit = regForm.querySelector('button[type="submit"]');
  let sending = false;

  regForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (sending) return;
    let firstInvalid = null;
    regForm.querySelectorAll("input[required]").forEach((input) => {
      const ok = input.type === "checkbox" ? input.checked : input.checkValidity() && input.value.trim() !== "";
      input.classList.toggle("is-invalid", !ok);
      if (!ok && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      regError.textContent = firstInvalid.type === "checkbox"
        ? "Devi accettare il regolamento per continuare."
        : "Controlla i campi evidenziati.";
      firstInvalid.focus();
      return;
    }

    const data = new FormData(regForm);
    const event = activeEvent;
    regError.textContent = "";
    sending = true;
    regSubmit.disabled = true;
    regSubmit.textContent = "Invio…";
    try {
      await sendToGoogleForm(event, data);
    } catch {
      regError.textContent = "Invio non riuscito. Controlla la connessione e riprova.";
      return;
    } finally {
      sending = false;
      regSubmit.disabled = false;
      regSubmit.textContent = "Conferma iscrizione";
    }

    registered.add(event.id);
    store.set("hanami:registered", [...registered]);

    const name = data.get("name").toString().trim().split(" ")[0];
    document.getElementById("successText").textContent =
      `Ciao ${name}, abbiamo ricevuto la tua iscrizione a "${event.title}". Ti scriveremo all'indirizzo indicato con tutti i dettagli.`;
    modalFormView.hidden = true;
    modalSuccessView.hidden = false;
    renderEvents();
  });

  /* ---------- Countdown ---------- */
  const cd = {
    name: document.getElementById("nextEventName"),
    d: document.getElementById("cdDays"),
    h: document.getElementById("cdHours"),
    m: document.getElementById("cdMins"),
    s: document.getElementById("cdSecs"),
  };
  const pad = (n) => String(n).padStart(2, "0");

  function tick() {
    const next = upcomingEvents()[0];
    if (!next) {
      cd.name.textContent = "Nuove date in arrivo";
      [cd.d, cd.h, cd.m, cd.s].forEach((el) => (el.textContent = "00"));
      return;
    }
    const diff = Math.max(0, new Date(next.start).getTime() - Date.now());
    cd.name.textContent = next.title;
    cd.d.textContent = pad(Math.floor(diff / 86400000));
    cd.h.textContent = pad(Math.floor((diff / 3600000) % 24));
    cd.m.textContent = pad(Math.floor((diff / 60000) % 60));
    cd.s.textContent = pad(Math.floor((diff / 1000) % 60));
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Nav ---------- */
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

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = document.querySelectorAll(
    ".section__head, .club__text, .pillar"
  );
  if ("IntersectionObserver" in window) {
    revealTargets.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    revealTargets.forEach((el) => io.observe(el));
  }

  /* ---------- Petali di ciliegio (hero) ---------- */
  function petals() {
    const canvas = document.getElementById("petals");
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, running = true, raf = 0;
    const COUNT = window.innerWidth < 600 ? 22 : 42;

    const rand = (a, b) => a + Math.random() * (b - a);
    const make = (initial) => ({
      x: rand(0, w),
      y: initial ? rand(0, h) : rand(-60, -10),
      r: rand(4, 9),
      vy: rand(0.4, 1.2),
      vx: rand(-0.4, 0.6),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.02, 0.02),
      sway: rand(0, Math.PI * 2),
      a: rand(0.35, 0.9),
    });

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const list = Array.from({ length: COUNT }, () => make(true));

    function drawPetal(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.a;
      ctx.fillStyle = "#f542f5";
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r, -p.r, p.r * 0.9, p.r * 0.6, 0, p.r);
      ctx.bezierCurveTo(-p.r * 0.9, p.r * 0.6, -p.r, -p.r, 0, -p.r);
      ctx.fill();
      ctx.restore();
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        p.sway += 0.015;
        p.x += p.vx + Math.sin(p.sway) * 0.5;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h + 20 || p.x < -30 || p.x > w + 30) list[i] = make(false);
        drawPetal(p);
      }
      if (running) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    window.addEventListener("resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        const visible = entry.isIntersecting;
        if (visible && !running) { running = true; raf = requestAnimationFrame(frame); }
        else if (!visible) { running = false; cancelAnimationFrame(raf); }
      }).observe(canvas);
    }
  }

  /* ---------- Init ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
  renderEvents();
  if (FOTO) {
    FOTO.loadManifest().then((manifest) => {
      photoEntries = FOTO.galleryEntries(EVENTS, manifest);
      if (photoEntries.length) renderEvents();
    });
  }
  petals();
})();
