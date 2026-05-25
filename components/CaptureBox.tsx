'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Item } from '@/lib/supabase';

type Props = {
  onCapture: (item: Item) => void;
};

export default function CaptureBox({ onCapture }: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: trimmed }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        setError(msg ?? 'Something went wrong');
        return;
      }

      const item: Item = await res.json();
      onCapture(item);
      setValue('');
      textareaRef.current?.focus();
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="capture-wrapper relative">
      <div className="ambient-glow" />
      <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-2xl shadow-black/40 backdrop-blur-sm transition-colors focus-within:border-zinc-700">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading}
          placeholder="Capture anything — a task, idea, link, question…"
          rows={3}
          className="w-full resize-none bg-transparent text-base leading-relaxed text-zinc-100 placeholder-zinc-600 outline-none disabled:opacity-50"
        />

        <div className="mt-3 flex items-center justify-between border-t border-zinc-800/60 pt-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {error ? (
              <span className="text-rose-400">{error}</span>
            ) : (
              <>
                <kbd className="rounded border border-zinc-700 bg-zinc-800/50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                  ⌘
                </kbd>
                <kbd className="rounded border border-zinc-700 bg-zinc-800/50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                  ↵
                </kbd>
                <span>to capture</span>
              </>
            )}
          </div>

          <button
            onClick={submit}
            disabled={loading || !value.trim()}
            className="group relative overflow-hidden rounded-lg bg-violet-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-400 hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/80" />
                Capturing
              </span>
            ) : (
              'Capture'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
