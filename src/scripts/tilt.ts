// Gentle 3D tilt on [data-tilt] tiles: it follows the mouse on desktop and the phone's
// gyroscope on Android. iPhones only share motion after a permission prompt, which a
// shop page should not spring on visitors, so tiles stay flat there.
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function setTilt(el: HTMLElement, rx: number, ry: number) {
  el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
  el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
}

function mouseTilt(tiles: HTMLElement[]) {
  tiles.forEach((el) => {
    let frame = 0;
    el.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        setTilt(el, -y * 8, x * 10);
      });
    });
    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      setTilt(el, 0, 0);
    });
  });
}

function gyroTilt(tiles: HTMLElement[]) {
  const Orientation = window.DeviceOrientationEvent as unknown as { requestPermission?: unknown } | undefined;
  if (!Orientation || typeof Orientation.requestPermission === 'function' || !('IntersectionObserver' in window)) return;

  const onScreen = new Set<HTMLElement>();
  const io = new IntersectionObserver((entries) =>
    entries.forEach((e) => {
      const el = e.target as HTMLElement;
      if (e.isIntersecting) onScreen.add(el);
      else {
        onScreen.delete(el);
        setTilt(el, 0, 0);
      }
    })
  );
  tiles.forEach((el) => io.observe(el));

  // The resting angle drifts toward however the phone is being held, so tilting is relative.
  let rest: { beta: number; gamma: number } | null = null;
  let tilt = { rx: 0, ry: 0 };
  let frame = 0;
  window.addEventListener('deviceorientation', (e) => {
    if (e.beta == null || e.gamma == null || !onScreen.size) return;
    if (!rest) rest = { beta: e.beta, gamma: e.gamma };
    rest.beta += (e.beta - rest.beta) * 0.02;
    rest.gamma += (e.gamma - rest.gamma) * 0.02;
    tilt = { rx: clamp(-(e.beta - rest.beta) * 0.45, -7, 7), ry: clamp((e.gamma - rest.gamma) * 0.55, -9, 9) };
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        onScreen.forEach((el) => setTilt(el, tilt.rx, tilt.ry));
      });
    }
  });
}

export function initTilt() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tiles = [...document.querySelectorAll<HTMLElement>('[data-tilt]')];
  if (!tiles.length) return;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) mouseTilt(tiles);
  else gyroTilt(tiles);
}
