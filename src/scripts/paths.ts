// Links built in the browser go through these helpers, so the same code works on the
// live site ("/shop/") and in the shareable preview copy ("../shop/index.html").
const html = document.documentElement;
const ROOT = html.dataset.root ?? '/'; // "" on the preview's entry page, so keep empty strings
const INDEX = html.dataset.index || '';
// In the preview copy a query string becomes a # fragment, since its host may own the query string.
const PREVIEW = html.hasAttribute('data-preview');

export function href(path: string): string {
  if (/^(https?:|mailto:|tel:|#|data:|blob:)/.test(path)) return path;
  const [beforeHash, hash] = path.split('#');
  const [pathname, query] = beforeHash.split('?');
  let clean = pathname.replace(/^\//, '');
  if (clean === '' || clean.endsWith('/')) clean += INDEX;
  if (PREVIEW && query && !hash) return `${ROOT}${clean}#${query}`;
  return `${ROOT}${clean}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

export function asset(path: string): string {
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return `${ROOT}${path.replace(/^\//, '')}`;
}

export function absolute(path: string): string {
  return new URL(href(path), location.href).href;
}
