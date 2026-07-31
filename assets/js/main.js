/* ==========================================================================
   Baharul Islam — Portfolio
   Motion + interaction layer (vanilla, no framework)
   ========================================================================== */

(function () {
  "use strict";

  const $ = (s, ctx) => (ctx || document).querySelector(s);
  const $$ = (s, ctx) => Array.from((ctx || document).querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Preloader -------------------------------------------------- */

  window.addEventListener("load", () => {
    const pre = $(".preloader");
    if (!pre) return;
    setTimeout(() => {
      pre.classList.add("done");
      document.body.classList.remove("is-locked");
    }, 550);
  });

  /* ---------- Custom cursor --------------------------------------------- */

  if (fine && !reduced) {
    const dot = $(".cursor");
    const ring = $(".cursor-ring");
    let rx = 0, ry = 0, tx = 0, ty = 0;

    document.addEventListener("mousemove", (e) => {
      tx = e.clientX;
      ty = e.clientY;
      dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
    });

    (function ringLoop() {
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(ringLoop);
    })();

    const hotSel = "a, button, .chip, .filter, .stat, .card, input, textarea, #menu";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hotSel)) ring.classList.add("hot");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hotSel)) ring.classList.remove("hot");
    });
  }

  /* ---------- Magnetic buttons ------------------------------------------ */

  if (fine && !reduced) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ---------- Scroll progress + header state + scroll-top --------------- */

  const bar = $(".progress-bar");
  const header = $("header");
  const topBtn = $(".scroll-top");

  function onScroll() {
    const st = window.scrollY;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
    if (header) header.classList.toggle("stuck", st > 40);
    if (topBtn) topBtn.classList.toggle("on", st > 500);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ------------------------------------------------- */

  const menuBtn = $("#menu");
  const navbar = $(".navbar");

  if (menuBtn && navbar) {
    /* Swap the glyph's classes rather than rewriting innerHTML: replacing the
       node would detach the element the click originated from, so the
       outside-click handler below could no longer see it inside #menu and
       would close the menu in the same tick it opened. */
    const menuIcon = menuBtn.querySelector("i");

    function setMenu(open) {
      navbar.classList.toggle("open", open);
      if (menuIcon) menuIcon.className = open ? "fas fa-times" : "fas fa-bars";
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    menuBtn.addEventListener("click", () => {
      setMenu(!navbar.classList.contains("open"));
    });

    navbar.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".navbar") && !e.target.closest("#menu")) {
        setMenu(false);
      }
    });
  }

  /* ---------- Scroll spy ------------------------------------------------- */

  const navLinks = $$(".navbar a[href^='#']");
  const spied = navLinks
    .map((a) => ({ a, sec: $(a.getAttribute("href")) }))
    .filter((o) => o.sec);

  if (spied.length) {
    /* Pick the section covering the viewport's midpoint. Deterministic —
       an observer-based spy depends on entry delivery order and picks the
       wrong link when two sections change state in the same callback. */
    let spyQueued = false;

    function syncSpy() {
      spyQueued = false;
      const mid = window.scrollY + window.innerHeight * 0.4;
      let current = null;

      spied.forEach((o) => {
        // document-absolute, independent of any positioned ancestor
        const top = o.sec.getBoundingClientRect().top + window.scrollY;
        if (top <= mid) current = o;
      });

      // near the very bottom, the last section wins even if it is short
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = spied[spied.length - 1];
      }

      navLinks.forEach((a) => a.classList.remove("active"));
      if (current) current.a.classList.add("active");
    }

    window.addEventListener(
      "scroll",
      () => {
        if (spyQueued) return;
        spyQueued = true;
        requestAnimationFrame(syncSpy);
      },
      { passive: true }
    );
    window.addEventListener("resize", syncSpy);
    syncSpy();
  }

  /* ---------- Reveal on scroll ------------------------------------------ */

  const revealTargets = $$("[data-reveal]");
  if (revealTargets.length) {
    const ro = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            ro.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    revealTargets.forEach((el) => ro.observe(el));
  }

  /* stagger children marked with [data-stagger] */
  $$("[data-stagger]").forEach((wrap) => {
    const step = parseInt(wrap.dataset.stagger, 10) || 90;
    Array.from(wrap.children).forEach((child, i) => {
      if (child.hasAttribute("data-reveal")) {
        child.style.setProperty("--d", i * step + "ms");
      }
    });
  });

  /* ---------- Timeline draw --------------------------------------------- */

  $$(".timeline").forEach((tl) => {
    const line = $(".timeline-progress", tl);
    const items = $$(".tl-item", tl);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) en.target.classList.add("in");
        });
      },
      { threshold: 0.35 }
    );
    items.forEach((it) => io.observe(it));

    if (!line) return;
    function draw() {
      const r = tl.getBoundingClientRect();
      const mid = window.innerHeight * 0.62;
      const pct = Math.min(Math.max((mid - r.top) / r.height, 0), 1);
      line.style.height = pct * 100 + "%";
    }
    window.addEventListener("scroll", draw, { passive: true });
    window.addEventListener("resize", draw);
    draw();
  });

  /* ---------- Counters --------------------------------------------------- */

  $$("[data-count]").forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const dec = (el.dataset.count.split(".")[1] || "").length;
    const suffix = el.dataset.suffix || "";
    const prefix = el.dataset.prefix || "";

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          io.unobserve(el);
          if (reduced) {
            el.textContent = prefix + target.toFixed(dec) + suffix;
            return;
          }
          const dur = 1600;
          const t0 = performance.now();
          (function tick(now) {
            const p = Math.min((now - t0) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = prefix + (target * eased).toFixed(dec) + suffix;
            if (p < 1) requestAnimationFrame(tick);
          })(t0);
        });
      },
      { threshold: 0.5 }
    );
    io.observe(el);
  });

  /* ---------- Typing ----------------------------------------------------- */

  const typeEl = $(".typing-text");
  if (typeEl) {
    const words = JSON.parse(typeEl.dataset.words || "[]");
    let w = 0, c = 0, deleting = false;

    (function type() {
      const word = words[w % words.length];
      typeEl.textContent = deleting
        ? word.substring(0, c--)
        : word.substring(0, c++);

      let wait = deleting ? 38 : 78;

      if (!deleting && c > word.length) {
        wait = 1500;
        deleting = true;
        c = word.length;
      } else if (deleting && c < 0) {
        deleting = false;
        w++;
        c = 0;
        wait = 320;
      }
      setTimeout(type, wait);
    })();
  }

  /* ---------- Card spotlight + tilt ------------------------------------- */

  if (fine && !reduced) {
    $$(".card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", e.clientX - r.left + "px");
        card.style.setProperty("--my", e.clientY - r.top + "px");
      });
    });

    $$("[data-tilt]").forEach((el) => {
      const max = parseFloat(el.dataset.tilt) || 8;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${-py * max}deg) rotateY(${
          px * max
        }deg) translateY(-6px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ---------- Project filters ------------------------------------------- */

  const filters = $$(".filter");
  const projects = $$(".project");

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      filters.forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      const key = btn.dataset.filter;

      projects.forEach((p) => {
        const tags = (p.dataset.tags || "").split(/\s+/);
        const show = key === "all" || tags.includes(key);
        p.classList.toggle("hide", !show);
        if (show) {
          p.classList.remove("in");
          // re-trigger the reveal transition
          void p.offsetWidth;
          p.classList.add("in");
        }
      });
    });
  });

  /* ---------- Publication accordion ------------------------------------- */

  $$(".pub-main").forEach((head) => {
    function toggle() {
      const pub = head.closest(".pub");
      const open = pub.classList.toggle("open");
      head.setAttribute("aria-expanded", open ? "true" : "false");
    }
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });

  /* menu button keyboard support */
  if (menuBtn) {
    menuBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        menuBtn.click();
      }
    });
  }

  /* ---------- Smooth anchor scroll -------------------------------------- */

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y =
        target.getBoundingClientRect().top +
        window.scrollY -
        (window.innerWidth > 900 ? 70 : 60);
      window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
      history.replaceState(null, "", id);
    });
  });

  /* ---------- Contact form (EmailJS) ------------------------------------ */

  const form = $("#contact-form");
  if (form) {
    const status = $(".form-status", form);
    const submitBtn = $("button[type='submit']", form);

    function say(msg, ok) {
      if (!status) return;
      status.textContent = msg;
      status.className = "form-status show " + (ok ? "ok" : "err");
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      if (typeof emailjs === "undefined") {
        say(
          "Mail service could not load. Please email ibaharul567@gmail.com directly.",
          false
        );
        return;
      }

      const original = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending';

      emailjs.init("3MNI9HAKNo79hplMU");
      emailjs
        .sendForm("service_rsafrae", "template_0n3zbqx", "#contact-form")
        .then(
          () => {
            form.reset();
            say("Thanks — your message is on its way. I'll reply soon.", true);
            submitBtn.disabled = false;
            submitBtn.innerHTML = original;
          },
          () => {
            say(
              "Something went wrong. Please email ibaharul567@gmail.com directly.",
              false
            );
            submitBtn.disabled = false;
            submitBtn.innerHTML = original;
          }
        );
    });
  }

  /* ---------- Prefill contact subject from "request access" ------------- */

  $$("[data-prefill]").forEach((el) => {
    el.addEventListener("click", () => {
      const msg = $("#contact-form textarea[name='message']");
      if (!msg) return;
      msg.value = el.dataset.prefill;
      setTimeout(() => msg.focus({ preventScroll: true }), 700);
    });
  });

  /* ---------- Tab title swap -------------------------------------------- */

  const realTitle = document.title;
  document.addEventListener("visibilitychange", () => {
    document.title =
      document.visibilityState === "visible"
        ? realTitle
        : "Come back — there's more to see";
  });

  /* ---------- Footer year ------------------------------------------------ */

  const yr = $("#year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Hero particle constellation -------------------------------- */

  const canvas = $("#particles");
  if (canvas && !reduced) {
    const ctx = canvas.getContext("2d");
    let w, h, dpr, pts = [];
    const mouse = { x: -9999, y: -9999 };

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(Math.round((w * h) / 13000), 110);
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.34,
        vy: (Math.random() - 0.5) * 0.34,
        r: Math.random() * 1.7 + 0.7,
      }));
    }

    canvas.addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener("mouseleave", () => {
      mouse.x = mouse.y = -9999;
    });

    function frame() {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // gentle repulsion from the pointer
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14000 && d2 > 0.01) {
          const f = (14000 - d2) / 14000;
          const d = Math.sqrt(d2);
          p.x += (dx / d) * f * 2.2;
          p.y += (dy / d) * f * 2.2;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(160, 180, 255, 0.55)";
        ctx.fill();

        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const ax = p.x - q.x;
          const ay = p.y - q.y;
          const dist2 = ax * ax + ay * ay;
          if (dist2 < 16000) {
            const a = (1 - dist2 / 16000) * 0.32;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(124, 148, 255, ${a})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    }

    size();
    frame();
    window.addEventListener("resize", size);
  }

  /* ---------- Owner's content guard (kept from previous build) ---------- */

  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("keydown", (e) => {
    const k = e.key.toUpperCase();
    if (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && ["I", "C", "J"].includes(k)) ||
      (e.ctrlKey && k === "U")
    ) {
      e.preventDefault();
    }
  });
})();
