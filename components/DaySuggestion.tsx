'use client';

import { useEffect, useState } from 'react';

function getTodayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

export default function DaySuggestion() {
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    const { timeMin, timeMax } = getTodayBounds();
    fetch(`/api/day-suggestion?timeMin=${timeMin}&timeMax=${timeMax}`)
      .then((r) => r.json())
      .then((d) => setSuggestion(d.suggestion ?? ''))
      .catch(() => setSuggestion(''));
  }, []);

  if (!suggestion) return null;

  return (
    <div className="flex items-start gap-2.5 px-1 text-sm leading-relaxed text-zinc-400">
      <span className="mt-0.5 text-violet-400">✦</span>
      <p className="italic">{suggestion}</p>
    </div>
  );
}
