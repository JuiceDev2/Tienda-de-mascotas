import { NextRequest, NextResponse } from 'next/server';
import { brandRepository } from '@/lib/repositories';
import { getAuthContext, getDefaultCompanyId } from '@/lib/api-auth';
import { validateData, BrandCreateSchema } from '@/lib/validations/schemas';

export async function GET() {
  const auth = await getAuthContext();
  const companyId = auth?.companyId || (await getDefaultCompanyId());

  if (!companyId) {
    return NextResponse.json({ data: [] });
  }

  try {
    const brands = await brandRepository.findAllByCompany(companyId);
    return NextResponse.json({ data: brands });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = validateData(BrandCreateSchema, body);
    const brand = await brandRepository.create({
      ...validated,
      company_id: auth.companyId,
      logo_url: validated.logo_url ?? null,
      description: validated.description ?? null,
      website: validated.website ?? null,
      is_active: true,
      created_by: auth.id,
      updated_by: auth.id,
    } as any);
    return NextResponse.json({ data: brand }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
