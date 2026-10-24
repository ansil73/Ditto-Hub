// Human labels for product types.
const GADGET_TYPES: Record<string, string> = {
  home: 'Home gadget',
  toys: 'Toy',
  smart: 'Smart wearable',
  audio: 'Audio',
  outdoor: 'Outdoor',
  kitchen: 'Kitchen gadget',
  car: 'Car accessory',
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function typeLabel(category: string, type: string): string {
  const t = type.trim().toLowerCase();
  if (category === 'sneakers') return t ? `${cap(t)} sneaker` : 'Sneaker';
  if (category === 'watches') return t ? `${cap(t)} watch` : 'Watch';
  return GADGET_TYPES[t] ?? (t ? cap(t) : 'Gadget');
}
