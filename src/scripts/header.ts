// Menu and search sheets, plus the logo's live clock.
import { priceView } from '../lib/pricing';
import { inr } from '../lib/format';
import { thumb } from '../lib/images';
import { offerData } from './config';
import { asset, href } from './paths';
import { loadCatalog, type CatalogProduct } from './catalog';
import { track } from './track';

type SearchProduct = CatalogProduct;

function openSheet(sheet: HTMLDialogElement | null) {
  if (!sheet || sheet.open) return;
  sheet.showModal();
  document.documentElement.style.overflow = 'hidden';
}

function wireSheet(sheet: HTMLDialogElement | null) {
  if (!sheet) return;
  sheet.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
  });
  sheet.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (t === sheet || t.closest('[data-close-sheet]')) sheet.close();
    if (t.closest('a[href]')) sheet.close();
  });
}

function renderResults(list: HTMLElement, status: HTMLElement, items: SearchProduct[], query: string) {
  list.replaceChildren();
  if (!query) {
    status.textContent = '';
    return;
  }
  if (!items.length) {
    status.textContent = `Nothing matches “${query}”. Try another word, or browse a category above.`;
    return;
  }
  status.textContent = `${items.length} ${items.length === 1 ? 'match' : 'matches'}`;
  for (const p of items) {
    const v = priceView(p, offerData.offers);
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = href(p.url);
    const img = document.createElement('img');
    img.src = asset(thumb(p.image, 480));
    img.alt = '';
    img.loading = 'lazy';
    const text = document.createElement('span');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = p.name;
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = `${p.id} · ${p.colours[0] ?? p.category}`;
    text.append(name, document.createElement('br'), meta);
    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = inr(v.price);
    a.append(img, text, price);
    li.append(a);
    list.append(li);
  }
}

function initSearch() {
  const sheet = document.querySelector<HTMLDialogElement>('#search-sheet');
  const input = document.querySelector<HTMLInputElement>('#site-search');
  const list = document.querySelector<HTMLElement>('[data-search-results]');
  const status = document.querySelector<HTMLElement>('[data-search-status]');
  const form = document.querySelector<HTMLFormElement>('[data-search-form]');
  if (!sheet || !input || !list || !status) return;
  wireSheet(sheet);

  let fuse: { search: (q: string) => { item: SearchProduct }[] } | null = null;
  const ready = async () => {
    if (fuse) return fuse;
    const [{ default: Fuse }, products] = await Promise.all([import('fuse.js'), loadCatalog()]);
    fuse = new Fuse(products, {
      keys: [
        { name: 'name', weight: 0.6 },
        { name: 'category', weight: 0.15 },
        { name: 'type', weight: 0.15 },
        { name: 'colours', weight: 0.05 },
        { name: 'id', weight: 0.05 },
      ],
      threshold: 0.38,
      ignoreLocation: true,
    });
    return fuse;
  };

  document.querySelectorAll('[data-open-search]').forEach((btn) =>
    btn.addEventListener('click', () => {
      openSheet(sheet);
      void ready();
      window.setTimeout(() => input.focus(), 50);
    })
  );

  let timer = 0;
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      const q = input.value.trim();
      const f = await ready();
      renderResults(list, status, q ? f.search(q).slice(0, 8).map((r) => r.item) : [], q);
    }, 90);
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) {
      track('search', q.slice(0, 40));
      location.href = href(`/shop/?q=${encodeURIComponent(q)}`);
    }
  });
}

function initMenu() {
  const sheet = document.querySelector<HTMLDialogElement>('#menu-sheet');
  wireSheet(sheet);
  document.querySelectorAll('[data-open-menu]').forEach((btn) => btn.addEventListener('click', () => openSheet(sheet)));
}

const IST_PARTS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', hour12: false });

function initClock() {
  const marks = document.querySelectorAll<SVGElement>('[data-mark="live"]');
  if (!marks.length) return;
  const set = () => {
    const parts = IST_PARTS.formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 10) % 12;
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 10);
    marks.forEach((svg) => {
      svg.style.setProperty('--h', `${h * 30 + m * 0.5}deg`);
      svg.style.setProperty('--m', `${m * 6}deg`);
    });
  };
  set();
  window.setInterval(set, 30_000);
}

function initFloat() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-float-toggle]');
  const more = document.getElementById('float-more');
  if (!toggle || !more) return;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    more.hidden = !open;
  });
}

export function initHeader() {
  initMenu();
  initSearch();
  initClock();
  initFloat();
}
