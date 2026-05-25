import { getSupabase } from './supabase';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export type CalendarEvent = {
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
};

export class NotConnectedError extends Error {
  constructor() {
    super('Google Calendar not connected');
    this.name = 'NotConnectedError';
  }
}

async function getRefreshToken(): Promise<string> {
  const { data, error } = await getSupabase()
    .from('google_tokens')
    .select('refresh_token')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new NotConnectedError();

  return data.refresh_token as string;
}

async function exchangeRefreshForAccess(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${await res.text()}`);
  }

  const json = await res.json();
  return json.access_token as string;
}

export async function getTodayEvents(timeMinIso: string, timeMaxIso: string): Promise<CalendarEvent[]> {
  const refreshToken = await getRefreshToken();
  const accessToken = await exchangeRefreshForAccess(refreshToken);

  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    maxResults: '50',
  });

  const res = await fetch(`${CALENDAR_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Calendar API failed: ${await res.text()}`);
  }

  const json = await res.json();
  const items: unknown[] = json.items ?? [];

  return items.map((raw) => {
    const ev = raw as {
      summary?: string;
      start: { date?: string; dateTime?: string };
      end: { date?: string; dateTime?: string };
    };
    const allDay = !!ev.start.date;
    return {
      summary: ev.summary ?? '(no title)',
      start: allDay ? ev.start.date! : ev.start.dateTime!,
      end: allDay ? ev.end.date! : ev.end.dateTime!,
      allDay,
    };
  });
}

export async function storeRefreshToken(refreshToken: string): Promise<void> {
  const db = getSupabase();
  // Single-user: clear any existing token first
  await db.from('google_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await db.from('google_tokens').insert({ refresh_token: refreshToken });
  if (error) throw error;
}
