'use client';

import { useState } from 'react';
import { Item } from '@/lib/supabase';
import { bucketFor, dueLabel } from '@/lib/reminders';
import { isSnoozed, snoozeLabel, snoozeOptions } from '@/lib/snooze';

const TYPE_STYLES: Record<Item['type'], { badge: string; dot: string }> = {
  task:     { badge: 'bg-blue-500/10 text-blue-300 ring-blue-500/20',       dot: 'bg-blue-400' },
  idea:     { badge: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',    dot: 'bg-amber-400' },
  link:     { badge: 'bg-violet-500/10 text-violet-300 ring-violet-500/20', dot: 'bg-violet-400' },
  reminder: { badge: 'bg-rose-500/10 text-rose-300 ring-rose-500/20',       dot: 'bg-rose-400' },
  note:     { badge: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',       dot: 'bg-zinc-500' },
  question: { badge: 'bg-teal-500/10 text-teal-300 ring-teal-500/20',       dot: 'bg-teal-400' },
};

const ALL_TYPES: Item['type'][] = ['task', 'reminder', 'question', 'idea', 'link', 'note'];

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
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
  onUpdate: (id: string, updates: Partial<Item>) => void;
  onDelete: (id: string) => void;
  now?: Date;
  onTagClick?: (tag: string) => void;
  activeTag?: string | null;
  onSnooze?: (id: string, until: string | null) => void;
};

export default function ItemCard({ item, onUpdate, onDelete, now, onTagClick, activeTag, onSnooze }: Props) {
  const isDone = item.status === 'done';
  const style = TYPE_STYLES[item.type];
  const at = now ?? new Date();
  const bucket = bucketFor(item, at);
  const showDue =
    item.status === 'open' &&
    !!item.metadata.due_date &&
    (item.type === 'task' || item.type === 'reminder');

  const tags = (item.metadata.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  const snoozed = isSnoozed(item, at);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  function startEdit() {
    setDraft(item.title);
    setEditing(true);
  }

  function saveTitle() {
    setEditing(false);
    const t = draft.trim();
    if (t && t !== item.title) onUpdate(item.id, { title: t });
  }

  return (
    <div
      className={`group relative flex items-start gap-3 rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/70 ${
        isDone ? 'opacity-50' : ''
      }`}
    >
      {item.type === 'task' ? (
        <button
          onClick={() => onUpdate(item.id, { status: isDone ? 'open' : 'done' })}
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
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[15px] leading-snug text-zinc-100 outline-none focus:border-violet-500"
          />
        ) : (
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
        )}

        {item.type === 'link' && item.metadata.summary && (
          <p className="mt-1.5 text-[13px] leading-snug text-zinc-400">{item.metadata.summary}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset transition-opacity hover:opacity-80 ${style.badge}`}
              aria-label="Change type"
            >
              {item.type}
              <svg className="h-2.5 w-2.5 opacity-60" viewBox="0 0 10 10" fill="none">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                  {ALL_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setMenuOpen(false);
                        if (t !== item.type) onUpdate(item.id, { type: t });
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs capitalize transition-colors hover:bg-zinc-800 ${
                        t === item.type ? 'text-zinc-100' : 'text-zinc-400'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${TYPE_STYLES[t].dot}`} />
                      {t}
                      {t === item.type && <span className="ml-auto text-violet-400">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <span className="text-xs text-zinc-500">{formatTime(item.created_at)}</span>
          {showDue && (
            <span
              className={`text-xs font-medium ${
                bucket === 'overdue' ? 'text-rose-400' : bucket === 'today' ? 'text-amber-300' : 'text-blue-400'
              }`}
            >
              · {dueLabel(item, at)}
            </span>
          )}
          {snoozed && (
            <span className="text-xs font-medium text-indigo-300">😴 {snoozeLabel(item, at)}</span>
          )}
          {onTagClick &&
            tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  activeTag === tag
                    ? 'bg-violet-500/20 text-violet-200'
                    : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/70 hover:text-zinc-200'
                }`}
              >
                #{tag}
              </button>
            ))}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        {!editing && onSnooze && item.status === 'open' && (
          <div className="relative">
            <button
              onClick={() => setSnoozeOpen((o) => !o)}
              className={`flex h-6 w-6 items-center justify-center rounded-md transition-all hover:bg-zinc-800 hover:text-indigo-300 ${
                snoozed
                  ? 'text-indigo-300 opacity-100'
                  : 'text-zinc-600 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
              }`}
              aria-label="Snooze"
              title="Snooze"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7 4V7L9 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {snoozeOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSnoozeOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                  {snoozed && (
                    <button
                      onClick={() => {
                        setSnoozeOpen(false);
                        onSnooze(item.id, null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-indigo-300 transition-colors hover:bg-zinc-800"
                    >
                      ⏰ Wake now
                    </button>
                  )}
                  {snoozeOptions(at).map((o) => (
                    <button
                      key={o.label}
                      onClick={() => {
                        setSnoozeOpen(false);
                        onSnooze(item.id, o.until);
                      }}
                      className="flex w-full items-center px-3 py-1.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {!editing && (
          <button
            onClick={startEdit}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 opacity-60 transition-all hover:bg-zinc-800 hover:text-zinc-300 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Edit title"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onDelete(item.id)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 opacity-60 transition-all hover:bg-zinc-800 hover:text-rose-400 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Delete item"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
            <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
