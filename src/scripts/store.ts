// Bag and wishlist, saved only in this browser. Every read and write is guarded:
// private windows and blocked storage simply start empty.
export interface BagItem {
  id: string;
  size: string | null;
  colour: string | null;
  qty: number;
}

const BAG_KEY = 'dh-bag';
const WISH_KEY = 'dh-wish';
const MAX_QTY = 9;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

let bag: BagItem[] = sanitizeBag(read<BagItem[]>(BAG_KEY, []));
let wish: string[] = read<string[]>(WISH_KEY, []).filter((x) => typeof x === 'string');
const listeners = new Set<() => void>();

function sanitizeBag(items: unknown): BagItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((i): i is BagItem => !!i && typeof (i as BagItem).id === 'string')
    .map((i) => ({ id: i.id, size: i.size ?? null, colour: i.colour ?? null, qty: Math.min(MAX_QTY, Math.max(1, Number(i.qty) || 1)) }));
}

function emit() {
  listeners.forEach((fn) => fn());
}

function saveBag() {
  write(BAG_KEY, bag);
  emit();
}

function saveWish() {
  write(WISH_KEY, wish);
  emit();
}

const same = (a: BagItem, id: string, size: string | null) => a.id === id && (a.size ?? null) === (size ?? null);

export const store = {
  bag: (): BagItem[] => bag.map((i) => ({ ...i })),
  wish: (): string[] => wish.slice(),
  bagCount: () => bag.reduce((n, i) => n + i.qty, 0),

  addToBag(item: { id: string; size?: string | null; colour?: string | null; qty?: number }) {
    const size = item.size ?? null;
    const found = bag.find((b) => same(b, item.id, size));
    if (found) found.qty = Math.min(MAX_QTY, found.qty + (item.qty ?? 1));
    else bag.push({ id: item.id, size, colour: item.colour ?? null, qty: Math.min(MAX_QTY, item.qty ?? 1) });
    saveBag();
  },

  setQty(id: string, size: string | null, qty: number) {
    const found = bag.find((b) => same(b, id, size));
    if (!found) return;
    found.qty = Math.min(MAX_QTY, Math.max(1, qty));
    saveBag();
  },

  remove(id: string, size: string | null) {
    bag = bag.filter((b) => !same(b, id, size));
    saveBag();
  },

  clearBag() {
    bag = [];
    saveBag();
  },

  hasWish: (id: string) => wish.includes(id),

  toggleWish(id: string): boolean {
    const on = !wish.includes(id);
    wish = on ? [...wish, id] : wish.filter((x) => x !== id);
    saveWish();
    return on;
  },

  removeWish(id: string) {
    wish = wish.filter((x) => x !== id);
    saveWish();
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

window.addEventListener('storage', (e) => {
  if (e.key === BAG_KEY) bag = sanitizeBag(read(BAG_KEY, []));
  else if (e.key === WISH_KEY) wish = read<string[]>(WISH_KEY, []);
  else return;
  emit();
});
