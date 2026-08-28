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

  /* ---------- Shared scroll ticker (rAF-gated, velocity-aware) ----------
     One scroll listener, one rAF gate, one job list. Replaces the previously
     unthrottled handlers — the timeline draw in particular was calling
     getBoundingClientRect() on every scroll event, forcing a synchronous
     layout each time. Velocity is exponentially smoothed and self-decays, so
     effects settle instead of freezing mid-fling. */

  const ticker = (function () {
    const jobs = new Set();
    let queued = false;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let vel = 0;

    function run() {
      queued = false;
      const y = window.scrollY;
      const now = performance.now();
      const dt = Math.max(now - lastT, 1);
      const raw = ((y - lastY) / dt) * 16.7; /* px per frame */
      vel += (raw - vel) * 0.25;
      if (vel > 60) vel = 60;
      if (vel < -60) vel = -60;
      lastY = y;
      lastT = now;

      jobs.forEach((fn) => fn(y, vel));

      if (Math.abs(vel) > 0.05) request();
    }

    function request() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(run);
    }

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);

    return {
      add(fn) { jobs.add(fn); request(); return () => jobs.delete(fn); },
      request,
      velocity() { return vel; },
    };
  })();

  function onScroll() {
    const st = window.scrollY;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
    if (header) header.classList.toggle("stuck", st > 40);
    if (topBtn) topBtn.classList.toggle("on", st > 500);
  }
  ticker.add(onScroll);
  onScroll();

  /* the progress bar thickens while you fling and settles back — a direct
     readout of scroll speed on the cheapest possible surface */
  if (bar && !reduced) {
    ticker.add((y, vel) => {
      const boost = 1 + Math.min(Math.abs(vel) / 26, 1.2);
      bar.style.setProperty("--sv-boost", boost.toFixed(3));
    });
  }

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

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navbar.classList.contains("open")) {
        setMenu(false);
        menuBtn.focus();
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
    ticker.add(draw);
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
  if (typeEl && reduced) {
    /* a permanent typewriter is exactly the kind of motion this setting is
       meant to stop — show the first phrase and leave it alone */
    const words = JSON.parse(typeEl.dataset.words || "[]");
    typeEl.textContent = words[0] || "";
  } else if (typeEl) {
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

  /* ---------- Projects: row-aware stagger + content cascade -------------
     The old data-stagger assigned --d by DOM index, so at 12 cards the last
     one waited over a second while already on screen. Delay is now derived
     from the column index within its visual row and capped, so the maximum
     wait is 350ms no matter how many cards the grid grows to. */

  const pGrid = $(".project-grid");
  const pCards = pGrid ? $$(".project", pGrid) : [];

  if (pGrid && pCards.length) {
    const CASCADE = ".proj-head, h3, :scope > p, .proj-points, .tag-row, .proj-foot";

    pCards.forEach((card) => {
      $$(CASCADE, card).forEach((el, i) => {
        el.classList.add("cascade-item");
        el.style.setProperty("--ci", i);
      });
      /* index the tags so the hover cascade runs left to right */
      $$(".tag", card).forEach((t, i) => t.style.setProperty("--ti", i));
    });

    function layoutStagger() {
      const shown = pCards.filter((c) => !c.classList.contains("hide"));
      const rows = new Map();

      /* read pass — every offsetTop read happens before any write */
      shown.forEach((c) => {
        const key = Math.round(c.offsetTop / 4) * 4;
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key).push(c);
      });

      /* write pass */
      rows.forEach((row) => {
        row.forEach((c, i) => {
          c.style.setProperty("--d", Math.min(i, 5) * 70 + "ms");
        });
      });
    }

    let staggerQueued = false;
    function queueStagger() {
      if (staggerQueued) return;
      staggerQueued = true;
      requestAnimationFrame(() => {
        staggerQueued = false;
        layoutStagger();
      });
    }

    layoutStagger();
    if ("ResizeObserver" in window) {
      new ResizeObserver(queueStagger).observe(pGrid);
    } else {
      window.addEventListener("resize", queueStagger);
    }

    /* ---------- Projects: FLIP filter + filter bar state ----------------
       Cards glide to their new positions instead of snapping. Measurement is
       in document space (scrollX/scrollY added), because hiding cards changes
       page height and the browser may clamp scrollY between the two reads —
       viewport-space deltas would be wrong exactly when the grid shrinks most.
       WAAPI rather than inline transforms, so the CSS `--lift` hover transform
       is never clobbered; fill:"none" hands the element back cleanly. */

    const filterBar = $(".filters");

    if (filterBar) {
      const btns = $$(".filter", filterBar);
      const GLIDE = "cubic-bezier(.22, 1, .36, 1)";
      let active = $(".filter.on", filterBar) || btns[0];
      let token = 0;

      function matches(card, key) {
        if (key === "all") return true;
        return (card.dataset.tags || "").split(/\s+/).indexOf(key) > -1;
      }

      function snapshot(list) {
        const sx = window.scrollX;
        const sy = window.scrollY;
        const m = new Map();
        list.forEach((c) => {
          const r = c.getBoundingClientRect();
          m.set(c, { x: r.left + sx, y: r.top + sy });
        });
        return m;
      }

      function commit(key) {
        pCards.forEach((c) => c.classList.toggle("hide", !matches(c, key)));
        layoutStagger();
      }

      /* ---- the sliding ink pill behind the active filter ---- */

      const ink = document.createElement("span");
      ink.className = "filter-ink";
      ink.setAttribute("aria-hidden", "true");
      filterBar.insertBefore(ink, filterBar.firstChild);

      let inkPlaced = false;

      function syncInk(animateIt) {
        if (!active) return;
        const from = { transform: ink.style.transform, width: ink.style.width };
        ink.style.width = active.offsetWidth + "px";
        ink.style.height = active.offsetHeight + "px";
        ink.style.transform =
          "translate3d(" + active.offsetLeft + "px, " + active.offsetTop + "px, 0)";

        if (animateIt && inkPlaced && !reduced) {
          ink.animate(
            [from, { transform: ink.style.transform, width: ink.style.width }],
            { duration: 420, easing: GLIDE }
          );
        }
        inkPlaced = true;
      }

      /* ---- live result count, announced politely ---- */

      const readout = document.createElement("p");
      readout.className = "filter-count";
      readout.setAttribute("role", "status");
      readout.setAttribute("aria-live", "polite");
      filterBar.parentNode.insertBefore(readout, filterBar.nextSibling);

      function updateCount(key) {
        const n = pCards.filter((c) => matches(c, key)).length;
        const label =
          key === "all" ? n + " projects" : n + " of " + pCards.length + " projects";
        if (readout.textContent === label) return;
        readout.textContent = label;
        if (reduced) return;
        readout.animate(
          [
            { opacity: 0, transform: "translateY(6px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 260, easing: GLIDE }
        );
      }

      /* ---- the FLIP itself ---- */

      function run(key) {
        const mine = ++token;

        if (reduced) {
          commit(key);
          pCards.forEach((c) => {
            if (!c.classList.contains("hide")) c.classList.add("in");
          });
          updateCount(key);
          syncInk(false);
          return;
        }

        /* cancel anything still in flight from a previous click, so a fast
           double-click cannot commit the first filter after the second */
        pCards.forEach((c) => c.getAnimations().forEach((a) => a.cancel()));

        pGrid.classList.add("is-filtering");
        filterBar.classList.add("is-busy");
        syncInk(true);
        updateCount(key);

        const visible = pCards.filter((c) => !c.classList.contains("hide"));
        const firsts = snapshot(visible);
        const exiting = visible.filter((c) => !matches(c, key));
        const staying = visible.filter((c) => matches(c, key));

        const outs = exiting.map((c, i) =>
          c
            .animate(
              [
                { opacity: 1, transform: "scale(1)" },
                { opacity: 0, transform: "scale(.94)" },
              ],
              { duration: 160, delay: i * 14, easing: "cubic-bezier(.4,0,1,1)", fill: "none" }
            )
            .finished.catch(() => {})
        );

        Promise.all(outs).then(() => {
          if (mine !== token) return;

          const entering = pCards.filter(
            (c) => c.classList.contains("hide") && matches(c, key)
          );

          commit(key);
          entering.forEach((c) => c.classList.add("in"));

          const lasts = snapshot(staying.concat(entering));
          const running = [];

          staying.forEach((c, i) => {
            const a = firsts.get(c);
            const b = lasts.get(c);
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
            c.style.willChange = "transform";
            running.push(
              c
                .animate(
                  [
                    { transform: "translate3d(" + dx + "px, " + dy + "px, 0)" },
                    { transform: "translate3d(0, 0, 0)" },
                  ],
                  { duration: 480, delay: Math.min(i * 16, 120), easing: GLIDE, fill: "none" }
                )
                .finished.catch(() => {})
                .then(() => { c.style.willChange = ""; })
            );
          });

          entering.forEach((c, i) => {
            c.style.willChange = "transform, opacity";
            running.push(
              c
                .animate(
                  [
                    { opacity: 0, transform: "translate3d(0, 16px, 0) scale(.96)" },
                    { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
                  ],
                  {
                    duration: 460,
                    delay: 90 + Math.min(i * 40, 320),
                    easing: GLIDE,
                    /* backwards, or a delayed card renders opaque then flashes */
                    fill: "backwards",
                  }
                )
                .finished.catch(() => {})
                .then(() => { c.style.willChange = ""; })
            );
          });

          Promise.all(running).then(() => {
            if (mine !== token) return;
            pGrid.classList.remove("is-filtering");
            filterBar.classList.remove("is-busy");
          });
        });
      }

      btns.forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn === active) return;
          btns.forEach((b) => {
            b.classList.remove("on");
            b.setAttribute("aria-pressed", "false");
          });
          btn.classList.add("on");
          btn.setAttribute("aria-pressed", "true");
          active = btn;
          run(btn.dataset.filter);
        });
        btn.setAttribute("aria-pressed", btn.classList.contains("on") ? "true" : "false");
      });

      syncInk(false);
      updateCount(active ? active.dataset.filter : "all");
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => syncInk(false));
      }
      if ("ResizeObserver" in window) {
        new ResizeObserver(() => syncInk(false)).observe(filterBar);
      }
    }
  }

  /* ---------- Section titles: per-word reveal ---------------------------
     .grad-text is treated as atomic: splitting inside it would break
     background-clip: text, whose background box is that one element — the
     result would be transparent text with no gradient behind it. */

  if (!reduced) {
    const SPLIT_ATOMIC = "br, .grad-text, [data-split-skip], code, script, style";

    function splitWords(root) {
      const out = [];
      (function walk(node) {
        Array.from(node.childNodes).forEach((n) => {
          if (n.nodeType === 3) {
            if (!n.textContent.trim()) return;
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) {
                frag.appendChild(document.createTextNode(part));
                return;
              }
              const w = document.createElement("span");
              w.className = "w";
              w.textContent = part;
              frag.appendChild(w);
              out.push(w);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1) {
            if (n.matches(SPLIT_ATOMIC)) {
              if (n.tagName !== "BR") {
                n.classList.add("w");
                out.push(n);
              }
              return;
            }
            walk(n);
          }
        });
      })(root);
      return out;
    }

    const titles = $$(".section-title");

    if (titles.length) {
      const wio = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            en.target.classList.add("split-in");
            wio.unobserve(en.target);
            /* drop the layer promotion once the last word has landed */
            setTimeout(() => {
              $$(".w", en.target).forEach((w) => (w.style.willChange = ""));
            }, 1200);
          });
        },
        { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
      );

      titles.forEach((t) => {
        /* keep the heading one readable string for assistive tech */
        const label = t.textContent.replace(/\s+/g, " ").trim();
        const words = splitWords(t);
        if (!words.length) return;
        t.setAttribute("aria-label", label);
        words.forEach((w, i) => {
          w.style.setProperty("--wd", Math.min(i, 10) * 34 + "ms");
          w.style.willChange = "transform, opacity";
        });
        const head = t.closest(".section-head");
        if (head) head.classList.add("has-split");
        wio.observe(t);
      });
    }
  }

  /* ---------- Section header depth --------------------------------------
     The three parts of each header travel at different rates as it crosses
     the viewport; the lighter element moves furthest, which is what reads as
     depth. An observer keeps at most two headers live, so the per-frame cost
     is two rect reads. JS writes only --py — the transform lives in CSS, so
     this can never clobber the reveal or per-word transforms. */

  const wide = window.matchMedia("(min-width: 900px)");
  const heads = $$(".section-head");

  if (!reduced && heads.length && wide.matches) {
    const DEPTH = [[".eyebrow", 26], [".section-title", 14], [".section-sub", 7]];
    const parts = new Map();
    const live = new Set();

    heads.forEach((h) => {
      const list = DEPTH.map((d) => [$(d[0], h), d[1]]).filter((p) => p[0]);
      if (list.length) parts.set(h, list);
    });

    const pio = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          const list = parts.get(en.target);
          if (!list) return;
          if (en.isIntersecting) {
            live.add(en.target);
            list.forEach((p) => (p[0].style.willChange = "transform"));
          } else {
            live.delete(en.target);
            list.forEach((p) => {
              p[0].style.willChange = "";
              p[0].style.setProperty("--py", "0px");
            });
          }
        });
        ticker.request();
      },
      { rootMargin: "20% 0px 20% 0px" }
    );

    parts.forEach((list, h) => pio.observe(h));

    ticker.add((y, vel) => {
      if (!live.size) return;
      const vh = window.innerHeight;
      live.forEach((h) => {
        const r = h.getBoundingClientRect();
        /* -1 entering from below .. +1 leaving past the top */
        const p = ((vh - r.top) / (vh + r.height)) * 2 - 1;
        parts.get(h).forEach((pair) => {
          const amp = pair[1];
          /* the velocity term makes a hard fling lag a few pixels and catch up */
          const py = -p * amp + vel * amp * 0.06;
          pair[0].style.setProperty("--py", py.toFixed(2) + "px");
        });
      });
    });
  }

  /* ---------- Section dividers: scroll-linked stroke draw ---------------
     pathLength="1" normalises the path to unit length, so the draw is pure
     stroke-dashoffset arithmetic — no getTotalLength(), no layout, paint only.
     Scrubbed rather than triggered, so it reverses on scroll-up. */

  const dividers = $$(".divider");

  if (dividers.length) {
    if (reduced) {
      dividers.forEach((d) => d.style.setProperty("--draw", "1"));
    } else {
      const dio = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            en.target.__on = en.isIntersecting;
          });
          ticker.request();
        },
        { rootMargin: "15% 0px 15% 0px" }
      );

      dividers.forEach((d) => dio.observe(d));

      ticker.add(() => {
        const vh = window.innerHeight;
        dividers.forEach((d) => {
          if (!d.__on) return;
          const r = d.getBoundingClientRect();
          const p = (vh * 0.9 - r.top) / (vh * 0.55);
          d.style.setProperty("--draw", Math.min(Math.max(p, 0), 1).toFixed(3));
        });
      });
    }
  }

  /* ---------- Publication accordion ------------------------------------- */

  $$(".pub-main").forEach((head) => {
    const pub = head.closest(".pub");
    const body = $(".pub-body", pub);

    /* A collapsed panel is only clipped to zero height, so its links stayed
       in the tab order and keyboard focus disappeared into an invisible
       region. `inert` removes the whole subtree from focus and from the
       accessibility tree; the hidden fallback does the same where it is
       unsupported. */
    function setOpen(open) {
      pub.classList.toggle("open", open);
      head.setAttribute("aria-expanded", open ? "true" : "false");
      if (!body) return;
      if (open) {
        body.removeAttribute("inert");
      } else {
        body.setAttribute("inert", "");
      }
      if (!("inert" in HTMLElement.prototype)) {
        $$("a, button, input, textarea, select", body).forEach((el) => {
          if (open) el.removeAttribute("tabindex");
          else el.setAttribute("tabindex", "-1");
        });
      }
    }

    setOpen(pub.classList.contains("open"));

    function toggle() {
      setOpen(!pub.classList.contains("open"));
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

})();
