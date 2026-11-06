// Shared row types. Kept apart from lib/supabase.ts so client components can import them
// without pulling in the server-only database client.

export type Item = {
  id: string;
  created_at: string;
  raw_input: string;
  type: 'task' | 'idea' | 'link' | 'reminder' | 'note' | 'question';
  title: string;
  status: 'open' | 'done' | 'archived';
  metadata: Record<string, string>;
  last_surfaced_at?: string | null; // set when shown in the daily resurface review
};
