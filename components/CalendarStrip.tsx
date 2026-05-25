'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

type CalendarEvent = {
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
};

function formatEventTime(ev: CalendarEvent): string {
  if (ev.allDay) return 'All day';
  const start = new Date(ev.start);
  return start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function getTodayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

export default function CalendarStrip() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const { timeMin, timeMax } = getTodayBounds();
    fetch(`/api/calendar/today?timeMin=${timeMin}&timeMax=${timeMax}`)
      .then((r) => r.json())
      .then((d) => {
        setConnected(!!d.connected);
        setEvents(d.events ?? []);
      })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, []);

  async function connect() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  }

  if (loading) {
    return (
      <div className="flex h-16 items-center px-1 text-xs text-zinc-600">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-600" />
        <span className="ml-2">Loading calendar…</span>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex h-16 items-center justify-between rounded-xl border border-dashed border-zinc-800 px-4">
        <span className="text-sm text-zinc-500">Connect your calendar to see today.</span>
        <button
          onClick={connect}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Connect Google Calendar
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex h-16 items-center rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-4">
        <span className="text-sm text-zinc-500">No events today.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-3">
      <div className="flex gap-2 overflow-x-auto">
        {events.map((ev, i) => (
          <div
            key={i}
            className="flex min-w-[140px] max-w-[220px] flex-shrink-0 flex-col gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 sm:min-w-[180px]"
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-violet-300">
              {formatEventTime(ev)}
            </span>
            <span className="truncate text-sm text-zinc-200">{ev.summary}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
