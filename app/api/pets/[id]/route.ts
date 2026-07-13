import { NextRequest, NextResponse } from 'next/server';
import { petRepository } from '@/lib/repositories';
import { getAuthContext } from '@/lib/api-auth';
import { validateData, PetUpdateSchema } from '@/lib/validations/schemas';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const pet = await petRepository.findById(auth.companyId, params.id);
    if (!pet) {
      return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ data: pet });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await req.json();

  try {
    const validated = validateData(PetUpdateSchema, body);
    const pet = await petRepository.update(auth.companyId, params.id, {
      ...validated,
      updated_by: auth.id,
    } as any);
    return NextResponse.json({ data: pet });
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
    await petRepository.delete(auth.companyId, params.id);
    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
