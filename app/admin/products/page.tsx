'use client';

import { useEffect, useState } from 'react';
import { DataTable, Modal, ConfirmDialog, Alert } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  cost_price: number;
  is_active: boolean;
  category_id: string;
  brand_id: string | null;
  category?: { name: string } | null;
  brand?: { name: string } | null;
}

interface Option {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  code: '',
  barcode: '',
  name: '',
  description: '',
  category_id: '',
  brand_id: '',
  cost_price: '',
  selling_price: '',
  utility_percentage: '0',
  iva_percentage: '0',
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    const [productsRes, categoriesRes, brandsRes] = await Promise.all([
      fetch('/api/products?limit=100'),
      fetch('/api/categories'),
      fetch('/api/brands'),
    ]);
    const productsBody = await productsRes.json();
    const categoriesBody = await categoriesRes.json();
    const brandsBody = await brandsRes.json();
    setProducts(productsBody.data?.data || []);
    setCategories(categoriesBody.data || []);
    setBrands(brandsBody.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id || '' });
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      code: product.code,
      barcode: '',
      name: product.name,
      description: '',
      category_id: product.category_id,
      brand_id: product.brand_id || '',
      cost_price: String(product.cost_price),
      selling_price: String(product.selling_price),
      utility_percentage: '0',
      iva_percentage: '0',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = editing ? `/api/products/${editing.id}` : '/api/products';
    const method = editing ? 'PUT' : 'POST';

    const payload = {
      code: form.code,
      barcode: form.barcode || undefined,
      name: form.name,
      description: form.description || undefined,
      category_id: form.category_id,
      brand_id: form.brand_id || undefined,
      cost_price: Number(form.cost_price),
      selling_price: Number(form.selling_price),
      utility_percentage: Number(form.utility_percentage) || 0,
      iva_percentage: Number(form.iva_percentage) || 0,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error al guardar');
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await fetch(`/api/products/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <Button onClick={openCreate} disabled={categories.length === 0}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo producto
        </Button>
      </div>

      {categories.length === 0 && !isLoading && (
        <div className="mb-6">
          <Alert
            type="warning"
            message="Necesitas crear al menos una categoría antes de agregar productos."
          />
        </div>
      )}

      <DataTable
        isLoading={isLoading}
        data={products}
        columns={[
          { label: 'Código', key: 'code' },
          { label: 'Nombre', key: 'name' },
          { label: 'Categoría', key: 'category', render: (v) => v?.name || '—' },
          {
            label: 'Precio venta',
            key: 'selling_price',
            render: (v) => `$${Number(v).toFixed(2)}`,
          },
          {
            label: 'Costo',
            key: 'cost_price',
            render: (v) => `$${Number(v).toFixed(2)}`,
          },
          {
            label: 'Estado',
            key: 'is_active',
            render: (v) => (
              <span className={v ? 'text-green-600' : 'text-gray-400'}>
                {v ? 'Activo' : 'Inactivo'}
              </span>
            ),
          },
          {
            label: 'Acciones',
            key: 'id',
            render: (_v, row) => (
              <div className="flex gap-3">
                <button onClick={() => openEdit(row)} className="text-blue-600 hover:text-blue-800">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleting(row)} className="text-red-600 hover:text-red-800">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
      />

      {showForm && (
        <Modal title={editing ? 'Editar producto' : 'Nuevo producto'} onClose={() => setShowForm(false)}>
          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de barras</label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  required
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="" disabled>
                    Selecciona...
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                <select
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={form.brand_id}
                  onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                >
                  <option value="">Sin marca</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio de costo</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={form.cost_price}
                  onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={form.selling_price}
                  onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">% IVA</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.iva_percentage}
                  onChange={(e) => setForm({ ...form, iva_percentage: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">% Utilidad</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.utility_percentage}
                  onChange={(e) => setForm({ ...form, utility_percentage: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar producto"
          message={`¿Seguro que quieres eliminar "${deleting.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          isLoading={saving}
        />
      )}
    </>
  );
}
