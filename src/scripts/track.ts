// Optional visit and tap counting with GoatCounter (free, no cookies). Off unless switched on in Settings.
import { config } from './config';

interface GoatCounter {
  count?: (vars: { path: string; title?: string; event?: boolean }) => void;
}

export function loadAnalytics() {
  if (!config.analytics || config.preview || !config.goatcounter) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${config.goatcounter}.goatcounter.com/count`;
  document.head.append(s);
}

/** Records a tap, e.g. track('whatsapp-order', 'DH-SN-0001'). */
export function track(event: string, detail?: string) {
  if (!config.analytics) return;
  const gc = (window as unknown as { goatcounter?: GoatCounter }).goatcounter;
  gc?.count?.({ path: `tap/${event}${detail ? `/${detail}` : ''}`, title: event, event: true });
}
