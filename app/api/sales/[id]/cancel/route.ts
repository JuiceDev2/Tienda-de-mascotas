import { NextRequest, NextResponse } from 'next/server';
import { salesService } from '@/lib/services';
import { getAuthContext } from '@/lib/api-auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (!auth || (auth.role !== 'admin' && auth.role !== 'seller')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    await salesService.cancelSale(auth.companyId, params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
