import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const ITEM_TYPES = ['task', 'idea', 'link', 'reminder', 'note', 'question'];
const ITEM_STATUSES = ['open', 'done', 'archived'];

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  // Whitelist + validate the editable fields so a bad client can't corrupt a row.
  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!ITEM_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }
    updates.status = body.status;
  }
  if (body.type !== undefined) {
    if (!ITEM_TYPES.includes(body.type)) {
      return NextResponse.json({ error: 'invalid type' }, { status: 400 });
    }
    updates.type = body.type;
  }
  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) {
      return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 });
    }
    updates.title = title.slice(0, 200);
  }
  if (body.surfaced === true) {
    updates.last_surfaced_at = new Date().toISOString(); // server-authoritative timestamp
  }
  if (body.snooze_until !== undefined) {
    if (body.snooze_until !== null && isNaN(new Date(body.snooze_until).getTime())) {
      return NextResponse.json({ error: 'invalid snooze_until' }, { status: 400 });
    }
    // Read-merge-write metadata so we set/clear just snoozed_until without clobbering url/tags/due_date.
    const { data: current } = await getSupabase().from('items').select('metadata').eq('id', id).single();
    const metadata: Record<string, unknown> = { ...(current?.metadata ?? {}) };
    if (body.snooze_until === null) delete metadata.snoozed_until;
    else metadata.snoozed_until = new Date(body.snooze_until).toISOString();
    updates.metadata = metadata;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no editable fields provided' }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from('items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase update error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await getSupabase().from('items').delete().eq('id', id);

  if (error) {
    console.error('Supabase delete error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
