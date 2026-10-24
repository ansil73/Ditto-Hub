// Filters, sorting and search for the shop and category pages.
// The page already contains every product; this only shows, hides and reorders them,
// and keeps the choices in the address so a filtered view can be shared.
import { daysBetween, istDate, tierOf } from '../lib/pricing';
import { inr } from '../lib/format';
import { refreshPrices } from './live';

interface State {
  q: string;
  cat: string;
  tier: string;
  sizes: string[];
  instock: boolean;
  fresh: boolean;
  offer: boolean;
  max: number;
  sort: string;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9₹ ]/g, ' ');

const PREVIEW = document.documentElement.hasAttribute('data-preview');

/** Filters live in the query string (?tier=under-999), or after # in the preview copy. */
function readParams(): URLSearchParams {
  if (PREVIEW) return new URLSearchParams(location.hash.includes('=') ? location.hash.slice(1) : '');
  return new URLSearchParams(location.search);
}

export function initShop() {
  const root = document.querySelector<HTMLElement>('[data-shop]');
  const form = root?.querySelector<HTMLFormElement>('[data-shop-form]');
  const grid = root?.querySelector<HTMLElement>('[data-shop-grid]');
  if (!root || !form || !grid) return;

  const lock = root.dataset.lock || '';
  const cards = [...grid.querySelectorAll<HTMLElement>('[data-card]')];
  const count = root.querySelector<HTMLElement>('[data-shop-count]');
  const empty = root.querySelector<HTMLElement>('[data-shop-empty]');
  const filters = root.querySelector<HTMLElement>('[data-filters]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-filters-toggle]');
  const badge = root.querySelector<HTMLElement>('[data-filter-count]');
  const range = form.querySelector<HTMLInputElement>('input[name="max"]');
  const rangeOut = form.querySelector<HTMLOutputElement>('[data-max-out]');
  const sizeGroup = form.querySelector<HTMLElement>('[data-size-filter]');
  const maxDefault = Number(range?.dataset.max ?? 100000);

  const read = (): State => {
    const fd = new FormData(form);
    return {
      q: String(fd.get('q') ?? '').trim(),
      cat: lock || String(fd.get('cat') ?? 'all'),
      tier: String(fd.get('tier') ?? 'any'),
      sizes: fd.getAll('size').map(String),
      instock: fd.has('instock'),
      fresh: fd.has('new'),
      offer: fd.has('offer'),
      max: Number(fd.get('max') ?? maxDefault),
      sort: String(fd.get('sort') ?? 'new'),
    };
  };

  const setRadio = (name: string, value: string) => {
    const input = form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${CSS.escape(value)}"]`);
    if (input) input.checked = true;
  };

  const fromUrl = () => {
    const params = readParams();
    const q = form.querySelector<HTMLInputElement>('input[name="q"]');
    if (q) q.value = params.get('q') ?? '';
    if (!lock && params.get('cat')) setRadio('cat', params.get('cat')!);
    if (params.get('tier')) setRadio('tier', params.get('tier')!);
    const sizes = params.getAll('size');
    form.querySelectorAll<HTMLInputElement>('input[name="size"]').forEach((i) => (i.checked = sizes.includes(i.value)));
    const instock = form.querySelector<HTMLInputElement>('input[name="instock"]');
    if (instock) instock.checked = params.get('instock') !== '0';
    const fresh = form.querySelector<HTMLInputElement>('input[name="new"]');
    if (fresh) fresh.checked = params.get('new') === '1';
    const offer = form.querySelector<HTMLInputElement>('input[name="offer"]');
    if (offer) offer.checked = params.get('offer') === '1';
    if (range && params.get('max')) range.value = params.get('max')!;
    const sort = form.querySelector<HTMLSelectElement>('select[name="sort"]');
    if (sort && params.get('sort')) sort.value = params.get('sort')!;
  };

  const toUrl = (s: State) => {
    const params = new URLSearchParams();
    if (s.q) params.set('q', s.q);
    if (!lock && s.cat !== 'all') params.set('cat', s.cat);
    if (s.tier !== 'any') params.set('tier', s.tier);
    s.sizes.forEach((z) => params.append('size', z));
    if (!s.instock) params.set('instock', '0');
    if (s.fresh) params.set('new', '1');
    if (s.offer) params.set('offer', '1');
    if (s.max < maxDefault) params.set('max', String(s.max));
    if (s.sort !== 'new') params.set('sort', s.sort);
    const qs = params.toString();
    try {
      // The preview copy keeps filters after # because its host may own the query string.
      const next = PREVIEW
        ? `${location.pathname}${location.search}${qs ? `#${qs}` : ''}`
        : `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
      history.replaceState(null, '', next);
    } catch {
      /* some embedded views block address changes */
    }
  };

  const activeCount = (s: State) =>
    [s.cat !== 'all' && !lock, s.tier !== 'any', s.sizes.length > 0, !s.instock, s.fresh, s.offer, s.max < maxDefault].filter(Boolean).length;

  const apply = () => {
    refreshPrices(grid);
    const s = read();
    const today = istDate();
    const words = norm(s.q).split(/\s+/).filter(Boolean);
    let shown = 0;

    if (sizeGroup) sizeGroup.hidden = !(s.cat === 'all' || s.cat === 'sneakers');
    if (rangeOut) rangeOut.textContent = s.max >= maxDefault ? `${inr(maxDefault)} (any)` : inr(s.max);

    for (const card of cards) {
      const d = card.dataset;
      const price = Number(d.livePrice ?? d.price);
      const hay = norm(`${d.name} ${d.type} ${d.category} ${d.id} ${d.tags ?? ''}`);
      const cardSizes = (d.sizes ?? '').split('|').filter(Boolean);
      const ok =
        (s.cat === 'all' || d.category === s.cat) &&
        (s.tier === 'any' || tierOf(price) === s.tier) &&
        (!s.sizes.length || (d.category === 'sneakers' && s.sizes.some((z) => cardSizes.includes(z)))) &&
        (!s.instock || Number(d.stock) > 0) &&
        (!s.fresh || daysBetween(d.arrival ?? today, today) <= 7) &&
        (!s.offer || d.onOffer === '1') &&
        price <= s.max &&
        words.every((w) => hay.includes(w));
      card.hidden = !ok;
      if (ok) shown++;
    }

    const value = (c: HTMLElement) => Number(c.dataset.livePrice ?? c.dataset.price);
    const discount = (c: HTMLElement) => {
      const mrp = Number(c.dataset.mrp || 0);
      return mrp ? (mrp - value(c)) / mrp : 0;
    };
    const sorted = [...cards].sort((a, b) => {
      if (s.sort === 'price-asc') return value(a) - value(b);
      if (s.sort === 'price-desc') return value(b) - value(a);
      if (s.sort === 'discount') return discount(b) - discount(a);
      return (b.dataset.arrival ?? '').localeCompare(a.dataset.arrival ?? '') || (a.dataset.name ?? '').localeCompare(b.dataset.name ?? '');
    });
    sorted.forEach((c) => grid.append(c));

    if (count) count.textContent = `${shown} ${shown === 1 ? 'product' : 'products'}${s.q ? ` for “${s.q}”` : ''}`;
    if (empty) empty.hidden = shown > 0;
    const n = activeCount(s);
    if (badge) {
      badge.hidden = n === 0;
      badge.textContent = String(n);
    }
    toUrl(s);
  };

  fromUrl();
  if (readParams().size > 0 && toggle && matchMedia('(max-width: 1079px)').matches) {
    const s = read();
    if (activeCount(s) > 0) {
      filters?.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
  }
  apply();

  let timer = 0;
  form.addEventListener('input', (e) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, (e.target as HTMLElement).matches('input[type="search"]') ? 120 : 0);
  });
  form.addEventListener('change', apply);
  form.addEventListener('submit', (e) => e.preventDefault());
  root.querySelectorAll('[data-clear]').forEach((btn) =>
    btn.addEventListener('click', () => {
      form.reset();
      if (range) range.value = String(maxDefault);
      apply();
    })
  );
  toggle?.addEventListener('click', () => {
    const open = !filters?.classList.contains('is-open');
    filters?.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
}
