import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/lib/repositories';
import { getAuthContext } from '@/lib/api-auth';
import { validateData, UserUpdateSchema } from '@/lib/validations/schemas';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = validateData(UserUpdateSchema, body);
    const user = await userRepository.update(params.id, {
      ...validated,
      updated_by: auth.id,
    } as any);
    return NextResponse.json({ data: user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  if (params.id === auth.id) {
    return NextResponse.json(
      { error: 'No puedes desactivar tu propia cuenta' },
      { status: 400 }
    );
  }

  try {
    // Soft-disable rather than hard-delete: keeps sale/audit history intact
    // and matches the deleted_at pattern used across the rest of the app.
    await userRepository.update(params.id, {
      is_active: false,
      deleted_at: new Date().toISOString(),
    } as any);
    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
