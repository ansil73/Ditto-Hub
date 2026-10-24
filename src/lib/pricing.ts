// Price, offer, stock and badge rules. Pure functions shared by the build and the browser,
// so a price shown on the page is always worked out the same way.

export const IST = 'Asia/Kolkata';

export interface Offer {
  productId: string;
  offerPrice: number;
  label?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface Combo {
  id: string;
  title: string;
  productIds: string[];
  comboPrice: number;
  endsAt?: string | null;
}

export interface PriceSource {
  id: string;
  price: number;
  mrp?: number | null;
}

/** Today's date in India as YYYY-MM-DD. */
export function istDate(at: number | Date = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(typeof at === 'number' ? new Date(at) : at);
}

/** Whole days from date `a` to date `b` (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function isLive(startsAt: string | null | undefined, endsAt: string | null | undefined, now: number) {
  const start = startsAt ? Date.parse(startsAt) : Number.NEGATIVE_INFINITY;
  const end = endsAt ? Date.parse(endsAt) : Number.POSITIVE_INFINITY;
  return now >= start && now < end;
}

/** The running offer for a product (the lowest price if several overlap), or null. */
export function activeOffer(productId: string, offers: Offer[], now: number = Date.now()): Offer | null {
  let best: Offer | null = null;
  for (const offer of offers) {
    if (offer.productId !== productId || !isLive(offer.startsAt, offer.endsAt, now)) continue;
    if (!best || offer.offerPrice < best.offerPrice) best = offer;
  }
  return best;
}

export interface PriceView {
  price: number;
  mrp: number | null;
  discount: number;
  offer: Offer | null;
}

/** The price to show right now: the offer price while an offer runs, otherwise the regular price. */
export function priceView(p: PriceSource, offers: Offer[], now: number = Date.now()): PriceView {
  const offer = activeOffer(p.id, offers, now);
  const price = offer && offer.offerPrice < p.price ? offer.offerPrice : p.price;
  const mrp = p.mrp && p.mrp > price ? p.mrp : null;
  return { price, mrp, discount: discountPct(mrp, price), offer: offer && offer.offerPrice < p.price ? offer : null };
}

export function discountPct(mrp: number | null | undefined, price: number): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export const TIERS = [
  { id: 'under-499', label: 'Under ₹499', min: 0, max: 499 },
  { id: 'under-999', label: 'Under ₹999', min: 500, max: 999 },
  { id: 'under-1999', label: 'Under ₹1,999', min: 1000, max: 1999 },
  { id: 'premium', label: 'Premium ₹2,000+', min: 2000, max: Number.POSITIVE_INFINITY },
] as const;

export type TierId = (typeof TIERS)[number]['id'];

export function tierOf(price: number): TierId {
  for (const tier of TIERS) if (price <= tier.max) return tier.id;
  return 'premium';
}

export type StockKey = 'sold' | 'few' | 'in';

export function stockState(stock: number): { key: StockKey; label: string } {
  if (stock <= 0) return { key: 'sold', label: 'Sold out' };
  if (stock <= 5) return { key: 'few', label: `Only ${stock} left` };
  return { key: 'in', label: 'In stock' };
}

/** TODAY when it arrived today (IST); NEW when within the last 3 days. */
export function arrivalBadge(arrivalDate: string, now: number = Date.now()): 'today' | 'new' | null {
  const diff = daysBetween(arrivalDate, istDate(now));
  if (diff === 0) return 'today';
  if (diff > 0 && diff <= 3) return 'new';
  return null;
}

export function comboLive(combo: Combo, now: number = Date.now()): boolean {
  return isLive(null, combo.endsAt, now);
}

/** Time left until `endsAt`, formatted like "2d 04:11:09" or "04:11:09". */
export function countdown(endsAt: string, now: number = Date.now()): string {
  let s = Math.max(0, Math.floor((Date.parse(endsAt) - now) / 1000));
  const d = Math.floor(s / 86_400);
  s -= d * 86_400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d > 0 ? `${d}d ` : ''}${pad(h)}:${pad(m)}:${pad(s)}`;
}
