import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDefaultCompanyId } from '@/lib/api-auth';
import { UserRole } from '@/lib/supabase/types';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const companyId = await getDefaultCompanyId();

  if (!companyId) {
    return NextResponse.json(
      { error: 'La tienda todavía no tiene una empresa configurada' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        id: user.id,
        company_id: companyId,
        branch_id: null,
        full_name: body.fullName,
        email: user.email,
        phone: body.phone || null,
        role: UserRole.Client,
        is_active: true,
        failed_login_attempts: 0,
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
