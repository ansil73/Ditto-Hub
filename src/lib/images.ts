// Product, Instagram and review photos get 480 px and 960 px copies at build time
// (scripts/images.mjs). These helpers point pages at the right copy.
const RESIZED = ['/products/', '/insta/', '/reviews/'];

export function thumb(src: string, width: 480 | 960): string {
  if (!RESIZED.some((root) => src.startsWith(root))) return src;
  return `/_gen${src.replace(/\.(jpe?g|png|webp|avif)$/i, '')}-${width}.webp`;
}

export function srcset(src: string): string | undefined {
  if (!RESIZED.some((root) => src.startsWith(root))) return undefined;
  return `${thumb(src, 480)} 480w, ${thumb(src, 960)} 960w`;
}
