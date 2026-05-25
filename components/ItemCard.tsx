'use client';

import { Item } from '@/lib/supabase';

const TYPE_STYLES: Record<Item['type'], { badge: string; dot: string }> = {
  task:     { badge: 'bg-blue-500/10 text-blue-300 ring-blue-500/20',       dot: 'bg-blue-400' },
  idea:     { badge: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',    dot: 'bg-amber-400' },
  link:     { badge: 'bg-violet-500/10 text-violet-300 ring-violet-500/20', dot: 'bg-violet-400' },
  reminder: { badge: 'bg-rose-500/10 text-rose-300 ring-rose-500/20',       dot: 'bg-rose-400' },
  note:     { badge: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',       dot: 'bg-zinc-500' },
  question: { badge: 'bg-teal-500/10 text-teal-300 ring-teal-500/20',       dot: 'bg-teal-400' },
};

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type Props = {
  item: Item;
  onStatusChange: (id: string, status: 'done' | 'open') => void;
  onDelete: (id: string) => void;
};

export default function ItemCard({ item, onStatusChange, onDelete }: Props) {
  const isDone = item.status === 'done';
  const style = TYPE_STYLES[item.type];

  return (
    <div
      className={`group relative flex items-start gap-3 rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/70 ${
        isDone ? 'opacity-50' : ''
      }`}
    >
      {item.type === 'task' ? (
        <button
          onClick={() => onStatusChange(item.id, isDone ? 'open' : 'done')}
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-all ${
            isDone
              ? 'border-violet-500 bg-violet-500 text-white'
              : 'border-zinc-700 hover:border-violet-400 hover:bg-violet-500/10'
          }`}
          aria-label={isDone ? 'Mark as open' : 'Mark as done'}
        >
          {isDone && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ) : (
        <span className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${style.dot}`} />
      )}

      <div className="min-w-0 flex-1">
        <p className={`text-[15px] leading-snug text-zinc-100 ${isDone ? 'line-through' : ''}`}>
          {item.type === 'link' && item.metadata.url ? (
            <a
              href={item.metadata.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-300 underline decoration-violet-500/40 underline-offset-4 transition-colors hover:text-violet-200 hover:decoration-violet-400"
            >
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset ${style.badge}`}
          >
            {item.type}
          </span>
          <span className="text-xs text-zinc-500">{formatTime(item.created_at)}</span>
          {item.type === 'task' && item.metadata.due_date && (
            <span className="text-xs text-blue-400">· due {item.metadata.due_date}</span>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(item.id)}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-zinc-600 opacity-60 transition-all hover:bg-zinc-800 hover:text-rose-400 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label="Delete item"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
          <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
