import { NextRequest, NextResponse } from 'next/server';
import { categoryRepository } from '@/lib/repositories';
import { getAuthContext, getDefaultCompanyId } from '@/lib/api-auth';
import { validateData, CategoryCreateSchema } from '@/lib/validations/schemas';

export async function GET() {
  const auth = await getAuthContext();
  const companyId = auth?.companyId || (await getDefaultCompanyId());

  if (!companyId) {
    return NextResponse.json({ data: [] });
  }

  try {
    const categories = await categoryRepository.findAllByCompany(companyId);
    return NextResponse.json({ data: categories });
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
    const validated = validateData(CategoryCreateSchema, body);
    const category = await categoryRepository.create({
      ...validated,
      company_id: auth.companyId,
      description: validated.description ?? null,
      image_url: validated.image_url ?? null,
      is_active: true,
      created_by: auth.id,
      updated_by: auth.id,
    } as any);
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
