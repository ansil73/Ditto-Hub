// Keeps prices, offer countdowns and NEW/TODAY badges correct in the browser,
// so an offer that ends at midnight disappears without waiting for a new build.
import { arrivalBadge, countdown, istDate, priceView } from '../lib/pricing';
import { inr } from '../lib/format';
import { config, offerData } from './config';

function setText(el: Element | null, text: string) {
  if (el && el.textContent !== text) el.textContent = text;
}

function setHidden(el: Element | null, hidden: boolean) {
  if (el instanceof HTMLElement && el.hidden !== hidden) el.hidden = hidden;
}

function updatePriceHolder(holder: HTMLElement, now: number) {
  const id = holder.dataset.id;
  if (!id) return;
  const base = Number(holder.dataset.price);
  const mrp = holder.dataset.mrp ? Number(holder.dataset.mrp) : null;
  const v = priceView({ id, price: base, mrp }, offerData.offers, now);
  holder.dataset.livePrice = String(v.price);
  holder.dataset.onOffer = v.offer ? '1' : '0';
  holder.querySelectorAll('.js-price').forEach((el) => setText(el, inr(v.price)));
  holder.querySelectorAll('.js-mrp').forEach((el) => setHidden(el, !v.mrp));
  holder.querySelectorAll('.js-mrp-val').forEach((el) => setText(el, v.mrp ? inr(v.mrp) : ''));
  holder.querySelectorAll('.js-off').forEach((el) => {
    setHidden(el, !v.discount);
    setText(el, el.classList.contains('badge') ? `−${v.discount}%` : `${v.discount}% off`);
  });
  holder.querySelectorAll<HTMLElement>('.js-offer').forEach((box) => {
    setHidden(box, !v.offer);
    if (v.offer) {
      setText(box.querySelector('.js-offer-label'), v.offer.label || 'Offer');
      const left = box.querySelector<HTMLElement>('[data-countdown]');
      if (left) {
        if (v.offer.endsAt) left.dataset.ends = v.offer.endsAt;
        setHidden(left.closest('.js-offer-ends'), !v.offer.endsAt);
      }
    }
  });
  const arrival = holder.dataset.arrival;
  if (arrival) {
    const badge = arrivalBadge(arrival, now);
    holder.querySelectorAll<HTMLElement>('.js-arrival').forEach((el) => setHidden(el, el.dataset.kind !== badge));
  }
}

function isLive(starts: string | undefined, ends: string | undefined, now: number) {
  return (!starts || Date.parse(starts) <= now) && (!ends || Date.parse(ends) > now);
}

/** Recomputes every price on the page. Cheap; runs on load and every 30 seconds. */
export function refreshPrices(root: ParentNode = document) {
  const now = Date.now();
  root.querySelectorAll<HTMLElement>('[data-card], [data-price-block]').forEach((el) => updatePriceHolder(el, now));
  root.querySelectorAll<HTMLElement>('[data-offer-card], [data-combo-card]').forEach((card) => {
    setHidden(card, !isLive(card.dataset.starts, card.dataset.ends, now));
  });
  root.querySelectorAll<HTMLElement>('[data-hide-when-empty]').forEach((section) => {
    const anyVisible = !!section.querySelector('[data-offer-card]:not([hidden]), [data-combo-card]:not([hidden])');
    setHidden(section, !anyVisible);
  });
  updateArrivalTexts(now);
}

function updateArrivalTexts(now: number) {
  const today = istDate(now);
  const count = config.arrivals.filter((d) => d === today).length;
  document.querySelectorAll<HTMLElement>('[data-announce]').forEach((el) => {
    const base = el.dataset.base || config.announcement;
    setText(el, count > 0 ? `${base} · ${count} new ${count === 1 ? 'arrival' : 'arrivals'}` : base);
  });
  document.querySelectorAll<HTMLElement>('[data-arrivals-title]').forEach((el) => {
    setText(el, (count > 0 ? el.dataset.today : el.dataset.latest) ?? el.textContent ?? '');
  });
  document.querySelectorAll<HTMLElement>('[data-arrivals-chip]').forEach((el) => {
    setText(el, count > 0 ? `Updated today · ${count} new ${count === 1 ? 'arrival' : 'arrivals'}` : 'New arrivals every day');
  });
}

function tick() {
  const now = Date.now();
  let expired = false;
  document.querySelectorAll<HTMLElement>('[data-countdown]').forEach((el) => {
    const ends = el.dataset.ends;
    if (!ends) return;
    if (Date.parse(ends) <= now) expired = true;
    setText(el, countdown(ends, now));
  });
  if (expired) refreshPrices();
}

export function startLive() {
  refreshPrices();
  tick();
  window.setInterval(tick, 1000);
  window.setInterval(() => refreshPrices(), 30_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshPrices();
      tick();
    }
  });
}
