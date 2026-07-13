import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { userRepository } from '@/lib/repositories';
import { getAuthContext } from '@/lib/api-auth';
import { validateData, UserCreateSchema } from '@/lib/validations/schemas';

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    const result = await userRepository.findByCompany(auth.companyId, { limit, offset });
    return NextResponse.json({ data: result });
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
    const validated = validateData(UserCreateSchema, body);

    // Employee accounts (seller/admin) need a real Supabase Auth user so they
    // can log in with email + password. This requires the service role key.
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true,
    });

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: authError?.message || 'No se pudo crear el usuario' },
        { status: 400 }
      );
    }

    try {
      const user = await userRepository.create({
        id: authUser.user.id,
        company_id: auth.companyId,
        branch_id: validated.branch_id ?? null,
        full_name: validated.full_name,
        email: validated.email,
        phone: validated.phone ?? null,
        role: validated.role,
        is_active: true,
        last_login_at: null,
        failed_login_attempts: 0,
        locked_until: null,
        created_by: auth.id,
        updated_by: auth.id,
      } as any);

      return NextResponse.json({ data: user }, { status: 201 });
    } catch (dbError: any) {
      // Roll back the auth user if the profile row failed to insert, so we
      // don't leave an orphaned login with no company/role.
      await serviceClient.auth.admin.deleteUser(authUser.user.id);
      throw dbError;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
