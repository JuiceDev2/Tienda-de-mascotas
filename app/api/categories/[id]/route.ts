import { NextRequest, NextResponse } from 'next/server';
import { categoryRepository } from '@/lib/repositories';
import { getAuthContext } from '@/lib/api-auth';
import { validateData, CategoryUpdateSchema } from '@/lib/validations/schemas';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = validateData(CategoryUpdateSchema, body);
    const category = await categoryRepository.update(auth.companyId, params.id, {
      ...validated,
      updated_by: auth.id,
    } as any);
    return NextResponse.json({ data: category });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    await categoryRepository.delete(auth.companyId, params.id);
    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
