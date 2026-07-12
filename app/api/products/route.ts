import { NextRequest, NextResponse } from 'next/server';
import { productRepository } from '@/lib/repositories/lib_repositories_product.repository';
import { productService } from '@/lib/services';
import { getAuthContext, getDefaultCompanyId } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || undefined;
  const categoryId = searchParams.get('categoryId') || undefined;
  const branchId = searchParams.get('branchId') || undefined;

  const auth = await getAuthContext();
  const companyId = auth?.companyId || (await getDefaultCompanyId());

  if (!companyId) {
    return NextResponse.json({
      data: { data: [], count: 0, total: 0, page: 1, pageSize: limit, pageCount: 0 },
    });
  }

  const offset = (page - 1) * limit;

  try {
    // Storefront requests always send a branchId: use the stock-aware query
    // so out-of-stock products aren't shown and quantity_on_hand is included.
    if (branchId) {
      const result = await productRepository.getPublicProducts(companyId, branchId, {
        limit,
        offset,
      });

      let data = (result.data as any[]).map((product) => ({
        ...product,
        quantity_on_hand: product.inventory?.[0]?.quantity_on_hand ?? 0,
      }));

      if (search) {
        const term = search.toLowerCase();
        data = data.filter((p) => p.name?.toLowerCase().includes(term));
      }

      return NextResponse.json({ data: { ...result, data } });
    }

    // Admin/back-office listing: full catalog, not limited to in-stock items.
    const result = await productRepository.findAllPaginated(companyId, {
      limit,
      offset,
      search,
      categoryId,
      isActive: true,
    });
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

  const body = await req.json();

  try {
    const product = await productService.createProduct(auth.companyId, body);
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
