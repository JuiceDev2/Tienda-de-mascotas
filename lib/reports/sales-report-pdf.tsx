import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { SalesReport } from '../supabase/types';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 18, marginBottom: 4, fontWeight: 700 },
  subtitle: { fontSize: 10, color: '#666', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  summaryBox: {
    flex: 1,
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  summaryLabel: { fontSize: 8, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  table: { display: 'flex', width: 'auto' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 4 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#111827', paddingVertical: 6 },
  cell: { flex: 1, fontSize: 9, paddingHorizontal: 4 },
  headerCell: { flex: 1, fontSize: 9, paddingHorizontal: 4, color: '#fff', fontWeight: 700 },
});

function SalesReportDocument({ report }: { report: SalesReport }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.subtitle}>Periodo: {report.period}</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Ventas totales</Text>
            <Text style={styles.summaryValue}>{report.totalSales}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Monto total</Text>
            <Text style={styles.summaryValue}>${report.totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Impuestos</Text>
            <Text style={styles.summaryValue}>${report.totalTax.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Venta promedio</Text>
            <Text style={styles.summaryValue}>${report.averageSaleValue.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Productos más vendidos</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.headerCell}>Producto</Text>
            <Text style={styles.headerCell}>Cantidad</Text>
            <Text style={styles.headerCell}>Total</Text>
          </View>
          {report.topProducts.map((p) => (
            <View style={styles.tableRow} key={p.product_id}>
              <Text style={styles.cell}>{p.product_name}</Text>
              <Text style={styles.cell}>{p.quantity_sold}</Text>
              <Text style={styles.cell}>${p.total_amount.toFixed(2)}</Text>
            </View>
          ))}
          {report.topProducts.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.cell}>Sin datos en el periodo seleccionado</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Ventas por vendedor</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.headerCell}>Vendedor</Text>
            <Text style={styles.headerCell}>N° ventas</Text>
            <Text style={styles.headerCell}>Total</Text>
          </View>
          {report.topSellers.map((s) => (
            <View style={styles.tableRow} key={s.seller_id}>
              <Text style={styles.cell}>{s.seller_name}</Text>
              <Text style={styles.cell}>{s.sales_count}</Text>
              <Text style={styles.cell}>${s.total_amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Tendencia diaria</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.headerCell}>Fecha</Text>
            <Text style={styles.headerCell}>N° ventas</Text>
            <Text style={styles.headerCell}>Total</Text>
          </View>
          {report.dailyTrend.map((d) => (
            <View style={styles.tableRow} key={d.date}>
              <Text style={styles.cell}>{d.date}</Text>
              <Text style={styles.cell}>{d.total_sales}</Text>
              <Text style={styles.cell}>${d.total_amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function generateSalesReportPdf(report: SalesReport): Promise<Buffer> {
  return renderToBuffer(<SalesReportDocument report={report} />);
}
