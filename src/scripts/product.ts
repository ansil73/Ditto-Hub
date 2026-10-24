// Product page: photo gallery and zoom, 3D / 360° / video tabs, and the sticky order bar.
import { asset } from './paths';
import { thumb } from '../lib/images';

function initGallery() {
  const gallery = document.querySelector<HTMLElement>('[data-gallery]');
  if (!gallery) return;
  const slides = [...gallery.querySelectorAll<HTMLElement>('[data-slide]')];
  const thumbs = [...document.querySelectorAll<HTMLButtonElement>('[data-thumb]')];
  const go = (i: number) => {
    const idx = Math.max(0, Math.min(slides.length - 1, i));
    gallery.scrollTo({ left: idx * gallery.clientWidth, behavior: 'smooth' });
  };
  const current = () => Math.round(gallery.scrollLeft / Math.max(1, gallery.clientWidth));
  let frame = 0;
  gallery.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = current();
        thumbs.forEach((t, j) => t.setAttribute('aria-current', String(i === j)));
      });
    },
    { passive: true }
  );
  thumbs.forEach((t) => t.addEventListener('click', () => go(Number(t.dataset.thumb))));
  gallery.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(current() + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(current() - 1);
    }
  });
}

function initLightbox() {
  const box = document.querySelector<HTMLDialogElement>('[data-lightbox]');
  const img = box?.querySelector<HTMLImageElement>('[data-lightbox-img]');
  const stage = box?.querySelector<HTMLElement>('[data-lightbox-stage]');
  const counter = box?.querySelector<HTMLElement>('[data-lightbox-count]');
  if (!box || !img || !stage) return;
  let images: string[] = [];
  let name = '';
  try {
    const data = JSON.parse(document.getElementById('pdp-data')?.textContent || '{}');
    images = data.images ?? [];
    name = data.name ?? '';
  } catch {
    return;
  }
  let index = 0;
  const show = (i: number) => {
    index = (i + images.length) % images.length;
    stage.classList.remove('is-zoomed');
    img.src = asset(images[index]);
    img.alt = `${name}, photo ${index + 1}`;
    if (counter) counter.textContent = `${index + 1} / ${images.length}`;
  };
  document.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach((btn) =>
    btn.addEventListener('click', () => {
      show(Number(btn.dataset.zoom));
      box.showModal();
    })
  );
  box.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => show(index - 1));
  box.querySelector('[data-lightbox-next]')?.addEventListener('click', () => show(index + 1));
  box.querySelector('[data-lightbox-close]')?.addEventListener('click', () => box.close());
  img.addEventListener('click', (e) => {
    const r = img.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    stage.classList.toggle('is-zoomed');
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });
  // Swipe between photos when not zoomed in.
  let startX = 0;
  stage.addEventListener('pointerdown', (e) => (startX = e.clientX));
  stage.addEventListener('pointerup', (e) => {
    const dx = e.clientX - startX;
    if (stage.classList.contains('is-zoomed') || Math.abs(dx) < 50) return;
    show(index + (dx < 0 ? 1 : -1));
  });
}

function initTabs() {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  if (tabs.length < 2) return;
  const panels = [...document.querySelectorAll<HTMLElement>('[data-panel]')];
  const select = (id: string, focus = false) => {
    tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    panels.forEach((p) => {
      p.hidden = p.dataset.panel !== id;
      if (p.hidden) p.querySelectorAll('video').forEach((v) => v.pause());
    });
    if (id === '3d') void loadModel();
    if (id === 'spin') initSpin();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.tab!));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      select(next.dataset.tab!, true);
    });
  });
}

let modelLoaded = false;
async function loadModel() {
  if (modelLoaded) return;
  const panel = document.querySelector<HTMLElement>('[data-panel="3d"]');
  const box = panel?.querySelector<HTMLElement>('[data-model-box]');
  if (!panel || !box || !panel.dataset.model) return;
  modelLoaded = true;
  try {
    await import('@google/model-viewer');
    const mv = document.createElement('model-viewer');
    mv.setAttribute('src', asset(panel.dataset.model));
    if (panel.dataset.poster) mv.setAttribute('poster', asset(thumb(panel.dataset.poster, 960)));
    mv.setAttribute('alt', document.querySelector('.pdp-name')?.textContent?.trim() ?? 'Product in 3D');
    for (const attr of ['camera-controls', 'auto-rotate', 'ar', 'touch-action']) mv.setAttribute(attr, attr === 'touch-action' ? 'pan-y' : '');
    mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
    mv.setAttribute('shadow-intensity', '1');
    mv.setAttribute('exposure', '1.05');
    mv.setAttribute('environment-image', 'neutral');
    box.replaceChildren(mv);
  } catch {
    box.innerHTML = '<p class="note">The 3D view could not load. Use the photos instead.</p>';
  }
}

let spinReady = false;
function initSpin() {
  if (spinReady) return;
  const el = document.querySelector<HTMLElement>('[data-spin]');
  const img = el?.querySelector<HTMLImageElement>('img');
  if (!el || !img) return;
  spinReady = true;
  let frames: string[] = [];
  try {
    frames = (JSON.parse(el.dataset.frames || '[]') as string[]).map(asset);
  } catch {
    return;
  }
  frames.forEach((src) => {
    const pre = new Image();
    pre.src = src;
  });
  let index = 0;
  const show = (i: number) => {
    index = (i + frames.length) % frames.length;
    img.src = frames[index];
  };
  let dragging = false;
  let lastX = 0;
  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const step = Math.max(6, el.clientWidth / frames.length / 1.5);
    while (Math.abs(e.clientX - lastX) >= step) {
      const dir = e.clientX > lastX ? -1 : 1;
      show(index + dir);
      lastX += -dir * step;
    }
  });
  el.addEventListener('pointerup', () => (dragging = false));
  el.addEventListener('pointercancel', () => (dragging = false));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });
}

function initActionBar() {
  const bar = document.querySelector<HTMLElement>('[data-action-bar]');
  const main = document.querySelector<HTMLElement>('[data-main-actions]');
  if (!bar || !main || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([entry]) => {
    const above = entry.boundingClientRect.top < 0;
    bar.classList.toggle('is-shown', !entry.isIntersecting && above);
  }).observe(main);
}

export function initProduct() {
  initGallery();
  initLightbox();
  initTabs();
  initActionBar();
}
