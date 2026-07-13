// ============================================================================
// SHARED COMPONENTS
// Header, Sidebar, DataTable, MetricCard - Reusable UI components
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Search, ShoppingCart, Bell, User, LogOut, X } from 'lucide-react';

/**
 * HEADER COMPONENT
 * Top navigation bar with search, cart, notifications
 */
export function Header({ showCart = true }: { showCart?: boolean }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeName, setStoreName] = useState('AquaPets');

  useEffect(() => {
    fetch('/api/company')
      .then((res) => res.json())
      .then((body) => {
        if (body.data?.name) setStoreName(body.data.name);
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/client?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-blue-600">
            {storeName}
          </Link>

          {/* Search Bar (Desktop) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300"
              />
            </div>
          </form>

          {/* Right side icons */}
          <div className="flex items-center gap-4">
            {/* Notifications (Desktop) */}
            {user && (
              <button className="relative hidden md:flex">
                <Bell className="w-6 h-6 text-gray-600 hover:text-gray-900" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  3
                </span>
              </button>
            )}

            {/* Cart Button */}
            {showCart && (
              <Link href="/client/cart" className="relative">
                <ShoppingCart className="w-6 h-6 text-gray-600 hover:text-gray-900" />
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  0
                </span>
              </Link>
            )}

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700">
                    <User className="w-5 h-5" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <span className="text-xs text-gray-500">{user.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Perfil</DropdownMenuItem>
                  <DropdownMenuItem>Configuración</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                size="sm"
              >
                Login
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t">
            <form onSubmit={handleSearch} className="mb-4">
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </form>
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * SIDEBAR COMPONENT
 * Navigation sidebar for dashboard
 */
export function Sidebar({
  items,
  activeItem,
  onItemClick,
}: {
  items: Array<{ label: string; href: string; icon?: React.ReactNode }>;
  activeItem: string;
  onItemClick: (href: string) => void;
}) {
  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Admin</h2>
      </div>

      <nav className="space-y-2">
        {items.map((item) => (
          <button
            key={item.href}
            onClick={() => onItemClick(item.href)}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeItem === item.href
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              {item.label}
            </div>
          </button>
        ))}
      </nav>
    </aside>
  );
}

/**
 * METRIC CARD COMPONENT
 * Display key metrics in dashboard
 */
export function MetricCard({
  title,
  value,
  unit = '',
  icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  trendLabel?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">
            {value} <span className="text-lg text-gray-500">{unit}</span>
          </p>
          {trendLabel && (
            <p
              className={`text-sm mt-2 ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend === 'up' ? '↑' : '↓'} {trendLabel}
            </p>
          )}
        </div>
        {icon && <div className="text-blue-600">{icon}</div>}
      </div>
    </div>
  );
}

/**
 * DATA TABLE COMPONENT
 * Generic reusable data table with pagination
 */
export function DataTable({
  columns,
  data,
  onRowClick,
  pagination,
  onPaginationChange,
  isLoading = false,
}: {
  columns: Array<{ label: string; key: string; render?: (value: any, row: any) => React.ReactNode }>;
  data: any[];
  onRowClick?: (row: any) => void;
  pagination?: { page: number; limit: number; total: number };
  onPaginationChange?: (page: number) => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-3 text-left text-sm font-semibold text-gray-900"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500">
                No hay datos
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 text-sm text-gray-900">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination && (
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
          <div className="text-sm text-gray-600">
            Mostrando 1 - {data.length} de {pagination.total} resultados
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => onPaginationChange?.(pagination.page - 1)}
              disabled={pagination.page === 1}
              variant="outline"
              size="sm"
            >
              Anterior
            </Button>
            <Button
              onClick={() => onPaginationChange?.(pagination.page + 1)}
              disabled={pagination.page * pagination.limit >= pagination.total}
              variant="outline"
              size="sm"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * PRODUCT CARD COMPONENT
 * Display product in grid layout
 */
export function ProductCard({
  product,
  onAddToCart,
  onViewDetails,
}: {
  product: any;
  onAddToCart?: (productId: string) => void;
  onViewDetails?: (productId: string) => void;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
      {/* Product Image */}
      <div className="aspect-video bg-gray-200 overflow-hidden cursor-pointer"
        onClick={() => onViewDetails?.(product.id)}>
        {product.image_urls?.[0] ? (
          <img
            src={product.image_urls[0]}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <span className="text-gray-400">Sin imagen</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <p className="text-sm text-gray-500">{product.category?.name}</p>
        <h3 className="text-lg font-semibold text-gray-900 mt-1 truncate">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            ${product.selling_price.toFixed(2)}
          </span>
          {product.cost_price && (
            <span className="text-sm text-gray-500 line-through">
              ${product.cost_price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Stock */}
        <p className={`text-sm mt-2 ${
          product.quantity_on_hand > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {product.quantity_on_hand > 0
            ? `${product.quantity_on_hand} disponible`
            : 'Agotado'}
        </p>

        {/* Add to Cart */}
        {product.quantity_on_hand > 0 && (
          <div className="mt-4 flex gap-2">
            <input
              type="number"
              min="1"
              max={product.quantity_on_hand}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 border rounded text-center"
            />
            <Button
              onClick={() => onAddToCart?.(product.id)}
              className="flex-1"
            >
              Agregar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ALERT COMPONENT
 * Display alerts and notifications
 */
export function Alert({
  type = 'info',
  title,
  message,
  onClose,
}: {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  onClose?: () => void;
}) {
  const bgColor = {
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    error: 'bg-red-50 border-red-200',
  }[type];

  const textColor = {
    info: 'text-blue-900',
    success: 'text-green-900',
    warning: 'text-yellow-900',
    error: 'text-red-900',
  }[type];

  return (
    <div className={`${bgColor} border rounded-lg p-4 flex justify-between items-start`}>
      <div>
        {title && <h3 className={`${textColor} font-semibold`}>{title}</h3>}
        <p className={`${textColor} text-sm`}>{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className={`${textColor}`}>
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * MODAL COMPONENT
 * Simple centered modal used by the admin CRUD screens
 */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/**
 * CONFIRM DIALOG COMPONENT
 * Small confirmation dialog for destructive actions (e.g. delete)
 */
export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  isLoading,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-2">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * LOADING SPINNER COMPONENT
 */
export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
