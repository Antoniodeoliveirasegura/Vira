import { Item } from './supabase';

// Tasks and reminders can carry a due date/time in metadata.due_date — an ISO 8601
// string that is either a date ("2026-07-20") or a datetime ("2026-07-20T18:00").
// Everything time-based in Vira keys off that single field.

export type DueBucket = 'overdue' | 'today' | 'upcoming';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Only open tasks/reminders are "live" — done/archived items never surface or fire.
function isLive(item: Item): boolean {
  return (item.type === 'task' || item.type === 'reminder') && item.status === 'open';
}

/** The due instant, used for sorting and notifications. Date-only values anchor to local start-of-day. */
export function dueAt(item: Item): Date | null {
  const raw = item.metadata?.due_date;
  if (!raw) return null;
  if (DATE_ONLY.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(y, m - 1, d); // local midnight
  }
  const dt = new Date(raw);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Bucket an item relative to `now`. Date-only values are judged by local calendar day
 * (so a bare today-date reads as `today`, not `overdue`); datetimes are judged by the
 * exact instant. Returns null for items with no usable due date.
 */
export function bucketFor(item: Item, now: Date): DueBucket | null {
  if (!isLive(item)) return null;
  const raw = item.metadata?.due_date;
  if (!raw) return null;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (DATE_ONLY.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    const day = new Date(y, m - 1, d);
    if (day < startOfToday) return 'overdue';
    if (day <= endOfToday) return 'today';
    return 'upcoming';
  }

  const dt = new Date(raw);
  if (isNaN(dt.getTime())) return null;
  if (dt < now) return 'overdue';
  if (dt <= endOfToday) return 'today';
  return 'upcoming';
}

/** Open tasks/reminders that need attention now (overdue + due today), soonest first. */
export function dueNow(items: Item[], now: Date): Item[] {
  return items
    .filter((i) => {
      const b = bucketFor(i, now);
      return b === 'overdue' || b === 'today';
    })
    .sort((a, b) => dueAt(a)!.getTime() - dueAt(b)!.getTime());
}

/**
 * "Ripe" = the due moment has actually arrived, so a notification should fire now.
 * Overdue items are ripe; a date-only item due today is ripe (it has no specific time);
 * a datetime due today is ripe only once its time has passed — so a 6pm reminder does not
 * notify at 2pm.
 */
export function isRipe(item: Item, now: Date): boolean {
  const b = bucketFor(item, now);
  if (b === 'overdue') return true;
  if (b !== 'today') return false;
  const raw = item.metadata.due_date!;
  if (DATE_ONLY.test(raw)) return true;
  const due = dueAt(item);
  return !!due && due <= now;
}

/** Short human label for a due date, e.g. "2h overdue", "3:00 PM · in 40m", "today", "Jul 20". */
export function dueLabel(item: Item, now: Date): string {
  const due = dueAt(item);
  if (!due) return '';
  const raw = item.metadata.due_date;
  const bucket = bucketFor(item, now);

  // Date-only values have no meaningful hour — describe by day.
  if (DATE_ONLY.test(raw ?? '')) {
    if (bucket === 'today') return 'today';
    const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return bucket === 'overdue' ? `overdue · ${label}` : label;
  }

  const diffMin = Math.round((due.getTime() - now.getTime()) / 60000);
  const abs = Math.abs(diffMin);
  const span = abs < 60 ? `${abs}m` : abs < 1440 ? `${Math.round(abs / 60)}h` : `${Math.round(abs / 1440)}d`;
  const time = due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return diffMin < 0 ? `${span} overdue` : `${time} · in ${span}`;
}
