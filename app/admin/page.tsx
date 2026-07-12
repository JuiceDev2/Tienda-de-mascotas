'use client';

import { useEffect, useState } from 'react';
import { useSales, useNotifications, useAuth } from '@/lib/hooks';
import { Header, Sidebar, MetricCard, DataTable } from '@/components/shared';
import { Package, ShoppingBag, Bell } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const { sales, total: totalSales, isLoading: salesLoading } = useSales({ limit: 10 });
  const { total: totalNotifications } = useNotifications();

  useEffect(() => {
    fetch('/api/products?limit=100')
      .then((res) => res.json())
      .then((body) => setProducts(body.data?.data || []))
      .finally(() => setProductsLoading(false));
  }, []);

  const sidebarItems = [{ label: 'Dashboard', href: '/admin' }];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar items={sidebarItems} activeItem="/admin" onItemClick={() => {}} />

      <div className="flex-1">
        <Header showCart={false} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Hola, {user?.full_name || 'Admin'}
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <MetricCard
              title="Productos activos"
              value={productsLoading ? '—' : products.length}
              icon={<Package className="w-6 h-6" />}
            />
            <MetricCard
              title="Ventas registradas"
              value={salesLoading ? '—' : totalSales}
              icon={<ShoppingBag className="w-6 h-6" />}
            />
            <MetricCard
              title="Notificaciones"
              value={totalNotifications}
              icon={<Bell className="w-6 h-6" />}
            />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ventas recientes</h2>
          <DataTable
            columns={[
              { label: 'Cliente', key: 'customer_name' },
              {
                label: 'Total',
                key: 'total_amount',
                render: (v: number) => `$${Number(v).toFixed(2)}`,
              },
              { label: 'Estado', key: 'status' },
              {
                label: 'Fecha',
                key: 'sale_date',
                render: (v: string) => new Date(v).toLocaleDateString(),
              },
            ]}
            data={sales}
            isLoading={salesLoading}
          />
        </main>
      </div>
    </div>
  );
}
