import * as XLSX from 'xlsx';
import { SalesReport } from '../supabase/types';

export function generateSalesReportExcel(report: SalesReport): Buffer {
  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Reporte de Ventas'],
    ['Periodo', report.period],
    [],
    ['Ventas totales', report.totalSales],
    ['Monto total', report.totalAmount],
    ['Impuestos', report.totalTax],
    ['Venta promedio', report.averageSaleValue],
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  const productsSheet = XLSX.utils.json_to_sheet(
    report.topProducts.map((p) => ({
      Producto: p.product_name,
      Cantidad: p.quantity_sold,
      Total: p.total_amount,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top productos');

  const sellersSheet = XLSX.utils.json_to_sheet(
    report.topSellers.map((s) => ({
      Vendedor: s.seller_name,
      'N° ventas': s.sales_count,
      Total: s.total_amount,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, sellersSheet, 'Vendedores');

  const trendSheet = XLSX.utils.json_to_sheet(
    report.dailyTrend.map((d) => ({
      Fecha: d.date,
      'N° ventas': d.total_sales,
      Total: d.total_amount,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, trendSheet, 'Tendencia diaria');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
