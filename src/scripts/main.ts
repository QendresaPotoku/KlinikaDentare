/**
 * Site behaviour: smooth scroll, header states, mobile menu, accordion, testimonials,
 * treatment previews, video, and the scroll-driven reveals.
 * All motion is skipped when the visitor prefers reduced motion; interaction still works.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

/* ------------------------------------------------------------------ smooth scroll */
let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToTarget(target: HTMLElement | number) {
  if (lenis) lenis.scrollTo(target, { duration: 1.6 });
  else if (typeof target === 'number') window.scrollTo({ top: target });
  else target.scrollIntoView();
}

// Same-page anchor links (including absolute ones like /sq/#contact while already on /sq/)
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest('a');
  if (!a || !a.hash || e.metaKey || e.ctrlKey) return;
  const url = new URL(a.href, location.href);
  if (url.pathname !== location.pathname) return;
  if (a.hasAttribute('data-to-top') || a.hash === '#top') {
    e.preventDefault();
    scrollToTarget(0);
    return;
  }
  const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
  if (!target) return;
  e.preventDefault();
  closeMenu();
  scrollToTarget(target);
  history.replaceState(null, '', a.hash);
});

/* ------------------------------------------------------------------ header + mobile bar */
const header = $('[data-header]');
const hero = $('[data-hero]');
const mobileBar = $('[data-mobile-bar]');
let lastY = window.scrollY;
let menuOpen = false;

function onScroll() {
  const y = window.scrollY;
  const headerH = header?.offsetHeight ?? 80;
  const solidAt = hero ? hero.offsetHeight - headerH : 24;
  header?.classList.toggle('is-solid', y > solidAt);
  const down = y > lastY + 2;
  const up = y < lastY - 2;
  if (down && y > Math.max(solidAt, 320) && !menuOpen) header?.classList.add('is-hidden');
  else if (up || y < 80) header?.classList.remove('is-hidden');
  mobileBar?.classList.toggle('is-visible', y > window.innerHeight * 0.55);
  lastY = y;
}
let ticking = false;
window.addEventListener(
  'scroll',
  () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  },
  { passive: true },
);
onScroll();

/* ------------------------------------------------------------------ mobile menu */
const menu = $('[data-menu]');
const toggle = $<HTMLButtonElement>('[data-menu-toggle]');
const toggleLabel = toggle?.querySelector<HTMLElement>('.menu-label');

function openMenu() {
  if (!menu || !toggle) return;
  menuOpen = true;
  menu.hidden = false;
  requestAnimationFrame(() => menu.classList.add('is-open'));
  header?.classList.add('menu-open');
  header?.classList.remove('is-hidden');
  toggle.setAttribute('aria-expanded', 'true');
  if (toggleLabel) toggleLabel.textContent = toggleLabel.dataset.closeLabel ?? '';
  lenis?.stop();
  document.documentElement.style.overflow = 'hidden';
  if (!reduced) {
    gsap.fromTo(
      $$('.mm-links a', menu),
      { yPercent: 110 },
      { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 0.25 },
    );
    gsap.fromTo($('.mm-foot', menu), { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.55 });
  }
}
function closeMenu() {
  if (!menu || !toggle || !menuOpen) return;
  menuOpen = false;
  menu.classList.remove('is-open');
  header?.classList.remove('menu-open');
  toggle.setAttribute('aria-expanded', 'false');
  if (toggleLabel) toggleLabel.textContent = toggleLabel.dataset.openLabel ?? '';
  lenis?.start();
  document.documentElement.style.overflow = '';
  window.setTimeout(() => {
    if (!menuOpen) menu.hidden = true;
  }, reduced ? 0 : 800);
}
toggle?.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
$$('[data-menu-link]').forEach((a) => a.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});
window.matchMedia('(min-width: 1181px)').addEventListener('change', (e) => e.matches && closeMenu());

/* ------------------------------------------------------------------ accordion */
const closeDetails = (details: HTMLDetailsElement) => {
  const answer = details.querySelector<HTMLElement>('.answer');
  if (!answer || reduced) {
    details.open = false;
    return;
  }
  gsap.to(answer, {
    height: 0,
    duration: 0.6,
    ease: 'power3.inOut',
    onComplete: () => {
      details.open = false;
      answer.style.height = '';
      ScrollTrigger.refresh();
    },
  });
};

// Only one FAQ item open at a time: close open siblings in the same accordion.
const closeSiblings = (details: HTMLDetailsElement) => {
  details
    .closest('.accordion')
    ?.querySelectorAll<HTMLDetailsElement>('details[open]')
    .forEach((other) => other !== details && closeDetails(other));
};

$$<HTMLDetailsElement>('.accordion details').forEach((details) => {
  const summary = details.querySelector('summary');
  const answer = details.querySelector<HTMLElement>('.answer');
  if (!summary || !answer) return;
  if (reduced) {
    details.addEventListener('toggle', () => details.open && closeSiblings(details));
    return;
  }
  summary.addEventListener('click', (e) => {
    e.preventDefault();
    if (details.open) {
      closeDetails(details);
    } else {
      closeSiblings(details);
      details.open = true;
      gsap.fromTo(
        answer,
        { height: 0 },
        {
          height: 'auto',
          duration: 0.7,
          ease: 'power3.out',
          onComplete: () => {
            answer.style.height = '';
            ScrollTrigger.refresh();
          },
        },
      );
    }
  });
});

/* ------------------------------------------------------------------ read more */
// Without JavaScript the full text shows. With it, the extra paragraphs start as a faded preview.
$$('[data-more]').forEach((root) => {
  const body = $('[data-more-body]', root);
  const toggle = $<HTMLButtonElement>('[data-more-toggle]', root);
  const text = toggle && $('[data-more-text]', toggle);
  if (!body || !toggle || !text) return;

  const setState = (open: boolean) => {
    root.classList.toggle('is-collapsed', !open);
    toggle.setAttribute('aria-expanded', String(open));
    text.textContent = (open ? toggle.dataset.lessLabel : toggle.dataset.moreLabel) ?? '';
  };
  setState(false);
  toggle.hidden = false;

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    if (reduced) {
      setState(open);
      ScrollTrigger.refresh();
      return;
    }
    const from = body.offsetHeight;
    setState(open);
    body.style.height = '';
    const to = body.offsetHeight;
    gsap.fromTo(body, { height: from }, {
      height: to,
      duration: open ? 0.8 : 0.6,
      ease: open ? 'power3.out' : 'power3.inOut',
      onComplete: () => {
        body.style.height = '';
        ScrollTrigger.refresh();
      },
    });
    // When closing, keep the button in view so the reader doesn't lose their place.
    if (!open && toggle.getBoundingClientRect().top < 0) {
      const y = window.scrollY + root.getBoundingClientRect().top - window.innerHeight * 0.3;
      lenis ? lenis.scrollTo(y) : window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });
});

/* ------------------------------------------------------------------ testimonials */
$$('[data-testimonials]').forEach((root) => {
  const slides = $$('[data-slide]', root);
  const counter = $('[data-current]', root);
  const bar = $('[data-progress]', root);
  const stage = $('[data-stage]', root);
  let index = 0;
  let busy = false;

  function show(next: number) {
    if (busy || next === index) return;
    const from = slides[index];
    const to = slides[(next + slides.length) % slides.length];
    index = (next + slides.length) % slides.length;
    if (counter) counter.textContent = String(index + 1).padStart(2, '0');
    if (bar) bar.style.transform = `scaleX(${(index + 1) / slides.length})`;
    from.setAttribute('aria-hidden', 'true');
    to.removeAttribute('aria-hidden');
    if (reduced) {
      from.classList.remove('is-active');
      to.classList.add('is-active');
      return;
    }
    busy = true;
    gsap
      .timeline({ onComplete: () => void (busy = false) })
      .to(from, { opacity: 0, y: -16, duration: 0.6, ease: 'power2.in' })
      .add(() => {
        // Stage fits the current quote: swap slides, then ease from the old height to the new one
        const h = stage?.offsetHeight ?? 0;
        from.classList.remove('is-active');
        to.classList.add('is-active');
        if (stage) gsap.fromTo(stage, { height: h }, { height: stage.offsetHeight, duration: 0.7, ease: 'expo.out', clearProps: 'height' });
      })
      .fromTo(to, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' });
  }
  // Autoplay: advance every 6s while the section is on screen; pause on hover/focus,
  // and restart the countdown after any manual navigation.
  const INTERVAL = 6000;
  let timer = 0;
  let inView = false;
  let hovered = false;
  let focused = false;
  function schedule() {
    clearTimeout(timer);
    if (reduced || slides.length < 2 || !inView || hovered || focused || document.hidden) return;
    timer = window.setTimeout(() => {
      show(index + 1);
      schedule();
    }, INTERVAL);
  }
  function go(next: number) {
    show(next);
    schedule();
  }
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    schedule();
  }, { threshold: 0.25 }).observe(root);
  root.addEventListener('mouseenter', () => { hovered = true; schedule(); });
  root.addEventListener('mouseleave', () => { hovered = false; schedule(); });
  root.addEventListener('focusin', () => { focused = true; schedule(); });
  root.addEventListener('focusout', (e) => {
    if (root.contains(e.relatedTarget as Node | null)) return;
    focused = false;
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);

  $('[data-prev]', root)?.addEventListener('click', () => go(index - 1));
  $('[data-next]', root)?.addEventListener('click', () => go(index + 1));

  // Arrow keys while focus is inside the section, horizontal swipe on touch screens
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(index - 1);
    else if (e.key === 'ArrowRight') go(index + 1);
  });
  let startX = 0;
  let startY = 0;
  stage?.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  stage?.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
  }, { passive: true });
});

/* ------------------------------------------------------------------ before / after cases */
$$('[data-cases]').forEach((root) => {
  const stage = $('[data-compare]', root);
  const handle = $('[data-compare-handle]', root);
  if (!stage || !handle) return;
  const cases = $$('[data-case]', root);
  const names = $$('[data-case-name]', root);
  const counter = $('[data-case-current]', root);
  const thumbs = $$('[data-case-thumb]', root);
  const before = handle.dataset.before ?? '';
  const after = handle.dataset.after ?? '';
  let pos = 50;
  let index = 0;
  let touched = false;
  let demo: gsap.core.Timeline | null = null;

  function set(value: number) {
    pos = Math.min(100, Math.max(0, value));
    stage!.style.setProperty('--pos', `${pos}%`);
    const v = Math.round(pos);
    handle!.setAttribute('aria-valuenow', String(v));
    handle!.setAttribute('aria-valuetext', `${before} ${v}%, ${after} ${100 - v}%`);
    stage!.classList.toggle('hide-before', pos < 12);
    stage!.classList.toggle('hide-after', pos > 88);
  }
  // Any interaction ends the introductory movement for good
  function takeOver() {
    touched = true;
    demo?.kill();
    demo = null;
  }
  const isStatic = () => stage.classList.contains('is-static');
  const fromX = (x: number) => {
    const r = stage.getBoundingClientRect();
    return ((x - r.left) / r.width) * 100;
  };

  // Mouse and pen follow immediately. A finger only takes over once it moves sideways,
  // so vertical swipes keep scrolling the page; a tap moves the divider to that point.
  let drag: { id: number; x: number; y: number; active: boolean } | null = null;
  stage.addEventListener('pointerdown', (e) => {
    if (isStatic() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    takeOver();
    const touch = e.pointerType === 'touch';
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, active: !touch };
    if (!touch) {
      e.preventDefault();
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('is-dragging');
      set(fromX(e.clientX));
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.active) {
      const dx = Math.abs(e.clientX - drag.x);
      const dy = Math.abs(e.clientY - drag.y);
      if (dx < 6 && dy < 6) return;
      if (dy > dx) {
        drag = null;
        return;
      }
      drag.active = true;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('is-dragging');
    }
    set(fromX(e.clientX));
  });
  const end = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.active && e.type === 'pointerup') set(fromX(e.clientX));
    drag = null;
    stage.classList.remove('is-dragging');
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  handle.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 2;
    const keys: Record<string, number> = {
      ArrowLeft: pos - step,
      ArrowDown: pos - step,
      ArrowRight: pos + step,
      ArrowUp: pos + step,
      PageDown: pos - 10,
      PageUp: pos + 10,
      Home: 0,
      End: 100,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    takeOver();
    set(keys[e.key]);
  });

  function show(next: number) {
    const n = cases.length;
    next = (next + n) % n;
    if (next === index) return;
    [cases, names].forEach((list) => {
      list[index]?.classList.remove('is-active');
      list[index]?.setAttribute('aria-hidden', 'true');
      list[next]?.classList.add('is-active');
      list[next]?.removeAttribute('aria-hidden');
    });
    index = next;
    const combined = cases[index].dataset.kind === 'combined';
    stage!.classList.toggle('is-static', combined);
    handle!.hidden = combined;
    if (counter) counter.textContent = String(index + 1).padStart(2, '0');
    thumbs.forEach((t, i) => {
      t.classList.toggle('is-active', i === index);
      t.setAttribute('aria-pressed', String(i === index));
    });
  }
  $('[data-case-prev]', root)?.addEventListener('click', () => show(index - 1));
  $('[data-case-next]', root)?.addEventListener('click', () => show(index + 1));
  thumbs.forEach((t, i) => t.addEventListener('click', () => show(i)));

  // One quiet demonstration when the comparison first comes into view: 35% → 65% → rest at 50%.
  if (reduced || isStatic() || !('IntersectionObserver' in window)) return;
  set(35);
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      io.disconnect();
      if (touched) return;
      const state = { v: pos };
      const update = () => set(state.v);
      demo = gsap
        .timeline({ delay: 0.5, onComplete: () => void (demo = null) })
        .to(state, { v: 65, duration: 2, ease: 'sine.inOut', onUpdate: update })
        .to(state, { v: 50, duration: 1.3, ease: 'power2.inOut', onUpdate: update });
    },
    { threshold: 0.55 },
  );
  io.observe(stage);
});

/* ------------------------------------------------------------------ treatment list preview */
$$('[data-treatment-list]').forEach((root) => {
  const rows = $$('[data-row]', root);
  const frames = $$('[data-preview]', root);
  const setActive = (i: number) => {
    rows.forEach((r, j) => r.classList.toggle('is-active', i === j));
    frames.forEach((f, j) => f.classList.toggle('is-active', i === j));
  };
  rows.forEach((row, i) => {
    row.addEventListener('mouseenter', () => setActive(i));
    row.addEventListener('focusin', () => setActive(i));
  });
  setActive(0);
});

/* ------------------------------------------------------------------ video */
$$('[data-video]').forEach((root) => {
  const button = $<HTMLButtonElement>('[data-video-play]', root);
  const src = root.dataset.src;
  button?.addEventListener('click', () => {
    if (!src) {
      root.classList.add('is-pending');
      return;
    }
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.playsInline = true;
    video.autoplay = true;
    video.className = 'video-el';
    $('.video-frame', root)?.appendChild(video);
    root.classList.add('is-playing');
    video.play().catch(() => {});
  });
});

/* ------------------------------------------------------------------ language choice */
// Remember a language picked in the switcher; the root page (/) uses it on the next visit.
$$<HTMLAnchorElement>('.langs a[hreflang], .mm-langs a[hreflang]').forEach((a) =>
  a.addEventListener('click', () => {
    try {
      localStorage.setItem('lang', a.hreflang);
    } catch {
      /* storage unavailable: device language is used instead */
    }
  }),
);

/* ------------------------------------------------------------------ booking popup */
// Any element with [data-book] opens the appointment form. Not connected to a backend yet.
const booking = $<HTMLDialogElement>('[data-booking]');
if (booking) {
  const form = $<HTMLFormElement>('[data-booking-form]', booking);
  const success = $('[data-booking-success]', booking);
  const date = $<HTMLInputElement>('[data-booking-date]', booking);
  if (date) date.min = new Date().toISOString().slice(0, 10);

  const openBooking = () => {
    if (form) form.hidden = false;
    if (success) success.hidden = true;
    booking.showModal();
    requestAnimationFrame(() => booking.classList.add('is-open'));
    lenis?.stop();
  };
  const closeBooking = () => booking.close();

  booking.addEventListener('close', () => {
    booking.classList.remove('is-open');
    lenis?.start();
  });
  // Click on the dimmed area outside the panel closes it
  booking.addEventListener('click', (e) => e.target === booking && closeBooking());
  $$('[data-booking-close]', booking).forEach((btn) => btn.addEventListener('click', closeBooking));

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    form.reset();
    form.hidden = true;
    if (success) success.hidden = false;
  });

  document.addEventListener('click', (e) => {
    const trigger = (e.target as Element).closest('[data-book]');
    if (!trigger) return;
    e.preventDefault();
    // Let the mobile menu finish closing before the popup takes over scrolling
    if (trigger.hasAttribute('data-menu-link')) window.setTimeout(openBooking, 350);
    else openBooking();
  });
}

/* ------------------------------------------------------------------ team drawer */
$$('[data-drawer]').forEach((drawer) => {
  const backdrop = $('[data-drawer-backdrop]');
  const profiles = $$('[data-profile]', drawer);
  const closeBtn = $<HTMLButtonElement>('[data-drawer-close]', drawer);
  let lastFocus: HTMLElement | null = null;
  let isOpen = false;

  function open(id: string) {
    if (!profiles.some((p) => p.dataset.profile === id)) return;
    profiles.forEach((p) => (p.hidden = p.dataset.profile !== id));
    drawer.hidden = false;
    if (backdrop) backdrop.hidden = false;
    drawer.scrollTop = 0;
    requestAnimationFrame(() => {
      drawer.classList.add('is-open');
      backdrop?.classList.add('is-open');
    });
    isOpen = true;
    lenis?.stop();
    document.documentElement.style.overflow = 'hidden';
    closeBtn?.focus({ preventScroll: true });
    history.replaceState(null, '', `#${id}`);
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    drawer.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    lenis?.start();
    document.documentElement.style.overflow = '';
    history.replaceState(null, '', location.pathname);
    window.setTimeout(() => {
      if (isOpen) return;
      drawer.hidden = true;
      if (backdrop) backdrop.hidden = true;
    }, reduced ? 0 : 800);
    lastFocus?.focus({ preventScroll: true });
  }

  $$<HTMLButtonElement>('[data-member]').forEach((btn) =>
    btn.addEventListener('click', () => {
      lastFocus = btn;
      open(btn.dataset.member ?? '');
    }),
  );
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  // Direct links such as /sq/ekipi/#dr-petriti open that profile
  if (location.hash) open(decodeURIComponent(location.hash.slice(1)));
});

/* ------------------------------------------------------------------ gallery filter */
$$('[data-gallery-filter]').forEach((root) => {
  const buttons = $$<HTMLButtonElement>('button[data-filter]', root);
  const items = $$('[data-category]');
  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      items.forEach((it) => {
        it.hidden = !(f === 'all' || it.dataset.category === f);
      });
      ScrollTrigger.refresh();
      replayReveal(items.filter((it) => !it.hidden));
    }),
  );
});

// After switching tabs the photos reveal again like on page load: those on screen one after another,
// the rest as they scroll into view.
function replayReveal(tiles: HTMLElement[]) {
  if (reduced) return;
  const masks = tiles.map((t) => $('[data-reveal="mask"]', t)).filter((m): m is HTMLElement => !!m);
  ScrollTrigger.getAll()
    .filter((st) => masks.includes(st.trigger as HTMLElement))
    .forEach((st) => st.kill());
  masks.forEach((m) => gsap.killTweensOf([m, m.querySelector('img')]));
  gsap.set(masks, { clipPath: 'inset(0 0 100% 0)' });

  const play = (m: HTMLElement, delay: number) => {
    gsap.to(m, { clipPath: 'inset(0 0% 0% 0)', duration: 1.3, ease: 'expo.inOut', delay });
    const img = m.querySelector('img');
    if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 2, ease: 'expo.out', delay: delay + 0.1 });
  };
  let i = 0;
  masks.forEach((m) => {
    if (m.getBoundingClientRect().top < window.innerHeight) play(m, 0.07 * i++);
    else ScrollTrigger.create({ trigger: m, start: 'top 85%', once: true, onEnter: () => play(m, 0) });
  });
}

/* ------------------------------------------------------------------ gallery lightbox */
const lightbox = $<HTMLDialogElement>('[data-lightbox]');
if (lightbox) {
  const img = $<HTMLImageElement>('[data-lightbox-img]', lightbox)!;
  const caption = $('[data-lightbox-caption]', lightbox)!;
  const count = $('[data-lightbox-count]', lightbox)!;
  const tiles = $$<HTMLButtonElement>('[data-lightbox-open]').sort(
    (a, b) => Number(a.dataset.lightboxOpen) - Number(b.dataset.lightboxOpen),
  );
  // Only photos left visible by the current filter take part in prev/next.
  const visible = () => tiles.filter((b) => !b.closest<HTMLElement>('[data-category]')?.hidden);
  let current = 0;

  const show = (i: number) => {
    const list = visible();
    if (!list.length) return;
    current = (i + list.length) % list.length;
    const tile = list[current];
    const thumb = $<HTMLImageElement>('img', tile);
    img.src = tile.dataset.full ?? '';
    img.alt = thumb?.alt ?? '';
    caption.textContent = thumb?.alt ?? '';
    count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
  };

  tiles.forEach((tile) =>
    tile.addEventListener('click', () => {
      show(visible().indexOf(tile));
      lightbox.showModal();
      requestAnimationFrame(() => lightbox.classList.add('is-open'));
      lenis?.stop();
    }),
  );
  lightbox.addEventListener('close', () => {
    lightbox.classList.remove('is-open');
    lenis?.start();
  });
  $('[data-lightbox-close]', lightbox)?.addEventListener('click', () => lightbox.close());
  $('[data-lightbox-prev]', lightbox)?.addEventListener('click', () => show(current - 1));
  $('[data-lightbox-next]', lightbox)?.addEventListener('click', () => show(current + 1));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || (e.target as HTMLElement).classList.contains('lb-stage')) lightbox.close();
  });
  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  let touchX = 0;
  lightbox.addEventListener('touchstart', (e) => (touchX = e.touches[0].clientX), { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
  });
}

/* ------------------------------------------------------------------ motion */
if (!reduced) {
  document.fonts.ready.then(initMotion);
}

function initMotion() {
  // Build the scroll triggers from the top of the page: creating `once` triggers while the page
  // is already scrolled down makes ScrollTrigger throw and leaves later sections unrevealed.
  // The jump back happens in the same frame, so nothing visible changes.
  const startY = window.scrollY;
  const hash = decodeURIComponent(location.hash.slice(1));
  const hashTarget = hash && !$(`[data-profile="${CSS.escape(hash)}"]`) ? document.getElementById(hash) : null;
  if (startY) {
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
  }

  const mm = gsap.matchMedia();
  const small = window.matchMedia('(max-width: 760px)').matches;

  // Split headings into masked lines that rise into place
  $$('[data-split]').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.set(el, { visibility: 'visible' });
    const delay = parseFloat(el.dataset.delay ?? '0');
    const tween = {
      yPercent: 105,
      duration: 1.4,
      ease: 'expo.out',
      stagger: 0.1,
      delay,
    };
    if (el.hasAttribute('data-immediate')) gsap.from(split.lines, tween);
    else gsap.from(split.lines, { ...tween, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  // Typewriter: [data-type] elements are written out one after another, character by character,
  // with a caret that follows the text while it is being typed.
  // Every character is laid out from the start (only hidden), so the text never reflows.
  const typed = $$('[data-type]');
  if (typed.length) {
    const caret = document.createElement('span');
    caret.className = 'type-caret is-typing';
    caret.setAttribute('aria-hidden', 'true');
    const tl = gsap.timeline({ delay: parseFloat(typed[0].dataset.delay ?? '0') });
    typed.forEach((el, i) => {
      el.setAttribute('aria-label', el.textContent?.trim() ?? '');
      const { chars } = SplitText.create(el, { type: 'words,chars' });
      gsap.set(chars, { visibility: 'hidden' });
      gsap.set(el, { visibility: 'visible' });
      if (i > 0) tl.to({}, { duration: 0.35 });
      tl.call(() => el.prepend(caret));
      chars.forEach((c) =>
        tl.call(() => {
          c.style.visibility = 'visible';
          c.after(caret);
        }, undefined, `+=${0.045 + Math.random() * 0.04}`),
      );
    });
    // Once the sentence is complete the caret fades out and is removed.
    tl.to(caret, { opacity: 0, duration: 0.4, ease: 'power1.out' }, '+=0.25');
    tl.call(() => caret.remove());
  }

  // Fades, staggered when siblings enter together. After a long jump (e.g. a link to #contact)
  // the batch also holds everything scrolled past; those appear at once so the stagger doesn't
  // keep the section in view waiting.
  ScrollTrigger.batch('[data-reveal="fade"]:not([data-immediate])', {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => {
      const passed = (batch as HTMLElement[]).filter((el) => el.getBoundingClientRect().bottom < 0);
      if (passed.length) gsap.set(passed, { opacity: 1, y: 0 });
      gsap.to(batch.filter((el) => !passed.includes(el as HTMLElement)), {
        opacity: 1,
        y: 0,
        duration: 1.3,
        ease: 'expo.out',
        stagger: 0.12,
        delay: 0.05,
      });
    },
  });
  $$('[data-reveal="fade"][data-immediate]').forEach((el) =>
    gsap.to(el, { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', delay: parseFloat(el.dataset.delay ?? '0') }),
  );

  // Masked image reveals, with the image settling from a slight zoom
  $$('[data-reveal="mask"], [data-reveal="mask-side"]').forEach((el) => {
    const img = el.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    tl.to(el, { clipPath: 'inset(0 0% 0% 0)', duration: 1.6, ease: 'expo.inOut' });
    if (img && !el.querySelector('[data-parallax]')) tl.from(img, { scale: 1.18, duration: 2.2, ease: 'expo.out' }, 0.1);
  });

  // Hairlines drawing in
  ScrollTrigger.batch('[data-reveal="line"]', {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { scaleX: 1, duration: 1.6, ease: 'expo.inOut', stagger: 0.08 }),
  });

  // Slow parallax inside image frames
  $$('[data-parallax]').forEach((el) => {
    const amount = parseFloat(el.dataset.parallax || '8') * (small ? 0.5 : 1);
    gsap.fromTo(
      el,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });

  // Words that brighten as the reader scrolls through a statement
  $$('[data-words]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words' });
    gsap.fromTo(
      split.words,
      { opacity: 0.16 },
      {
        opacity: 1,
        ease: 'none',
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: true },
      },
    );
  });

  /* ---------- Hero ---------- */
  const heroEl = $('[data-hero]');
  if (heroEl?.dataset.hero === 'cinematic') {
    // Homepage opening frame: the photograph surfaces from the dark and settles very slowly,
    // and the typography rises through masks.
    const photoImg = $('.photo img', heroEl);
    const photoMove = $('.photo-move', heroEl);
    const content = $('.hero-content', heroEl);
    const rise = $$('.rise > *', heroEl);

    if (photoImg) {
      gsap.to(photoImg, { opacity: 1, duration: 1.8, ease: 'power2.out' });
      gsap.fromTo(photoImg, { scale: 1.07 }, { scale: 1, duration: 14, ease: 'sine.out' });
    }
    if (rise.length) gsap.to(rise, { y: 0, yPercent: 0, duration: 1.2, ease: 'expo.out', delay: 0.75 });

    // On scroll the photograph drifts down, the typography drifts away,
    // and the white introduction slides over the frame.
    const out = gsap.timeline({
      scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
    if (photoMove) out.fromTo(photoMove, { yPercent: 0, scale: 1 }, { yPercent: 8, scale: 1.04, ease: 'none' }, 0);
    if (content) out.to(content, { y: -48, opacity: 0, ease: 'none', duration: 0.55 }, 0);
  } else if (heroEl) {
    const img = $('.hero-media img', heroEl);
    const content = $('.hero-content', heroEl);
    const shade = $('.hero-shade', heroEl);
    if (img) gsap.fromTo(img, { scale: 1.14 }, { scale: 1.02, duration: 3.2, ease: 'expo.out' });

    const out = gsap.timeline({
      scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: true },
    });
    out.to(content, { yPercent: -18, opacity: 0, ease: 'none' }, 0);
    if (shade) out.to(shade, { opacity: 0.75, ease: 'none' }, 0);
    if (img) out.to($('.hero-media', heroEl), { yPercent: 12, ease: 'none' }, 0);
  }

  /* ---------- Approach: inset image expanding to full bleed ---------- */
  mm.add('(min-width: 761px)', () => {
    $$('[data-expand]').forEach((el) => {
      const frame = $('.expand-frame', el);
      const img = $('.expand-frame img', el);
      const text = $('.expand-text', el);
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top top', end: '+=110%', scrub: true, pin: true, anticipatePin: 1 },
      });
      tl.fromTo(frame, { clipPath: 'inset(16% 22% 16% 22%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0);
      if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, ease: 'none' }, 0);
      if (text) tl.fromTo(text, { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'none' }, 0.45);
    });
  });
  mm.add('(max-width: 760px)', () => {
    $$('[data-expand] .expand-text').forEach((text) =>
      gsap.from(text, { opacity: 0, y: 30, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: text, start: 'top 85%', once: true } }),
    );
  });

  /* ---------- Approach steps: sticky image changes with each step ---------- */
  $$('[data-steps]').forEach((root) => {
    const steps = $$('[data-step]', root);
    const images = $$('[data-step-image]', root);
    const counter = $('[data-step-current]', root);
    steps.forEach((step, i) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 60%',
        end: 'bottom 60%',
        onToggle: (self) => {
          if (!self.isActive) return;
          steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
          images.forEach((im, j) => im.classList.toggle('is-active', j <= i));
          if (counter) counter.textContent = String(i + 1).padStart(2, '0');
        },
      });
    });
  });

  // Recalculate once images have loaded and layout is final
  window.addEventListener('load', () => ScrollTrigger.refresh());

  // Put the visitor back where they arrived (a hash such as /sq/#contact, or a restored scroll
  // position), now that the pins have added their spacing, and let the reveals there fire.
  if (!startY && !hashTarget) return;
  const realign = () => {
    ScrollTrigger.refresh();
    const to = hashTarget ? hashTarget.getBoundingClientRect().top + window.scrollY : startY;
    lenis?.resize(); // page height changed with the pin spacing; Lenis would clamp to the old limit
    window.scrollTo(0, to);
    lenis?.scrollTo(to, { immediate: true, force: true });
    ScrollTrigger.update();
  };
  realign();
  if (document.readyState !== 'complete') window.addEventListener('load', realign, { once: true });
}
