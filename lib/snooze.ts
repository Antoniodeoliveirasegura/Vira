import { Item } from './supabase';

// Snooze hides an item until a chosen moment, then it returns on its own. Stored as an ISO
// instant in metadata.snoozed_until (a UTC timestamp — snooze is a moment, not a calendar day,
// unlike due_date). A past/absent value means "not snoozed". Filtering lives in the shared
// selection functions (dueNow, resurfaceCandidates) so a snoozed item hides everywhere at once.

export function isSnoozed(item: Item, now: Date): boolean {
  const until = item.metadata?.snoozed_until;
  return !!until && new Date(until).getTime() > now.getTime();
}

/** Human label for a snooze, e.g. "until 3:00 PM" (today) or "until Jul 24". */
export function snoozeLabel(item: Item, now: Date): string {
  const until = item.metadata?.snoozed_until;
  if (!until) return '';
  const d = new Date(until);
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? `until ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : `until ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

/** Quick snooze presets relative to now, each an ISO instant to store in snoozed_until. */
export function snoozeOptions(now: Date): { label: string; until: string }[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const evening = new Date(y, m, d, 18, 0, 0, 0);
  if (evening.getTime() <= now.getTime()) evening.setDate(evening.getDate() + 1); // already past 6pm → next evening

  const opts: { label: string; until: Date }[] = [
    { label: '1 hour', until: new Date(now.getTime() + 60 * 60 * 1000) },
    { label: 'This evening', until: evening },
    { label: 'Tomorrow', until: new Date(y, m, d + 1, 9, 0, 0, 0) },
    { label: 'Next week', until: new Date(y, m, d + 7, 9, 0, 0, 0) },
  ];

  return opts.map((o) => ({ label: o.label, until: o.until.toISOString() }));
}
