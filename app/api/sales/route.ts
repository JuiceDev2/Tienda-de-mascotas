import { NextRequest, NextResponse } from 'next/server';
import { salesRepository } from '@/lib/repositories/lib_repositories_sale.repository';
import { salesService } from '@/lib/services';
import { getAuthContext, getDefaultCompanyId } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth || (auth.role !== 'admin' && auth.role !== 'seller')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '10');
  const branchId = searchParams.get('branchId') || undefined;
  const status = searchParams.get('status') || undefined;
  const offset = (page - 1) * limit;

  try {
    const result = await salesRepository.findAllPaginated(auth.companyId, {
      limit,
      offset,
      branchId,
      status: status as any,
    });
    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const auth = await getAuthContext();
  const companyId = auth?.companyId || (await getDefaultCompanyId());

  if (!companyId) {
    return NextResponse.json({ error: 'Tienda no configurada' }, { status: 400 });
  }

  if (!body.branchId) {
    return NextResponse.json({ error: 'branchId es requerido' }, { status: 400 });
  }

  const sellerId = auth && (auth.role === 'seller' || auth.role === 'admin') ? auth.id : null;

  try {
    const result = await salesService.createSale(companyId, body.branchId, sellerId, {
      customer_phone: body.customer_phone,
      customer_name: body.customer_name,
      items: body.items,
      notes: body.notes,
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
