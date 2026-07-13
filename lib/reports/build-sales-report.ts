import {
  SaleWithItems,
  SalesReport,
  ProductSalesData,
  SellerSalesData,
  DailySalesData,
} from '../supabase/types';

export function buildSalesReport(
  sales: SaleWithItems[],
  period: string
): SalesReport {
  const completed = sales.filter((s) => s.status !== 'cancelled');

  const totalSales = completed.length;
  const totalAmount = completed.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalTax = completed.reduce((sum, s) => sum + Number(s.tax_amount || 0), 0);
  const averageSaleValue = totalSales > 0 ? totalAmount / totalSales : 0;

  // Top products
  const productMap = new Map<string, ProductSalesData>();
  for (const sale of completed) {
    for (const item of sale.items || []) {
      const existing = productMap.get(item.product_id);
      const productName = (item as any).product?.name || item.product_id;
      const lineTotal = Number(item.line_total || 0);
      if (existing) {
        existing.quantity_sold += item.quantity;
        existing.total_amount += lineTotal;
      } else {
        productMap.set(item.product_id, {
          product_id: item.product_id,
          product_name: productName,
          quantity_sold: item.quantity,
          total_amount: lineTotal,
        });
      }
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 10);

  // Top sellers
  const sellerMap = new Map<string, SellerSalesData>();
  for (const sale of completed) {
    const sellerId = sale.seller_id || 'unknown';
    const sellerName = (sale as any).seller?.full_name || 'Sin asignar';
    const existing = sellerMap.get(sellerId);
    if (existing) {
      existing.sales_count += 1;
      existing.total_amount += Number(sale.total_amount || 0);
    } else {
      sellerMap.set(sellerId, {
        seller_id: sellerId,
        seller_name: sellerName,
        sales_count: 1,
        total_amount: Number(sale.total_amount || 0),
      });
    }
  }
  const topSellers = Array.from(sellerMap.values()).sort(
    (a, b) => b.total_amount - a.total_amount
  );

  // Daily trend
  const dailyMap = new Map<string, DailySalesData>();
  for (const sale of completed) {
    const date = sale.sale_date?.slice(0, 10) || 'sin-fecha';
    const existing = dailyMap.get(date);
    if (existing) {
      existing.total_sales += 1;
      existing.total_amount += Number(sale.total_amount || 0);
    } else {
      dailyMap.set(date, {
        date,
        total_sales: 1,
        total_amount: Number(sale.total_amount || 0),
      });
    }
  }
  const dailyTrend = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return {
    title: 'Reporte de Ventas',
    period,
    totalSales,
    totalAmount,
    totalTax,
    averageSaleValue,
    topProducts,
    topSellers,
    dailyTrend,
  };
}
