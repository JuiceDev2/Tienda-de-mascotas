import { NextRequest, NextResponse } from 'next/server';
import { branchRepository } from '@/lib/repositories';
import { getAuthContext } from '@/lib/api-auth';
import { validateData, BranchUpdateSchema } from '@/lib/validations/schemas';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = validateData(BranchUpdateSchema, body);
    const branch = await branchRepository.update(auth.companyId, params.id, {
      ...validated,
      updated_by: auth.id,
    } as any);
    return NextResponse.json({ data: branch });
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
    await branchRepository.delete(auth.companyId, params.id);
    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
