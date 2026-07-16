'use client';

import { useEffect, useState } from 'react';
import { Item } from '@/lib/supabase';
import { bucketFor, isRipe } from '@/lib/reminders';
import ItemCard from './ItemCard';

const NOTIFIED_KEY = 'vira_notified';

type Props = {
  due: Item[]; // already filtered to overdue + due-today, soonest first
  now: Date;
  onUpdate: (id: string, updates: Partial<Item>) => void;
  onDelete: (id: string) => void;
};

export default function DueSection({ due, now, onUpdate, onDelete }: Props) {
  const [perm, setPerm] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof Notification !== 'undefined') setPerm(Notification.permission);
  }, []);

  // Fire one browser notification per newly-due item; dedupe by id in localStorage
  // so an item that stays due doesn't re-fire on every minute tick.
  useEffect(() => {
    if (perm !== 'granted' || typeof Notification === 'undefined') return;
    let notified: string[] = [];
    try {
      notified = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]');
    } catch {}
    const fresh = due.filter((i) => isRipe(i, now) && !notified.includes(i.id));
    if (!fresh.length) return;
    for (const item of fresh) {
      new Notification(bucketFor(item, now) === 'overdue' ? 'Overdue' : 'Due', {
        body: item.title,
        tag: item.id,
      });
    }
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notified, ...fresh.map((i) => i.id)].slice(-500)));
  }, [due, perm, now]);

  async function enable() {
    if (typeof Notification === 'undefined') return;
    setPerm(await Notification.requestPermission());
  }

  if (!due.length) return null;

  const overdue = due.filter((i) => bucketFor(i, now) === 'overdue').length;

  return (
    <section className="mb-10 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-300/90">
          Due now
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-amber-200">
            {due.length}
          </span>
          {overdue > 0 && (
            <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-rose-300">
              {overdue} overdue
            </span>
          )}
        </h2>
        {perm !== 'granted' && (
          <button
            onClick={enable}
            disabled={perm === 'denied'}
            className="flex-shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            title={perm === 'denied' ? 'Notifications are blocked in your browser settings' : 'Get a browser notification when something falls due'}
          >
            {perm === 'denied' ? '🔕 Notifications blocked' : '🔔 Enable notifications'}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {due.map((item) => (
          <ItemCard key={item.id} item={item} now={now} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}
