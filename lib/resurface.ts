import { Item } from './supabase';

const DAY = 24 * 60 * 60 * 1000;
const MIN_AGE_DAYS = 3; // don't resurface fresh captures — give them time to be acted on
const COOLDOWN_DAYS = 7; // once surfaced, rest an item for a week before showing it again

/**
 * The "resurfacing" pile: still-open, undated items old enough to have been forgotten and
 * not shown recently. Dated items are handled by the reminders/Due flow, so they're excluded
 * here. Never-surfaced + oldest float to the top so nothing rots silently and nothing spams.
 */
export function resurfaceCandidates(items: Item[], now: Date, limit = 5): Item[] {
  const nowMs = now.getTime();
  const surfacedMs = (i: Item) => (i.last_surfaced_at ? new Date(i.last_surfaced_at).getTime() : 0);

  return items
    .filter((i) => {
      if (i.status !== 'open') return false;
      if (i.metadata?.due_date) return false; // reminders own dated items
      if (nowMs - new Date(i.created_at).getTime() < MIN_AGE_DAYS * DAY) return false;
      return nowMs - surfacedMs(i) > COOLDOWN_DAYS * DAY;
    })
    .sort((a, b) => {
      const sa = surfacedMs(a);
      const sb = surfacedMs(b);
      if (sa !== sb) return sa - sb; // least-recently-surfaced first (never-surfaced = 0)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // then oldest
    })
    .slice(0, limit);
}
