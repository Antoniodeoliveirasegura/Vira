import { summarizeLink } from './claude';

// Best-effort link enrichment: fetch the page and return a one-line Claude summary so a naked
// URL becomes a real read-later item. Returns null on ANY failure — the link is still captured,
// just without a summary. This is a trust boundary (the server fetches an arbitrary URL), so it
// carries SSRF hygiene: http(s) only, blocked private/loopback hosts, timeout, and a size cap.

// ponytail: blocks literal private/loopback hosts only; it does not resolve DNS, so a hostname
// that resolves to a private IP isn't caught. Acceptable here — only the authenticated owner
// triggers a capture. Add DNS-pinning if Vira ever becomes multi-user.
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '::1' || h.startsWith('fe80') || h.startsWith('fc') || h.startsWith('fd')) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata 169.254.169.254)
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

function extractText(html: string): string {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${title}\n\n${body}`.trim().slice(0, 4000);
}

export async function enrichLink(url: string): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if ((u.protocol !== 'http:' && u.protocol !== 'https:') || isBlockedHost(u.hostname)) return null;

  let html: string;
  try {
    const res = await fetch(u, {
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
      headers: { 'user-agent': 'ViraBot/1.0 (+link enrichment)' },
    });
    if (!res.ok) return null;
    // Re-check after redirects so a link can't bounce us to an internal host, and require HTML.
    try {
      if (isBlockedHost(new URL(res.url).hostname)) return null;
    } catch {
      return null;
    }
    if (!(res.headers.get('content-type') || '').includes('text/html')) return null;
    html = (await res.text()).slice(0, 100_000);
  } catch (e) {
    console.error('enrichLink fetch failed:', url, e instanceof Error ? e.message : e);
    return null;
  }

  const text = extractText(html);
  if (!text) return null;

  const summary = await summarizeLink(url, text);
  return summary || null;
}
