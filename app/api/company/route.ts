import { NextRequest, NextResponse } from 'next/server';
import { companyRepository } from '@/lib/repositories';
import { getAuthContext, getDefaultCompanyId } from '@/lib/api-auth';

export async function GET() {
  const companyId = await getDefaultCompanyId();
  if (!companyId) {
    return NextResponse.json({ data: null });
  }

  try {
    const company = await companyRepository.findById(companyId);
    return NextResponse.json({ data: company });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

const ALLOWED_FIELDS = [
  'name',
  'logo_url',
  'hero_image_url',
  'hero_title',
  'hero_subtitle',
  'hero_cta_text',
  'hero_cta_url',
] as const;

export async function PUT(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updates: Record<string, any> = { updated_by: auth.id };
    for (const field of ALLOWED_FIELDS) {
      if (field in body) updates[field] = body[field];
    }

    const company = await companyRepository.update(auth.companyId, updates);
    return NextResponse.json({ data: company });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
