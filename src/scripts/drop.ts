// The Drop Room controller: turns scroll position into the hero → sneaker → watch → gadget sequence.
// Uses the 3D scene when the device can handle it; otherwise the photo version runs the same timing.
import { asset } from './paths';
import { clamp, panelOpacity, productWeights, smoothstep } from './dropmath';
import type { DropScene } from './drop3d';

interface DropData {
  date: string;
  mark: string;
  products: { id: string; cutout: string; model: string | null }[];
}

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

function canRun3D(): boolean {
  const nav = navigator as Nav;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (nav.connection?.saveData) return false;
  if ((nav.deviceMemory ?? 8) <= 2) return false;
  if ((nav.hardwareConcurrency ?? 8) <= 2) return false;
  try {
    const test = document.createElement('canvas');
    return !!(test.getContext('webgl2') || test.getContext('webgl'));
  } catch {
    return false;
  }
}

export function initDrop() {
  const root = document.querySelector<HTMLElement>('[data-drop]');
  if (!root) return;
  const track = root.querySelector<HTMLElement>('.drop-track')!;
  const stage = root.querySelector<HTMLElement>('.drop-stage')!;
  const hero = root.querySelector<HTMLElement>('[data-drop-hero]');
  const panels = [...root.querySelectorAll<HTMLElement>('[data-drop-panel]')];
  const words = [...root.querySelectorAll<HTMLElement>('[data-drop-word]')];
  const dots = [...root.querySelectorAll<HTMLElement>('[data-drop-dot]')];
  const posters = [...root.querySelectorAll<HTMLElement>('[data-poster]')];
  const hint = root.querySelector<HTMLElement>('[data-drop-hint]');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-drop-canvas]');
  let data: DropData | null = null;
  try {
    data = JSON.parse(document.getElementById('drop-data')?.textContent || 'null');
  } catch {
    data = null;
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let target = 0;
  let smooth = 0;
  let visible = true;
  let raf = 0;
  let scene: DropScene | null = null;
  let frames: number[] = [];
  let lastT = 0;
  // ?force3d skips the slow-device check (useful when testing on a slow machine).
  const force3d = new URLSearchParams(location.search).has('force3d');

  const measure = () => {
    const r = track.getBoundingClientRect();
    const total = Math.max(1, r.height - window.innerHeight);
    target = clamp(-r.top / total, 0, 1);
  };

  const apply = (p: number) => {
    const heroOut = smoothstep(0.07, 0.19, p);
    if (hero) {
      hero.style.opacity = String(1 - heroOut);
      hero.style.transform = `translateY(${(-heroOut * 36).toFixed(1)}px)`;
      hero.toggleAttribute('inert', heroOut > 0.9);
    }
    panels.forEach((el, i) => {
      const o = panelOpacity(i, p);
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${((1 - o) * 24).toFixed(1)}px)`;
      el.toggleAttribute('inert', o < 0.5);
    });
    const w = productWeights(p);
    words.forEach((el) => {
      // Two copies of each word (plain and spotlit) share the same index.
      const i = Number(el.dataset.dropWord);
      const show = i === 0 ? w[0] * smoothstep(0.12, 0.26, p) : w[i];
      el.style.opacity = (show * 0.9).toFixed(3);
      el.style.transform = `translateX(${((0.5 - p) * 18 + (i - 1) * 4).toFixed(2)}%)`;
    });
    posters.forEach((el, i) => {
      const v = w[i] ?? 0;
      el.style.setProperty('--show', v.toFixed(3));
      el.style.setProperty('--rise', `${((1 - v) * 70).toFixed(1)}px`);
      el.style.setProperty('--scale', (0.88 + 0.12 * v).toFixed(3));
    });
    const active = w.indexOf(Math.max(...w));
    dots.forEach((d, i) => d.classList.toggle('is-on', i === active));
    if (hint) hint.style.opacity = String(1 - smoothstep(0.01, 0.06, p));
  };

  const fallBackToPhotos = () => {
    scene?.dispose();
    scene = null;
    root.classList.remove('is-3d');
  };

  const frame = (now: number) => {
    raf = 0;
    smooth += (target - smooth) * 0.12;
    if (Math.abs(target - smooth) < 0.0003) smooth = target;
    apply(smooth);
    if (scene) {
      scene.render(smooth, now / 1000);
      // Safety net: if the device struggles, switch to the photo version.
      if (!force3d && lastT && frames.length < 90) {
        frames.push(now - lastT);
        if (frames.length === 90) {
          const sorted = [...frames].sort((a, b) => a - b);
          if (sorted[45] > 42) fallBackToPhotos();
        }
      }
      lastT = now;
    }
    // In photo mode the loop rests once the scroll position settles; scrolling wakes it again.
    if (visible && !document.hidden && (scene || smooth !== target)) raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (!raf && visible && !document.hidden) {
      lastT = 0;
      raf = requestAnimationFrame(frame);
    }
  };

  window.addEventListener(
    'scroll',
    () => {
      measure();
      start();
    },
    { passive: true }
  );
  window.addEventListener('resize', measure);
  document.addEventListener('visibilitychange', start);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    // The hero has its own WhatsApp button, so the floating one waits until you scroll past.
    document.body.classList.toggle('drop-in-view', visible);
    if (visible) start();
  }).observe(track);

  measure();
  smooth = target;
  apply(smooth);
  start();

  // Pointer parallax for the 3D scene, and the desktop spotlight that follows the cursor.
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    stage.style.setProperty('--sx', `${x.toFixed(0)}px`);
    stage.style.setProperty('--sy', `${y.toFixed(0)}px`);
    stage.classList.add('is-spot');
    scene?.pointer((x / r.width) * 2 - 1, (y / r.height) * 2 - 1);
  });
  stage.addEventListener('pointerleave', () => {
    stage.classList.remove('is-spot');
    scene?.pointer(0, 0);
  });
  if (canvas) {
    let dragging = false;
    let lastX = 0;
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastX = e.clientX;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging || !scene) return;
      scene.drag(e.clientX - lastX);
      lastX = e.clientX;
    });
    const stop = () => (dragging = false);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  }

  // Smooth wheel scrolling on desktop makes the scroll story glide.
  if (matchMedia('(pointer: fine)').matches) {
    import('lenis')
      .then(({ default: Lenis }) => {
        const lenis = new Lenis({ lerp: 0.12 });
        const loop = (t: number) => {
          lenis.raf(t);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      })
      .catch(() => undefined);
  }

  // Boot the 3D scene after the page has painted.
  if (canvas && data && (force3d || canRun3D())) {
    const boot = () =>
      import('./drop3d')
        .then(({ createDropScene }) =>
          createDropScene(canvas, {
            date: data!.date,
            mark: asset(data!.mark),
            products: data!.products.map((p) => ({ cutout: asset(p.cutout), model: p.model ? asset(p.model) : null })),
          })
        )
        .then((s) => {
          scene = s;
          frames = [];
          canvas.addEventListener('webglcontextlost', fallBackToPhotos, { once: true });
          requestAnimationFrame(() => root.classList.add('is-3d'));
          start();
        })
        .catch(() => fallBackToPhotos());
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => void boot(), { timeout: 1200 });
    else setTimeout(boot, 300);
  }
}
