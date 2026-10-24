// Runs on every page.
import { initActions } from './actions';
import { initHeader } from './header';
import { startLive } from './live';
import { loadAnalytics } from './track';
import { config } from './config';
import { asset } from './paths';

function initIntro() {
  const intro = document.querySelector<HTMLElement>('[data-intro]');
  if (!intro) return;
  const done = () => {
    intro.classList.add('is-done');
    try {
      sessionStorage.setItem('dh-intro', '1');
    } catch {
      /* ignore */
    }
    window.setTimeout(() => intro.remove(), 600);
  };
  if (document.documentElement.classList.contains('intro-seen')) {
    intro.remove();
    return;
  }
  intro.addEventListener('click', done);
  window.setTimeout(done, 1450);
}

// On touch screens there is no hover, so products bloom into colour
// as they pass through the middle of the screen.
function initReveal() {
  if (!matchMedia('(hover: none)').matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('is-lit', e.isIntersecting)),
    { rootMargin: '-34% 0px -34% 0px' }
  );
  const watch = (root: ParentNode) => root.querySelectorAll('.card, [data-reveal]').forEach((el) => io.observe(el));
  watch(document);
  document.addEventListener('dh:cards', () => watch(document));
}

function registerOfflinePage() {
  if (config.preview || !('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(asset('/sw.js')).catch(() => undefined);
  });
}

initIntro();
initHeader();
initActions();
startLive();
initReveal();
loadAnalytics();
registerOfflinePage();
