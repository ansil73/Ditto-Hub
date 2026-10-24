// The bag page: change quantities, remove items and send the whole order in one WhatsApp message.
import { priceView } from '../lib/pricing';
import { inr } from '../lib/format';
import { thumb } from '../lib/images';
import { bagOrderText, waUrl } from '../lib/messages';
import { config, offerData } from './config';
import { loadCatalog, type CatalogProduct } from './catalog';
import { absolute, asset, href } from './paths';
import { store, type BagItem } from './store';
import { track } from './track';

const ICON_MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>';
const ICON_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export async function initBag() {
  const root = document.querySelector<HTMLElement>('[data-bag]');
  if (!root) return;
  const loading = root.querySelector<HTMLElement>('[data-bag-loading]')!;
  const empty = root.querySelector<HTMLElement>('[data-bag-empty]')!;
  const full = root.querySelector<HTMLElement>('[data-bag-full]')!;
  const list = root.querySelector<HTMLElement>('[data-bag-list]')!;
  const itemsOut = root.querySelector<HTMLElement>('[data-bag-items]')!;
  const totalOut = root.querySelector<HTMLElement>('[data-bag-total]')!;
  const send = root.querySelector<HTMLAnchorElement>('[data-bag-send]')!;
  const clear = root.querySelector<HTMLButtonElement>('[data-bag-clear]')!;

  const products = await loadCatalog();
  const byId = new Map(products.map((p) => [p.id, p]));

  const available = (item: BagItem, p: CatalogProduct | undefined) => {
    if (!p || p.stock <= 0) return false;
    if (item.size) return (p.sizes.find((s) => s.size === item.size)?.stock ?? 0) > 0;
    return true;
  };

  const row = (item: BagItem) => {
    const p = byId.get(item.id);
    const ok = available(item, p);
    const price = p ? priceView(p, offerData.offers).price : 0;
    const li = el('li', 'bag-item');
    const img = el('img');
    img.src = p ? asset(thumb(p.image, 480)) : asset('/brand/ditto-hub-mark.svg');
    img.alt = '';
    img.width = 88;
    img.height = 88;
    const body = el('div', 'bag-item-body');
    const name = el('a', 'bag-item-name', p?.name ?? item.id);
    name.href = href(p?.url ?? '/shop/');
    const meta = el(
      'p',
      'bag-item-meta',
      [item.size ? `Size ${item.size.replace(/^UK\s*/i, 'UK ')}` : '', item.colour ?? '', `ID ${item.id}`].filter(Boolean).join(' · ')
    );
    body.append(name, meta);
    if (!ok) body.append(el('p', 'bag-gone', p ? 'Sold out in this size. Remove it or ask us for a restock.' : 'No longer available.'));
    const line = el('div', 'bag-item-row');
    const qty = el('div', 'qty');
    const minus = el('button');
    minus.type = 'button';
    minus.innerHTML = ICON_MINUS;
    minus.setAttribute('aria-label', `One less ${p?.name ?? ''}`);
    minus.disabled = item.qty <= 1;
    minus.addEventListener('click', () => store.setQty(item.id, item.size, item.qty - 1));
    const out = el('output', '', String(item.qty));
    out.setAttribute('aria-label', 'Quantity');
    const plus = el('button');
    plus.type = 'button';
    plus.innerHTML = ICON_PLUS;
    plus.setAttribute('aria-label', `One more ${p?.name ?? ''}`);
    plus.disabled = !ok || item.qty >= 9;
    plus.addEventListener('click', () => store.setQty(item.id, item.size, item.qty + 1));
    qty.append(minus, out, plus);
    const priceEl = el('span', 'price', ok ? inr(price * item.qty) : '—');
    const remove = el('button', 'bag-remove', 'Remove');
    remove.type = 'button';
    remove.addEventListener('click', () => store.remove(item.id, item.size));
    line.append(qty, priceEl, remove);
    body.append(line);
    li.append(img, body);
    return { li, ok, price, p };
  };

  const render = () => {
    const items = store.bag();
    loading.hidden = true;
    empty.hidden = items.length > 0;
    full.hidden = items.length === 0;
    if (!items.length) return;
    const rows = items.map((item) => ({ item, ...row(item) }));
    list.replaceChildren(...rows.map((r) => r.li));
    const ready = rows.filter((r) => r.ok && r.p);
    const count = ready.reduce((n, r) => n + r.item.qty, 0);
    const total = ready.reduce((n, r) => n + r.price * r.item.qty, 0);
    itemsOut.textContent = String(count);
    totalOut.textContent = inr(total);
    send.href = waUrl(
      config.whatsapp,
      bagOrderText(
        ready.map((r) => ({ id: r.item.id, name: r.p!.name, price: r.price, qty: r.item.qty, size: r.item.size, colour: r.item.colour, url: absolute(r.p!.url) }))
      )
    );
    send.toggleAttribute('aria-disabled', ready.length === 0);
  };

  send.addEventListener('click', () => track('whatsapp-bag', String(store.bagCount())));
  clear.addEventListener('click', () => store.clearBag());
  store.subscribe(render);
  render();
}
