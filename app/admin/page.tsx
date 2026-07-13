'use client';

import { useEffect, useState } from 'react';
import { useSales, useNotifications, useAuth, usePushNotifications } from '@/lib/hooks';
import { MetricCard, DataTable } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Package, ShoppingBag, Bell } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(null);

  const { sales, total: totalSales, isLoading: salesLoading } = useSales({ limit: 10 });
  const { total: totalNotifications } = useNotifications();
  const { subscribeToPush } = usePushNotifications();

  useEffect(() => {
    fetch('/api/products?limit=100')
      .then((res) => res.json())
      .then((body) => setProducts(body.data?.data || []))
      .finally(() => setProductsLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    await subscribeToPush();
    setNotifPermission(typeof Notification !== 'undefined' ? Notification.permission : null);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {user?.full_name || 'Admin'}
        </h1>
        {notifPermission !== 'granted' && (
          <Button variant="outline" onClick={handleEnableNotifications}>
            <Bell className="w-4 h-4 mr-2" /> Activar notificaciones
          </Button>
        )}
      </div>

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
    </>
  );
}
