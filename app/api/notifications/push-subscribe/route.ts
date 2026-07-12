import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const supabase = createClient();

  const { error } = await supabase.from('push_subscriptions').insert([
    {
      user_id: auth.id,
      company_id: auth.companyId,
      endpoint: body.endpoint,
      auth_key: body.keys?.auth,
      p256dh_key: body.keys?.p256dh,
    },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
