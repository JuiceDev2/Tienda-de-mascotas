'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks';
import { Sidebar, Header, LoadingSpinner } from '@/components/shared';
import {
  LayoutDashboard,
  Package,
  Tags,
  Store,
  Users,
  FileBarChart,
  Settings,
} from 'lucide-react';

const SIDEBAR_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Productos y Mascotas', href: '/admin/products', icon: <Package className="w-4 h-4" /> },
  { label: 'Categorías', href: '/admin/categories', icon: <Tags className="w-4 h-4" /> },
  { label: 'Sucursales', href: '/admin/branches', icon: <Store className="w-4 h-4" /> },
  { label: 'Usuarios', href: '/admin/users', icon: <Users className="w-4 h-4" /> },
  { label: 'Reportes', href: '/admin/reports', icon: <FileBarChart className="w-4 h-4" /> },
  { label: 'Configuración', href: '/admin/settings', icon: <Settings className="w-4 h-4" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      router.replace('/');
    }
  }, [isLoading, user, router]);

  // Close the mobile sidebar automatically whenever the route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        items={SIDEBAR_ITEMS}
        activeItem={pathname}
        onItemClick={(href) => router.push(href)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0">
        <Header showCart={false} onMenuClick={() => setSidebarOpen(true)} />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
