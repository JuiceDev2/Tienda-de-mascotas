import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDefaultCompanyId } from '@/lib/api-auth';

export async function GET() {
  const companyId = await getDefaultCompanyId();

  if (!companyId) {
    return NextResponse.json({ data: [] });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}
