'use client';

import { useState } from 'react';
import CaptureBox from '@/components/CaptureBox';
import ItemList from '@/components/ItemList';
import CalendarStrip from '@/components/CalendarStrip';
import DaySuggestion from '@/components/DaySuggestion';
import SearchBox from '@/components/SearchBox';
import { Item } from '@/lib/supabase';

export default function Home() {
  const [latestItem, setLatestItem] = useState<Item | null>(null);

  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[500px]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139, 92, 246, 0.08), transparent 70%)',
        }}
      />

      <main className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-16">
        <header className="mb-8">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Vira</h1>
            <span className="text-xs font-medium text-zinc-600">v0.2</span>
          </div>
          <p className="mt-2 text-sm text-zinc-500">Capture first. Organize later.</p>
        </header>

        <div className="mb-4">
          <CalendarStrip />
        </div>

        <div className="mb-6">
          <DaySuggestion />
        </div>

        <SearchBox />

        <CaptureBox onCapture={setLatestItem} />

        <div className="mt-12">
          <ItemList newItem={latestItem} />
        </div>
      </main>
    </div>
  );
}
