import type { Combo, Offer } from '../lib/pricing';

export interface SiteConfig {
  whatsapp: string;
  phone: string;
  instagram: string;
  group: string;
  announcement: string;
  analytics: boolean;
  goatcounter: string;
  preview: boolean;
  arrivals: string[];
}

function readJSON<T>(id: string, fallback: T): T {
  const el = document.getElementById(id);
  if (!el?.textContent) return fallback;
  try {
    return JSON.parse(el.textContent) as T;
  } catch {
    return fallback;
  }
}

export const config = readJSON<SiteConfig>('dh-config', {
  whatsapp: '919995706323',
  phone: '+918078102296',
  instagram: '_ditto.hub._',
  group: '',
  announcement: '',
  analytics: false,
  goatcounter: '',
  preview: false,
  arrivals: [],
});

export const offerData = readJSON<{ builtAt: number; offers: Offer[]; combos: Combo[] }>('dh-offers', {
  builtAt: Date.now(),
  offers: [],
  combos: [],
});
