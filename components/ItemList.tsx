'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabase, Item } from '@/lib/supabase';
import { dueNow } from '@/lib/reminders';
import { resurfaceCandidates } from '@/lib/resurface';
import ItemCard from './ItemCard';
import DueSection from './DueSection';
import ResurfacePanel from './ResurfacePanel';

const TYPE_ORDER: Item['type'][] = ['task', 'reminder', 'question', 'idea', 'link', 'note'];

const TYPE_LABELS: Record<Item['type'], string> = {
  task: 'Tasks',
  idea: 'Ideas',
  link: 'Links',
  reminder: 'Reminders',
  note: 'Notes',
  question: 'Questions',
};

type Props = {
  newItem: Item | null;
};

export default function ItemList({ newItem }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  // Re-tick every minute so due buckets, labels, and notifications stay current.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const fetchItems = useCallback(async () => {
    const { data } = await getSupabase()
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data as Item[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!newItem) return;
    setItems((prev) => {
      if (prev.some((i) => i.id === newItem.id)) return prev;
      return [newItem, ...prev];
    });
  }, [newItem]);

  async function handleUpdate(id: string, updates: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/items?id=${id}`, { method: 'DELETE' });
  }

  // "Keep" from the resurface review — stamp last_surfaced_at so it rests for a week.
  async function handleSurface(id: string) {
    const iso = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, last_surfaced_at: iso } : i)));
    await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, surfaced: true }),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-600">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-600" />
        Loading
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center">
        <p className="text-sm text-zinc-500">Nothing captured yet.</p>
        <p className="mt-1 text-xs text-zinc-600">Start by typing something above.</p>
      </div>
    );
  }

  // Overdue + due-today items get pinned to the top; the rest stay grouped by type.
  const due = dueNow(items, now);
  const dueIds = new Set(due.map((i) => i.id));
  const rest = items.filter((i) => !dueIds.has(i.id));
  const resurface = resurfaceCandidates(items, now);

  const grouped: Partial<Record<Item['type'], Item[]>> = {};
  for (const item of rest) {
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type]!.push(item);
  }

  // Sort tasks: open before done
  if (grouped.task) {
    grouped.task = [
      ...grouped.task.filter((i) => i.status !== 'done'),
      ...grouped.task.filter((i) => i.status === 'done'),
    ];
  }

  return (
    <div className="space-y-10">
      <DueSection due={due} now={now} onUpdate={handleUpdate} onDelete={handleDelete} />
      <ResurfacePanel
        candidates={resurface}
        onSurface={handleSurface}
        onArchive={(id) => handleUpdate(id, { status: 'archived' })}
      />
      {TYPE_ORDER.filter((type) => grouped[type]?.length).map((type) => (
        <section key={type}>
          <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
            {TYPE_LABELS[type]}
            <span className="rounded-full bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-zinc-400">
              {grouped[type]!.length}
            </span>
          </h2>
          <div className="space-y-2">
            {grouped[type]!.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                now={now}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
