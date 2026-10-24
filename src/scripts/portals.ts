// Category portals: play a short muted turntable clip while the portal is hovered (desktop)
// or in the middle of the screen (phones). Clips stay paused when the tab is hidden,
// on Save-Data, and for visitors who prefer reduced motion.
type Nav = Navigator & { connection?: { saveData?: boolean } };

export function initPortalVideos() {
  const portals = [...document.querySelectorAll<HTMLElement>('[data-portal]')].filter((p) =>
    p.querySelector('video[data-portal-video]')
  );
  if (!portals.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if ((navigator as Nav).connection?.saveData) return;

  const play = (portal: HTMLElement) => {
    const video = portal.querySelector<HTMLVideoElement>('video[data-portal-video]')!;
    if (document.hidden) return;
    video.play().then(
      () => portal.classList.add('is-playing'),
      () => portal.classList.remove('is-playing')
    );
  };
  const pause = (portal: HTMLElement) => {
    portal.querySelector<HTMLVideoElement>('video[data-portal-video]')?.pause();
    portal.classList.remove('is-playing');
  };

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    portals.forEach((portal) => {
      portal.addEventListener('pointerenter', () => play(portal));
      portal.addEventListener('pointerleave', () => pause(portal));
      portal.addEventListener('focusin', () => play(portal));
      portal.addEventListener('focusout', () => pause(portal));
    });
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? play(e.target as HTMLElement) : pause(e.target as HTMLElement))),
      { rootMargin: '-30% 0px -30% 0px' }
    );
    portals.forEach((portal) => io.observe(portal));
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) portals.forEach(pause);
  });
}
