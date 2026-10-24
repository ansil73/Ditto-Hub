// Every "Order on WhatsApp", "Ask on Instagram", wishlist heart and share button on the site.
// WhatsApp links are rebuilt at the moment of the tap so they carry the chosen size,
// colour and today's price.
import { priceView } from '../lib/pricing';
import { comboText, productOrderText, restockText, waUrl } from '../lib/messages';
import { config, offerData } from './config';
import { absolute, href } from './paths';
import { store } from './store';
import { copyText, shareLink, toast } from './ui';
import { track } from './track';

interface ProductCtx {
  id: string;
  name: string;
  url: string;
  price: number;
  size: string | null;
  colour: string | null;
  needsSize: boolean;
  form: HTMLFormElement | null;
}

function productContext(el: HTMLElement): ProductCtx | null {
  const holder =
    el.closest<HTMLElement>('[data-product-ctx]') ??
    el.closest<HTMLElement>('[data-card]') ??
    (el.dataset.id ? document.querySelector<HTMLElement>(`[data-product-ctx][data-id="${el.dataset.id}"]`) : null);
  const id = el.dataset.id ?? holder?.dataset.id;
  if (!id) return null;
  const name = el.dataset.name ?? holder?.dataset.name ?? id;
  const url = el.dataset.url ?? holder?.dataset.url ?? `/p/${id}/`;
  const base = Number(el.dataset.price ?? holder?.dataset.price ?? 0);
  const mrp = holder?.dataset.mrp ? Number(holder.dataset.mrp) : null;
  const price = priceView({ id, price: base, mrp }, offerData.offers).price;
  const form = holder?.querySelector<HTMLFormElement>('form[data-buy]') ?? document.querySelector<HTMLFormElement>(`form[data-buy][data-id="${id}"]`);
  const size = form?.querySelector<HTMLInputElement>('input[name="size"]:checked')?.value ?? null;
  const colour =
    form?.querySelector<HTMLInputElement>('input[name="colour"]:checked')?.value ??
    form?.dataset.colour ??
    holder?.dataset.colour ??
    null;
  const needsSize = form?.dataset.needsSize === 'true';
  return { id, name, url, price, size, colour, needsSize, form };
}

function demandSize(ctx: ProductCtx): boolean {
  if (!ctx.needsSize || ctx.size) return false;
  const group = ctx.form?.querySelector<HTMLElement>('[data-size-group]');
  const error = ctx.form?.querySelector<HTMLElement>('[data-size-error]');
  if (error) error.hidden = false;
  group?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  group?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus({ preventScroll: true });
  toast('Choose your size first.');
  return true;
}

function onWhatsApp(link: HTMLAnchorElement, e: MouseEvent) {
  const kind = link.dataset.wa;
  let text: string | null = null;
  if (kind === 'product' || kind === 'restock') {
    const ctx = productContext(link);
    if (!ctx) return;
    if (kind === 'product' && demandSize(ctx)) {
      e.preventDefault();
      return;
    }
    const item = { id: ctx.id, name: ctx.name, price: ctx.price, size: ctx.size, colour: ctx.colour, url: absolute(ctx.url) };
    text = kind === 'product' ? productOrderText(item) : restockText(item);
    track(kind === 'product' ? 'whatsapp-order' : 'whatsapp-restock', ctx.id);
  } else if (kind === 'combo') {
    text = comboText({
      id: link.dataset.comboId ?? '',
      title: link.dataset.comboTitle ?? 'Combo',
      price: Number(link.dataset.comboPrice ?? 0),
      includes: (link.dataset.comboItems ?? '').split('|').filter(Boolean),
    });
    track('whatsapp-combo', link.dataset.comboId);
  }
  if (text) link.href = waUrl(config.whatsapp, text);
}

function onInstagram(link: HTMLAnchorElement) {
  const ctx = productContext(link);
  const text = ctx
    ? productOrderText({ id: ctx.id, name: ctx.name, price: ctx.price, size: ctx.size, colour: ctx.colour, url: absolute(ctx.url) })
    : 'Hi DITTO HUB! I have a question.';
  // Instagram links cannot carry a message, so copy it for the customer to paste.
  void copyText(text).then((ok) =>
    toast(ok ? 'Details copied — paste them in the DM.' : 'Instagram is opening. Tell us the product name or ID.')
  );
  track('instagram-ask', ctx?.id);
}

function syncHearts() {
  document.querySelectorAll<HTMLButtonElement>('[data-wish]').forEach((btn) => {
    const on = store.hasWish(btn.dataset.wish!);
    btn.setAttribute('aria-pressed', String(on));
  });
}

function syncCounts() {
  const bag = store.bagCount();
  const wish = store.wish().length;
  document.querySelectorAll<HTMLElement>('[data-bag-count]').forEach((el) => {
    el.textContent = String(bag);
    el.hidden = bag === 0;
  });
  document.querySelectorAll<HTMLElement>('[data-wish-count]').forEach((el) => {
    el.textContent = String(wish);
    el.hidden = wish === 0;
  });
  document.querySelectorAll<HTMLElement>('[data-bag-link]').forEach((el) =>
    el.setAttribute('aria-label', bag ? `Bag, ${bag} ${bag === 1 ? 'item' : 'items'}` : 'Bag')
  );
}

export function initActions() {
  syncHearts();
  syncCounts();
  store.subscribe(() => {
    syncHearts();
    syncCounts();
  });

  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    if (!target) return;

    const wa = target.closest<HTMLAnchorElement>('a[data-wa]');
    if (wa) onWhatsApp(wa, e);

    const ig = target.closest<HTMLAnchorElement>('a[data-ig]');
    if (ig) onInstagram(ig);

    const heart = target.closest<HTMLButtonElement>('button[data-wish]');
    if (heart) {
      e.preventDefault();
      const on = store.toggleWish(heart.dataset.wish!);
      heart.classList.remove('pop');
      void heart.offsetWidth;
      heart.classList.add('pop');
      toast(on ? 'Saved to your wishlist.' : 'Removed from your wishlist.', on ? { label: 'View', href: href('/wishlist/') } : undefined);
      track(on ? 'wishlist-add' : 'wishlist-remove', heart.dataset.wish);
    }

    const add = target.closest<HTMLButtonElement>('button[data-add-bag]');
    if (add) {
      e.preventDefault();
      const ctx = productContext(add);
      if (!ctx || demandSize(ctx)) return;
      store.addToBag({ id: ctx.id, size: ctx.size, colour: ctx.colour });
      toast(`Added to bag: ${ctx.name}${ctx.size ? `, ${ctx.size}` : ''}.`, { label: 'View bag', href: href('/bag/') });
      track('bag-add', ctx.id);
    }

    const share = target.closest<HTMLElement>('[data-share]');
    if (share) {
      e.preventDefault();
      void shareLink({
        title: share.dataset.shareTitle ?? document.title,
        text: share.dataset.shareText,
        url: absolute(share.dataset.share || location.pathname),
      });
      track('share', share.dataset.id);
    }

    const tracked = target.closest<HTMLElement>('[data-track]');
    if (tracked) track(tracked.dataset.track!, tracked.dataset.id);
  });

  // Choosing a size hides the "choose your size" message.
  document.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input?.name === 'size') {
      const error = input.form?.querySelector<HTMLElement>('[data-size-error]');
      if (error) error.hidden = true;
    }
  });
}
