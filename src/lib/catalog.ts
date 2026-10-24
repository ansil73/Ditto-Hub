// Loads and checks every content file at build time. A mistake made in /admin
// (a missing price, a wrong category) stops the build with a clear message
// instead of breaking the live site.
import { z } from 'zod';
import settingsRaw from '../content/settings.json';
import offersRaw from '../content/offers.json';
import reviewsRaw from '../content/reviews.json';
import { istDate, priceView, stockState, tierOf, type Combo, type Offer } from './pricing';

const blankToNull = (v: unknown) => (v === '' || v === undefined ? null : v);
const optionalText = z.preprocess(blankToNull, z.string().nullable()).default(null);

const SizeSchema = z.object({
  size: z.string().min(1, 'Every size needs a label, like UK 8'),
  stock: z.coerce.number().int().min(0),
});

const ProductSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only, like DH-SN-0001'),
  name: z.string().min(1, 'Add a product name'),
  category: z.enum(['sneakers', 'watches', 'gadgets']),
  type: z.string().default(''),
  price: z.coerce.number().positive('Price must be more than 0'),
  mrp: z.preprocess(blankToNull, z.coerce.number().positive().nullable()).default(null),
  stock: z.coerce.number().int().min(0).default(0),
  sizes: z.array(SizeSchema).default([]),
  colours: z.array(z.string()).default([]),
  images: z.array(z.string()).min(1, 'Add at least one photo'),
  cutout: optionalText,
  model: optionalText,
  spinFrames: z.coerce.number().int().min(0).default(0),
  video: optionalText,
  highlights: z.array(z.string()).default([]),
  inBox: z.string().default(''),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  arrivalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Arrival date must look like 2026-10-24')
    .transform((s) => s.slice(0, 10)),
  status: z.enum(['active', 'hidden', 'archived']).default('active'),
  sample: z.boolean().default(false),
});

const SettingsSchema = z.object({
  shopName: z.string(),
  tagline: z.string(),
  whatsapp: z.string().regex(/^\d{10,15}$/, 'WhatsApp number: country code + number, digits only (919995706323)'),
  phone: z.string(),
  instagram: z.string(),
  whatsappGroup: z.string().default(''),
  announcement: z.string().default(''),
  deliveryText: z.string().default('All-India delivery'),
  cod: z.boolean().default(false),
  featured: z.object({ sneaker: z.string(), watch: z.string(), gadget: z.string() }),
  instaImages: z.array(z.string()).default([]),
  business: z
    .object({
      legalName: z.string().default(''),
      address: z.string().default(''),
      email: z.string().default(''),
      grievanceContact: z.string().default(''),
    })
    .default({ legalName: '', address: '', email: '', grievanceContact: '' }),
  analytics: z.boolean().default(false),
  goatcounterCode: z.string().default(''),
});

const OfferSchema = z.object({
  productId: z.string(),
  offerPrice: z.coerce.number().positive(),
  label: z.string().nullable().optional(),
  startsAt: optionalText,
  endsAt: optionalText,
});

const ComboSchema = z.object({
  id: z.string(),
  title: z.string(),
  productIds: z.array(z.string()).min(2, 'A combo needs at least two products'),
  comboPrice: z.coerce.number().positive(),
  endsAt: optionalText,
});

const OffersSchema = z.object({
  offers: z.array(OfferSchema).default([]),
  combos: z.array(ComboSchema).default([]),
});

const ReviewsSchema = z.object({
  items: z
    .array(z.object({ image: z.string(), caption: z.string().default(''), date: z.string().default('') }))
    .default([]),
});

function parse<T extends z.ZodType>(schema: T, data: unknown, file: string): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.path.join('.') || '(file)'}: ${i.message}`).join('\n');
    throw new Error(`Content problem in ${file}:\n${problems}`);
  }
  return result.data;
}

export type RawProduct = z.infer<typeof ProductSchema>;

export interface Product extends RawProduct {
  url: string;
  stockTotal: number;
  categoryLabel: string;
}

export const CATEGORIES = [
  { id: 'sneakers', label: 'Sneakers', blurb: 'Runners, court shoes and everyday pairs.' },
  { id: 'watches', label: 'Watches', blurb: 'Analog, digital and sport watches.' },
  { id: 'gadgets', label: 'Gadgets', blurb: 'Handy new tech at budget prices.' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export const settings = parse(SettingsSchema, settingsRaw, 'src/content/settings.json');
const offersFile = parse(OffersSchema, offersRaw, 'src/content/offers.json');
export const offers: Offer[] = offersFile.offers;
export const combos: Combo[] = offersFile.combos;
export const reviews = parse(ReviewsSchema, reviewsRaw, 'src/content/reviews.json').items;

const files = import.meta.glob<unknown>('../content/products/*.json', { eager: true, import: 'default' });

export const allProducts: Product[] = Object.entries(files)
  .map(([path, data]) => {
    const p = parse(ProductSchema, data, path.replace('../', 'src/'));
    const stockTotal = p.sizes.length ? p.sizes.reduce((sum, s) => sum + s.stock, 0) : p.stock;
    const categoryLabel = CATEGORIES.find((c) => c.id === p.category)?.label ?? p.category;
    return { ...p, stockTotal, categoryLabel, url: `/p/${p.id}/` };
  })
  .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate) || a.name.localeCompare(b.name));

{
  const seen = new Set<string>();
  for (const p of allProducts) {
    if (seen.has(p.id)) throw new Error(`Two products use the ID ${p.id}. Every product needs its own ID.`);
    seen.add(p.id);
  }
}

/** Products shown in the shop. */
export const products = allProducts.filter((p) => p.status === 'active');
const byId = new Map(allProducts.map((p) => [p.id, p]));

export function getProduct(id: string): Product | undefined {
  return byId.get(id);
}

/** Moment of this build; pages render prices for it and the browser refreshes them on load. */
export const BUILD_NOW = Date.now();

export function view(p: Product, now = BUILD_NOW) {
  const pv = priceView(p, offers, now);
  return { ...pv, tier: tierOf(pv.price), stock: stockState(p.stockTotal) };
}

export function featured(kind: keyof typeof settings.featured): Product | undefined {
  const p = getProduct(settings.featured[kind]);
  if (p && p.status === 'active') return p;
  const cat = kind === 'sneaker' ? 'sneakers' : kind === 'watch' ? 'watches' : 'gadgets';
  return products.find((x) => x.category === cat);
}

export function todaysArrivals(now = BUILD_NOW): { list: Product[]; isToday: boolean } {
  const today = istDate(now);
  const list = products.filter((p) => p.arrivalDate === today);
  return list.length ? { list, isToday: true } : { list: products.slice(0, 8), isToday: false };
}

export function liveCombos(now = BUILD_NOW) {
  return combos
    .filter((c) => !c.endsAt || Date.parse(c.endsAt) > now)
    .map((c) => {
      const items = c.productIds.map((id) => getProduct(id)).filter((p): p is Product => !!p && p.status === 'active');
      const regular = items.reduce((sum, p) => sum + view(p, now).price, 0);
      return { ...c, items, regular, saving: Math.max(0, regular - c.comboPrice) };
    })
    .filter((c) => c.items.length >= 2);
}

export function minPrice(category: CategoryId, now = BUILD_NOW): number | null {
  const prices = products.filter((p) => p.category === category).map((p) => view(p, now).price);
  return prices.length ? Math.min(...prices) : null;
}

/** Data the browser needs to refresh prices, badges and the bag without another request. */
export function clientCatalog() {
  return {
    builtAt: BUILD_NOW,
    offers,
    combos,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      type: p.type,
      price: p.price,
      mrp: p.mrp,
      stock: p.stockTotal,
      sizes: p.sizes,
      colours: p.colours,
      image: p.images[0],
      arrivalDate: p.arrivalDate,
      url: p.url,
    })),
  };
}
