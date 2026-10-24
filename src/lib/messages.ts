// WhatsApp / Instagram message templates. Shared by the build and the browser.
import { inr } from './format';

export interface MsgItem {
  id: string;
  name: string;
  price: number;
  qty?: number;
  size?: string | null;
  colour?: string | null;
  url?: string | null;
}

const GREETING = 'Hi DITTO HUB!';
const ASK_DETAILS = '\nMy name:\nDelivery pincode:';

export function waUrl(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** "80781 02296" from "+918078102296". */
export function prettyPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function productOrderText(item: MsgItem): string {
  const variant = [item.size ? `Size: ${item.size}` : '', item.colour ? `Colour: ${item.colour}` : '']
    .filter(Boolean)
    .join(' | ');
  return [
    `${GREETING} I'd like to order:`,
    `${item.name} (ID: ${item.id})`,
    `Price: ${inr(item.price)}`,
    variant,
    item.url ?? '',
    ASK_DETAILS,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export function bagOrderText(items: MsgItem[]): string {
  const lines = items.map((it) => {
    const qty = it.qty ?? 1;
    const size = it.size ? `, size ${it.size}` : '';
    return `${qty} × ${it.name} (${it.id})${size} — ${inr(it.price * qty)}`;
  });
  const total = items.reduce((sum, it) => sum + it.price * (it.qty ?? 1), 0);
  return [`${GREETING} I'd like to order:`, ...lines, `Total: ${inr(total)}`, ASK_DETAILS].join('\n');
}

export function wishlistText(items: MsgItem[]): string {
  return [
    `${GREETING} These are on my wishlist:`,
    ...items.map((it) => `- ${it.name} (${it.id}) — ${inr(it.price)}`),
    'Can you share availability?',
  ].join('\n');
}

export function restockText(item: MsgItem): string {
  return [`${GREETING} Please tell me when this is back in stock:`, `${item.name} (ID: ${item.id})`, item.url ?? '']
    .filter(Boolean)
    .join('\n');
}

export function comboText(combo: { id: string; title: string; price: number; includes: string[] }): string {
  return [
    `${GREETING} I'd like the combo deal:`,
    `${combo.title} (ID: ${combo.id}) — ${inr(combo.price)}`,
    `Includes: ${combo.includes.join(', ')}`,
    ASK_DETAILS,
  ].join('\n');
}

export function enquiryText(q: {
  name: string;
  phone: string;
  message: string;
  product?: string | null;
  url?: string | null;
}): string {
  return [
    `${GREETING} I have a question:`,
    q.message.trim(),
    q.product ? `Product: ${q.product}` : '',
    q.url ?? '',
    '',
    `My name: ${q.name.trim()}`,
    `My number: ${q.phone.trim()}`,
  ]
    .filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== ''))
    .join('\n');
}
