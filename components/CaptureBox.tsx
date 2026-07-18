'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Item } from '@/lib/supabase';

// Minimal shape of the Web Speech API we use (not in the standard TS DOM lib). Chrome/Edge/
// Safari expose it (webkit-prefixed); Firefox doesn't, so the mic button hides where absent.
type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechCtor(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

type Props = {
  onCapture: (item: Item) => void;
};

export default function CaptureBox({ onCapture }: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice dictation via the browser's Web Speech API. `supported` is set after mount (not at
  // render) so SSR and the first client render agree — otherwise the mic button would hydrate-mismatch.
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef(''); // text already in the box when dictation started

  useEffect(() => {
    setSupported(!!getSpeechCtor());
    return () => recognitionRef.current?.stop();
  }, []);

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechCtor();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = value ? value + ' ' : '';
    rec.onresult = (e) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setValue((baseRef.current + transcript).trimStart());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

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
          <div className="flex items-center gap-2">
            {supported && (
              <button
                type="button"
                onClick={toggleVoice}
                disabled={loading}
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                  listening
                    ? 'animate-pulse border-rose-500/40 bg-rose-500/15 text-rose-300'
                    : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
                aria-label={listening ? 'Stop dictation' : 'Dictate with your voice'}
                title={listening ? 'Stop dictation' : 'Dictate with your voice'}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                  <rect x="5" y="1.5" width="4" height="7" rx="2" fill="currentColor" />
                  <path d="M3 6.5a4 4 0 0 0 8 0M7 10.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              {listening ? (
                <span className="text-rose-300">Listening…</span>
              ) : error ? (
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
