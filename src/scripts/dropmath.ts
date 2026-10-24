// Timing of the Drop Room, shared by the 3D scene and the photo version.
// Progress p runs 0 → 1 across the pinned section:
//   0.00–0.20  hero copy
//   0.00–0.50  product 1 (sneaker) on the podium
//   0.50–0.75  product 2 (watch)
//   0.75–1.00  product 3 (gadget)

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** How present each of the three products is (0–1) at progress p. */
export function productWeights(p: number): [number, number, number] {
  const a = smoothstep(0.46, 0.54, p);
  const b = smoothstep(0.71, 0.79, p);
  return [1 - a, a * (1 - b), b];
}

const PANEL_WINDOWS: [number, number, number, number][] = [
  [0.2, 0.28, 0.42, 0.49],
  [0.53, 0.59, 0.68, 0.74],
  [0.78, 0.84, 2, 3],
];

/** Opacity of the text panel for product i. */
export function panelOpacity(i: number, p: number): number {
  const w = PANEL_WINDOWS[i];
  if (!w) return 0;
  return smoothstep(w[0], w[1], p) * (1 - smoothstep(w[2], w[3], p));
}

/** A short pulse around `center`. */
export function bump(p: number, center: number, width: number): number {
  return Math.max(0, 1 - Math.abs(p - center) / width);
}
