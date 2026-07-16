'use client';

import { Item } from '@/lib/supabase';

const DOT: Record<Item['type'], string> = {
  task: 'bg-blue-400',
  idea: 'bg-amber-400',
  link: 'bg-violet-400',
  reminder: 'bg-rose-400',
  note: 'bg-zinc-500',
  question: 'bg-teal-400',
};

type Props = {
  candidates: Item[]; // aging, still-open, undated items to review
  onSurface: (id: string) => void; // "Keep" — still relevant, rest it for a week
  onArchive: (id: string) => void; // "Archive" — done with it
};

export default function ResurfacePanel({ candidates, onSurface, onArchive }: Props) {
  if (!candidates.length) return null;

  return (
    <section className="mb-10 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-3">
      <div className="mb-3 flex items-center gap-2 px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-violet-300/90">Resurfacing</h2>
        <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-200">
          {candidates.length}
        </span>
        <span className="text-xs text-zinc-500">— still relevant?</span>
      </div>

      <div className="space-y-2">
        {candidates.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-3"
          >
            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${DOT[item.type]}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-100">{item.title}</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">{item.type}</p>
            </div>
            <button
              onClick={() => onSurface(item.id)}
              className="flex-shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-violet-500/50 hover:text-violet-200"
            >
              Keep
            </button>
            <button
              onClick={() => onArchive(item.id)}
              className="flex-shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              Archive
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
