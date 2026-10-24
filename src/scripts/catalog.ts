// The product list for search, the bag and the wishlist (built at /data/catalog.json).
import { asset } from './paths';

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  type: string;
  price: number;
  mrp: number | null;
  stock: number;
  sizes: { size: string; stock: number }[];
  colours: string[];
  image: string;
  arrivalDate: string;
  url: string;
}

let cache: Promise<CatalogProduct[]> | null = null;

export function loadCatalog(): Promise<CatalogProduct[]> {
  cache ??= fetch(asset('/data/catalog.json'))
    .then((r) => (r.ok ? r.json() : { products: [] }))
    .then((d: { products?: CatalogProduct[] }) => d.products ?? [])
    .catch(() => []);
  return cache;
}
