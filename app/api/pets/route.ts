import { NextRequest, NextResponse } from 'next/server';
import { petRepository } from '@/lib/repositories';
import { getAuthContext, getDefaultCompanyId } from '@/lib/api-auth';
import { validateData, PetCreateSchema } from '@/lib/validations/schemas';
import { PetStatus } from '@/lib/supabase/types';

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  const companyId = auth?.companyId || (await getDefaultCompanyId());

  if (!companyId) {
    return NextResponse.json({ data: { data: [], total: 0 } });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || '20');
  const branchId = searchParams.get('branchId') || undefined;
  // Admins managing the catalog need to see pets in every status
  // (reserved/sold included), not just the ones available for sale.
  const includeAll = searchParams.get('all') === 'true' && auth?.role === 'admin';

  try {
    const result = await petRepository.findAllPaginated(companyId, { limit, offset: 0, branchId });
    // Public storefront should only ever show pets that are actually
    // purchasable right now.
    const data = includeAll ? result.data : result.data.filter((p: any) => p.status === 'available');
    return NextResponse.json({ data: { ...result, data } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await req.json();

  try {
    const validated = validateData(PetCreateSchema, body);
    const pet = await petRepository.create({
      ...validated,
      company_id: auth.companyId,
      breed: validated.breed ?? null,
      sex: validated.sex ?? null,
      age_months: validated.age_months ?? null,
      description: validated.description ?? null,
      documents: validated.documents ?? {},
      health_info: validated.health_info ?? {},
      is_available: true,
      status: PetStatus.Available,
      created_by: auth.id,
      updated_by: auth.id,
    } as any);
    return NextResponse.json({ data: pet }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
