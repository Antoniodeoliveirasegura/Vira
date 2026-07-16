'use client';

import { useState, type FormEvent } from 'react';
import { Item } from '@/lib/supabase';

type Result = Item & { similarity: number };

export default function SearchBox() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[] | null>(null); // null = not searching
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchedQ, setSearchedQ] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);

  async function run(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) {
      setResults(null);
      return;
    }
    setLoading(true);
    setError('');
    setAnswer(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Search failed');
        setResults([]);
      } else {
        setResults(json.results);
        setSearchedQ(query);
      }
    } catch {
      setError('Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // On-demand synthesis — only fires a Claude call when the user clicks.
  async function getAnswer() {
    if (!searchedQ) return;
    setAnswering(true);
    try {
      const res = await fetch(`/api/answer?q=${encodeURIComponent(searchedQ)}`);
      const json = await res.json();
      setAnswer(res.ok ? json.answer || 'Nothing in your notes answers that.' : json.error || 'Answer failed.');
    } catch {
      setAnswer('Answer failed.');
    } finally {
      setAnswering(false);
    }
  }

  function clear() {
    setQ('');
    setResults(null);
    setError('');
    setAnswer(null);
    setSearchedQ('');
  }

  return (
    <div className="mb-6">
      <form onSubmit={run} className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask your brain…  (semantic search)"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 pr-20 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-violet-500/50"
        />
        {results !== null ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            clear
          </button>
        ) : (
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            search
          </button>
        )}
      </form>

      {loading && <p className="mt-2 px-1 text-xs text-zinc-500">searching…</p>}
      {error && <p className="mt-2 px-1 text-xs text-rose-400">{error}</p>}

      {results !== null && !loading && !error && (
        <div className="mt-3 space-y-2">
          {results.length > 0 &&
            (answer !== null ? (
              <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{answer}</p>
                <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-violet-300/70">
                  ✨ answer · grounded in your notes below
                </p>
              </div>
            ) : (
              <button
                onClick={getAnswer}
                disabled={answering}
                className="w-full rounded-xl border border-violet-500/25 bg-violet-500/[0.04] px-3 py-2 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-500/[0.08] disabled:opacity-60"
              >
                {answering ? 'thinking…' : '✨ Answer this from my notes'}
              </button>
            ))}

          {results.length === 0 ? (
            <p className="px-1 text-xs text-zinc-500">No matches.</p>
          ) : (
            results.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-100">
                    {r.type === 'link' && r.metadata?.url ? (
                      <a
                        href={r.metadata.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-300 underline decoration-violet-500/40 underline-offset-4 hover:text-violet-200"
                      >
                        {r.title}
                      </a>
                    ) : (
                      r.title
                    )}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">{r.type}</p>
                </div>
                <span className="flex-shrink-0 text-[10px] tabular-nums text-zinc-600" title="similarity">
                  {Math.round(r.similarity * 100)}%
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
