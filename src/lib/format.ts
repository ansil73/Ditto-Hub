const inrFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** ₹1,299 — Indian digit grouping. */
export function inr(amount: number): string {
  return `₹${inrFormat.format(Math.round(amount))}`;
}

/** "24 Oct" from 2026-10-24. */
export function shortDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
}

/** "24.10.2026" from 2026-10-24 — the engraving on the podium. */
export function dotDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}
