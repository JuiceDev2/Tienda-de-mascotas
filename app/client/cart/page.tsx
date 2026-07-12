'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, useSales } from '@/lib/hooks';
import { Header, Alert, LoadingSpinner } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CartPage() {
  const router = useRouter();
  const { cart, total, removeItem, updateQuantity, clearCart, isLoading } = useCart();
  const { createSale, createSaleLoading } = useSales();

  const [branchId, setBranchId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/branches')
      .then((res) => res.json())
      .then((body) => {
        if (body.data?.[0]) setBranchId(body.data[0].id);
      })
      .catch(() => {});
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!branchId) {
      setError('No hay una sucursal disponible para procesar la compra.');
      return;
    }

    if (cart.length === 0) {
      setError('Tu carrito está vacío.');
      return;
    }

    try {
      await createSale({
        branchId,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: cart.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      });

      clearCart();
      setSuccess('¡Compra realizada con éxito! Gracias por tu pedido.');
    } catch (err: any) {
      setError(err.message || 'No se pudo completar la compra.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showCart={false} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Tu carrito</h1>

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

        {isLoading ? (
          <LoadingSpinner />
        ) : cart.length === 0 && !success ? (
          <div className="text-center text-gray-500 py-16">
            Tu carrito está vacío.{' '}
            <button onClick={() => router.push('/client')} className="text-blue-600 underline">
              Ver productos
            </button>
          </div>
        ) : (
          !success && (
            <>
              <div className="bg-white rounded-lg shadow divide-y">
                {cart.map((item) => (
                  <div key={item.productId} className="p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-500">${item.price.toFixed(2)} c/u</p>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.productId, Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-16 px-2 py-1 border rounded text-center"
                    />
                    <p className="w-20 text-right font-semibold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 bg-white rounded-lg shadow p-4 flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
              </div>

              <form onSubmit={handleCheckout} className="mt-6 bg-white rounded-lg shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Datos de contacto</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <Input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <Input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="5512345678"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createSaleLoading}>
                  {createSaleLoading ? 'Procesando...' : 'Finalizar compra'}
                </Button>
              </form>
            </>
          )
        )}
      </main>
    </div>
  );
}
