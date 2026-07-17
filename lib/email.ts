// Email delivery via Resend's REST API — no SDK, just fetch (one less dependency).
// The one job: a daily digest so reminders + resurfacing reach the user when the app
// is closed. Everything degrades gracefully — a missing key logs and returns false,
// never throws, so the cron route always responds.
import { Item } from './supabase';
import { dueLabel } from './reminders';

const RESEND_URL = 'https://api.resend.com/emails';

function daysAgo(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}

export function digestSubject(due: Item[], resurface: Item[]): string {
  const parts: string[] = [];
  if (due.length) parts.push(`${due.length} due`);
  if (resurface.length) parts.push(`${resurface.length} to review`);
  return `Vira · ${parts.join(' · ') || 'nothing pressing'}`;
}

/** Pure — builds the digest HTML. Exported so it can be previewed without sending. */
export function renderDigest(due: Item[], resurface: Item[], now: Date, appUrl?: string): string {
  const row = (title: string, meta: string, metaColor: string) => `
    <tr><td style="padding:10px 0;border-bottom:1px solid #eee;">
      <div style="font-size:15px;color:#18181b;">${esc(title)}</div>
      <div style="font-size:12px;color:${metaColor};margin-top:2px;">${esc(meta)}</div>
    </td></tr>`;

  const section = (heading: string, rows: string) =>
    rows
      ? `<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#71717a;margin:24px 0 4px;">${heading}</h2>
         <table style="width:100%;border-collapse:collapse;">${rows}</table>`
      : '';

  const dueRows = due.map((i) => row(i.title, dueLabel(i, now), '#e11d48')).join('');
  const surfaceRows = resurface
    .map((i) => row(i.title, `${i.type} · captured ${daysAgo(i.created_at, now)}d ago`, '#a1a1aa'))
    .join('');

  const footer = appUrl ? `<a href="${esc(appUrl)}" style="color:#7c3aed;font-size:13px;">Open Vira →</a>` : '';

  return `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:8px;">
    <div style="font-size:20px;font-weight:600;color:#18181b;">Your Vira digest</div>
    ${section('Due now', dueRows)}
    ${section('Still relevant?', surfaceRows)}
    <div style="margin-top:24px;">${footer}</div>
  </div>`;
}

/** Send the digest via Resend. Returns false (and logs) if unconfigured or on failure. */
export async function sendDigest(due: Item[], resurface: Item[], now: Date): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.DIGEST_TO_EMAIL;
  const from = process.env.DIGEST_FROM_EMAIL || 'Vira <onboarding@resend.dev>';
  if (!key || !to) {
    console.error('sendDigest: RESEND_API_KEY or DIGEST_TO_EMAIL not set');
    return false;
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from,
        to,
        subject: digestSubject(due, resurface),
        html: renderDigest(due, resurface, now, process.env.APP_URL),
      }),
    });
    if (!res.ok) {
      console.error('Resend send failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('Resend send error:', e);
    return false;
  }
}
