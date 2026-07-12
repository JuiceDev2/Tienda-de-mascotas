import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services';
import { getAuthContext } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  try {
    const result = await notificationService.getUserNotifications(auth.id, { limit, offset });
    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
