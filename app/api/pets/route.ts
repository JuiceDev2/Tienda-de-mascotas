import { NextRequest, NextResponse } from 'next/server';
import { petRepository } from '@/lib/repositories';
import { getAuthContext, getDefaultCompanyId } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  const companyId = auth?.companyId || (await getDefaultCompanyId());

  if (!companyId) {
    return NextResponse.json({ data: { data: [], total: 0 } });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || '20');

  try {
    const result = await petRepository.findAllPaginated(companyId, { limit, offset: 0 });
    // Public storefront should only ever show pets that are actually
    // purchasable right now.
    const available = result.data.filter((p: any) => p.status === 'available');
    return NextResponse.json({ data: { ...result, data: available } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
