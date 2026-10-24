// Toasts, copy-to-clipboard and share, with fallbacks for browsers and app views that refuse them.
const region = () => document.querySelector<HTMLElement>('[data-toasts]');

export function toast(message: string, action?: { label: string; href: string }, ms = 3200) {
  const host = region();
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast';
  const text = document.createElement('span');
  text.textContent = message;
  el.append(text);
  if (action) {
    const a = document.createElement('a');
    a.href = action.href;
    a.textContent = action.label;
    el.append(a);
  }
  host.append(el);
  window.setTimeout(() => {
    el.classList.add('is-leaving');
    window.setTimeout(() => el.remove(), 300);
  }, ms);
}

/** Copies text. Call it directly inside a click handler. Resolves true when it worked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the selection fallback */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Opens the phone's share sheet, or copies the link when sharing is not available. */
export async function shareLink(data: { title: string; text?: string; url: string }) {
  try {
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return;
  }
  const ok = await copyText(data.url);
  toast(ok ? 'Link copied. Paste it in WhatsApp or Instagram.' : `Copy this link: ${data.url}`);
}
