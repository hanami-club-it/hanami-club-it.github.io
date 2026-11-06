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

  /* ---------- Dati eventi ----------
     Per aggiungere un evento basta aggiungere un oggetto qui.
     type: track | raduno | drift | coffee | touge
  */
  const EVENTS = [
    {
      id: "cc-autunno-26",
      type: "coffee",
      title: "Cars & Coffee d'Autunno",
      start: "2026-11-15T09:00:00",
      end: "12:00",
      place: "Milano · Zona Tortona",
      price: 0,
      spots: 150,
      taken: 96,
    },
    {
      id: "td-vallelunga-26",
      type: "track",
      title: "Track Day Vallelunga",
      start: "2026-11-29T08:30:00",
      end: "17:30",
      place: "Autodromo di Vallelunga (RM)",
      price: 180,
      spots: 60,
      taken: 51,
    },
    {
      id: "neon-garage-26",
      type: "raduno",
      title: "Neon Garage · Night Meet",
      start: "2026-12-12T20:30:00",
      end: "01:00",
      place: "Torino · Lingotto",
      price: 10,
      spots: 200,
      taken: 200,
    },
    {
      id: "drift-ottobiano-27",
      type: "drift",
      title: "Drift Session d'Inverno",
      start: "2027-01-17T09:00:00",
      end: "17:00",
      place: "Ottobiano Motorsport (PV)",
      price: 140,
      spots: 30,
      taken: 12,
    },
    {
      id: "hanami-meet-27",
      type: "raduno",
      title: "Hanami Meet 2027",
      featured: true,
      start: "2027-04-04T10:00:00",
      end: "18:00",
      place: "Lago di Como · Lungolago",
      price: 25,
      spots: 400,
      taken: 188,
    },
    {
      id: "td-mugello-27",
      type: "track",
      title: "Track Day Mugello",
      start: "2027-04-25T08:30:00",
      end: "18:00",
      place: "Autodromo del Mugello (FI)",
      price: 260,
      spots: 50,
      taken: 19,
    },
    {
      id: "cc-primavera-27",
      type: "coffee",
      title: "Cars & Coffee di Primavera",
      start: "2027-05-09T09:00:00",
      end: "12:30",
      place: "Bologna · Fiera",
      price: 0,
      spots: 180,
      taken: 40,
    },
    {
      id: "touge-stelvio-27",
      type: "touge",
      title: "Stelvio Touge Run",
      start: "2027-06-19T07:00:00",
      end: "16:00",
      place: "Bormio → Passo dello Stelvio",
      price: 45,
      spots: 40,
      taken: 8,
    },
  ];

  const TYPE_LABEL = {
    track: "Track day",
    raduno: "Raduno",
    drift: "Drift",
    coffee: "Cars & Coffee",
    touge: "Touge run",
  };

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
  // Riflette le iscrizioni salvate nei posti occupati
  EVENTS.forEach((e) => { if (registered.has(e.id) && e.taken < e.spots) e.taken += 1; });

  /* ---------- Formattazione ---------- */
  const fmtDay = new Intl.DateTimeFormat("it-IT", { day: "2-digit" });
  const fmtMonth = new Intl.DateTimeFormat("it-IT", { month: "short" });
  const fmtLong = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtTime = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });
  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Visual SVG per tipo evento ---------- */
  function visualFor(type, seed) {
    const P = "#f542f5";
    const common = `viewBox="0 0 400 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true"`;
    const bg = `<defs><radialGradient id="g${seed}" cx="70%" cy="40%" r="70%"><stop offset="0" stop-color="${P}" stop-opacity=".35"/><stop offset="1" stop-color="${P}" stop-opacity="0"/></radialGradient></defs><rect width="400" height="170" fill="url(#g${seed})"/>`;
    switch (type) {
      case "track":
        return `<svg ${common}>${bg}
          <path d="M60 120 C 60 40, 160 30, 200 70 S 300 140, 340 90 S 330 20, 260 30" fill="none" stroke="${P}" stroke-width="10" stroke-linecap="round" opacity=".9"/>
          <path d="M60 120 C 60 40, 160 30, 200 70 S 300 140, 340 90 S 330 20, 260 30" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="8 10"/>
          <g fill="#fff" opacity=".9"><rect x="248" y="22" width="6" height="6"/><rect x="254" y="28" width="6" height="6"/><rect x="248" y="34" width="6" height="6"/></g>
        </svg>`;
      case "drift":
        return `<svg ${common}>${bg}
          <g fill="none" stroke="${P}" stroke-linecap="round">
            <path d="M20 150 Q 160 150, 220 90 T 390 40" stroke-width="5" opacity=".9"/>
            <path d="M20 132 Q 150 132, 205 76 T 380 22" stroke-width="5" opacity=".55"/>
          </g>
          <g fill="#fff" opacity=".08"><circle cx="120" cy="120" r="40"/><circle cx="160" cy="100" r="55"/><circle cx="90" cy="95" r="30"/></g>
        </svg>`;
      case "coffee":
        return `<svg ${common}>${bg}
          <g fill="none" stroke="${P}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M250 70 h70 v40 a30 30 0 0 1 -30 30 h-10 a30 30 0 0 1 -30 -30 z"/>
            <path d="M320 82 h10 a14 14 0 0 1 0 28 h-10"/>
            <path d="M268 40 q8 -10 0 -20 M288 40 q8 -10 0 -20 M308 40 q8 -10 0 -20" opacity=".6"/>
          </g>
        </svg>`;
      case "touge":
        return `<svg ${common}>${bg}
          <path d="M0 170 L120 50 L200 120 L280 30 L400 170 Z" fill="#fff" opacity=".05"/>
          <path d="M200 165 L250 145 L170 128 L250 110 L180 92 L260 75 L200 58 L275 40" fill="none" stroke="${P}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
        </svg>`;
      case "raduno":
      default: {
        let cars = "";
        for (let i = 0; i < 6; i++) {
          const x = 30 + i * 62;
          cars += `<g opacity="${1 - i * 0.12}"><rect x="${x}" y="105" width="52" height="22" rx="7" fill="none" stroke="${P}" stroke-width="3"/><circle cx="${x + 11}" cy="116" r="4" fill="${P}"/><circle cx="${x + 41}" cy="116" r="4" fill="${P}"/></g>`;
        }
        return `<svg ${common}>${bg}<line x1="0" y1="140" x2="400" y2="140" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>${cars}</svg>`;
      }
    }
  }

  const ICON_PIN = `<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
  const ICON_CLOCK = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
  const ICON_CAL = `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`;

  /* ---------- Render eventi ---------- */
  const grid = document.getElementById("eventsGrid");
  const empty = document.getElementById("eventsEmpty");
  let currentFilter = "all";

  function upcomingEvents() {
    const now = Date.now();
    return EVENTS
      .filter((e) => new Date(e.start).getTime() > now)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  function renderEvents() {
    const list = upcomingEvents().filter((e) => currentFilter === "all" || e.type === currentFilter);
    empty.hidden = list.length > 0;

    grid.innerHTML = list.map((e, i) => {
      const d = new Date(e.start);
      const left = Math.max(0, e.spots - e.taken);
      const pct = Math.min(100, Math.round((e.taken / e.spots) * 100));
      const isFull = left === 0;
      const isMine = registered.has(e.id);
      let btn;
      if (isMine) btn = `<button class="btn btn--sm btn--ghost" disabled>Iscritto ✓</button>`;
      else if (isFull) btn = `<button class="btn btn--sm btn--ghost" disabled>Sold out</button>`;
      else btn = `<button class="btn btn--sm btn--pink" data-register="${e.id}">Iscriviti</button>`;

      return `
        <article class="event" style="animation-delay:${i * 60}ms">
          <div class="event__visual">
            ${visualFor(e.type, i)}
            <div class="event__date"><strong>${fmtDay.format(d)}</strong><span>${fmtMonth.format(d).replace(".", "")}</span></div>
            <span class="tag ${e.featured ? "tag--featured" : ""}">${e.featured ? "Evento firma" : TYPE_LABEL[e.type]}</span>
          </div>
          <div class="event__body">
            <h3 class="event__title">${escapeHTML(e.title)}</h3>
            <ul class="event__info">
              <li>${ICON_CAL}<span>${fmtLong.format(d)}</span></li>
              <li>${ICON_CLOCK}<span>${fmtTime.format(d)} – ${e.end}</span></li>
              <li>${ICON_PIN}<span>${escapeHTML(e.place)}</span></li>
            </ul>
            <div class="spots">
              <div class="spots__row"><span>Posti</span><span>${isFull ? "<strong>Esaurito</strong>" : `<strong>${left}</strong> rimasti su ${e.spots}`}</span></div>
              <div class="spots__bar"><i style="width:${pct}%"></i></div>
            </div>
            <div class="event__foot">
              <span class="event__price">${e.price === 0 ? "Gratis" : `€${e.price} <small>a persona</small>`}</span>
              ${btn}
            </div>
          </div>
        </article>`;
    }).join("");
  }

  document.getElementById("filters").addEventListener("click", (ev) => {
    const chip = ev.target.closest("[data-filter]");
    if (!chip) return;
    currentFilter = chip.dataset.filter;
    document.querySelectorAll("#filters .chip").forEach((c) => {
      const active = c === chip;
      c.classList.toggle("is-active", active);
      c.setAttribute("aria-pressed", String(active));
    });
    renderEvents();
  });
  document.querySelectorAll("#filters .chip").forEach((c) => c.setAttribute("aria-pressed", String(c.classList.contains("is-active"))));

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
    document.getElementById("modalType").textContent = TYPE_LABEL[activeEvent.type];
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
    if (event.taken < event.spots) event.taken += 1;

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

  /* ---------- Newsletter ---------- */
  const nlForm = document.getElementById("newsletterForm");
  const nlMsg = document.getElementById("newsletterMsg");
  nlForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const input = nlForm.querySelector("input");
    if (!input.checkValidity() || !input.value.trim()) {
      nlMsg.textContent = "Inserisci un indirizzo email valido.";
      input.focus();
      return;
    }
    nlMsg.textContent = "Fatto! Controlla la tua inbox per confermare.";
    nlForm.reset();
  });

  /* ---------- Contatori statistiche ---------- */
  function countUp(el) {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (reducedMotion) { el.textContent = target.toLocaleString("it-IT") + suffix; return; }
    const dur = 1600;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString("it-IT") + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = document.querySelectorAll(
    ".section__head, .club__text, .pillar, .locations li, .plan, .faq > div, .faq__list, .cta__inner"
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

    const statIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        statIO.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll("[data-count]").forEach((el) => statIO.observe(el));
  } else {
    document.querySelectorAll("[data-count]").forEach(countUp);
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
  petals();
})();
