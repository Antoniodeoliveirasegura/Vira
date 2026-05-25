'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading || !password) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.replace('/');
      router.refresh();
    } else {
      const { error: msg } = await res.json().catch(() => ({}));
      setError(msg ?? 'Wrong password');
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[500px]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139, 92, 246, 0.08), transparent 70%)',
        }}
      />
      <form onSubmit={submit} className="relative w-full max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Vira</h1>
        <p className="mt-1 text-sm text-zinc-500">Enter your password to continue.</p>

        <input
          type="password"
          inputMode="text"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="Password"
          className="mt-8 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-[15px] text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-violet-500 disabled:opacity-50"
        />
        {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-400 hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
        >
          {loading ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
