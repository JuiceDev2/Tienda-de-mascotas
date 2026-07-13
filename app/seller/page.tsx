'use client';

import { useEffect, useState } from 'react';
import { useAuth, useProducts, useSales, useDebounce } from '@/lib/hooks';
import { Header, Alert, LoadingSpinner } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface OrderLine {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export default function SellerPosPage() {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [order, setOrder] = useState<OrderLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { createSale, createSaleLoading } = useSales();

  useEffect(() => {
    if (user?.branch_id) {
      setBranchId(user.branch_id);
      return;
    }
    fetch('/api/branches')
      .then((res) => res.json())
      .then((body) => {
        if (body.data?.[0]) setBranchId(body.data[0].id);
      })
      .catch(() => {});
  }, [user]);

  const { products, isLoading } = useProducts({
    branchId,
    search: debouncedSearch || undefined,
    limit: 20,
  });

  const addToOrder = (product: any) => {
    setOrder((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          price: product.selling_price,
          quantity: 1,
        },
      ];
    });
  };

  const removeLine = (productId: string) => {
    setOrder((prev) => prev.filter((line) => line.productId !== productId));
  };

  const total = order.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const handleCompleteSale = async () => {
    setError(null);

    if (order.length === 0) {
      setError('Agrega al menos un producto a la venta.');
      return;
    }

    try {
      await createSale({
        branchId,
        customer_name: customerName || 'Cliente en tienda',
        customer_phone: customerPhone || '0000000000',
        items: order.map((line) => ({
          product_id: line.productId,
          quantity: line.quantity,
          unit_price: line.price,
        })),
      });

      setOrder([]);
      setCustomerName('');
      setCustomerPhone('');
      setSuccess('Venta registrada correctamente.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar la venta.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showCart={false} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Punto de venta</h1>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos..."
              className="rounded-md border border-gray-300 px-3 py-2 text-sm w-full sm:w-64"
            />
          </div>

          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {products.map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => addToOrder(product)}
                  disabled={!product.quantity_on_hand}
                  className="bg-white rounded-lg shadow p-4 text-left hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p className="font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    ${product.selling_price.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {product.quantity_on_hand > 0
                      ? `${product.quantity_on_hand} disponible`
                      : 'Agotado'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 h-fit lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Venta actual</h2>

          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}
          {success && (
            <div className="mb-4">
              <Alert type="success" message={success} />
            </div>
          )}

          {order.length === 0 ? (
            <p className="text-sm text-gray-500">Sin productos agregados.</p>
          ) : (
            <div className="space-y-3 mb-4">
              {order.map((line) => (
                <div key={line.productId} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{line.productName}</p>
                    <p className="text-gray-500">
                      {line.quantity} × ${line.price.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeLine(line.productId)}
                    className="text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4 mb-4 flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <div className="space-y-3 mb-4">
            <Input
              type="text"
              placeholder="Nombre del cliente (opcional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <Input
              type="tel"
              placeholder="Teléfono (opcional)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={handleCompleteSale} disabled={createSaleLoading}>
            {createSaleLoading ? 'Procesando...' : 'Cobrar venta'}
          </Button>
        </div>
      </main>
    </div>
  );
}
