// Single-user password gate. Uses Web Crypto so it works in both Edge
// (middleware) and Node (route handlers) runtimes — no `node:crypto` import.

export const COOKIE_NAME = 'vira_auth';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Constant-time string comparison (avoids timing leaks).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function expectedAuthToken(): Promise<string> {
  const password = process.env.APP_PASSWORD ?? '';
  const secret = process.env.APP_SESSION_SECRET ?? '';
  return hmacSha256Hex(secret, password);
}

export async function isValidAuthCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const expected = await expectedAuthToken();
  return safeEqual(value, expected);
}

export function verifyPassword(input: string): boolean {
  const password = process.env.APP_PASSWORD ?? '';
  if (!password) return false;
  return safeEqual(input, password);
}
