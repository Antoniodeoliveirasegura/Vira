import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}

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
