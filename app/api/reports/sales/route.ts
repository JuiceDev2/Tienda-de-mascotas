import { NextRequest, NextResponse } from 'next/server';
import { salesRepository } from '@/lib/repositories/lib_repositories_sale.repository';
import { getAuthContext } from '@/lib/api-auth';
import { buildSalesReport } from '@/lib/reports/build-sales-report';
import { generateSalesReportPdf } from '@/lib/reports/sales-report-pdf';
import { generateSalesReportExcel } from '@/lib/reports/sales-report-excel';

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get('format') || 'json') as 'pdf' | 'excel' | 'json';
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const branchId = searchParams.get('branchId') || undefined;

  try {
    // Reports pull every sale in the window (not paginated) so the totals
    // and top-N breakdowns are accurate, not just the first page.
    const result = await salesRepository.findAllPaginated(auth.companyId, {
      limit: 5000,
      offset: 0,
      branchId,
      startDate,
      endDate,
    });

    const period =
      startDate && endDate
        ? `${startDate} a ${endDate}`
        : startDate
          ? `Desde ${startDate}`
          : endDate
            ? `Hasta ${endDate}`
            : 'Todo el historial';

    const report = buildSalesReport(result.data, period);

    if (format === 'json') {
      return NextResponse.json({ data: report });
    }

    if (format === 'pdf') {
      const buffer = await generateSalesReportPdf(report);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="reporte-ventas-${Date.now()}.pdf"`,
        },
      });
    }

    if (format === 'excel') {
      const buffer = generateSalesReportExcel(report);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="reporte-ventas-${Date.now()}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
