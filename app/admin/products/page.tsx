'use client';

import { useEffect, useState } from 'react';
import { DataTable, Modal, ConfirmDialog, Alert } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Package, PawPrint } from 'lucide-react';

type ItemType = 'product' | 'pet';

interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  cost_price: number;
  is_active: boolean;
  category_id: string;
  brand_id: string | null;
  image_urls?: string[];
  category?: { name: string } | null;
  brand?: { name: string } | null;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  age_months: number | null;
  description: string | null;
  price: number;
  status: string;
  branch_id: string;
  image_urls?: string[];
}

interface Option {
  id: string;
  name: string;
}

const EMPTY_PRODUCT_FORM = {
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
  image_urls: '',
  branch_id: '',
  initial_stock: '0',
};

const EMPTY_PET_FORM = {
  name: '',
  species: '',
  breed: '',
  sex: '',
  age_months: '',
  description: '',
  price: '',
  image_urls: '',
  branch_id: '',
};

export default function AdminProductsPage() {
  const [tab, setTab] = useState<ItemType>('product');
  const [products, setProducts] = useState<Product[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<ItemType>('product');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [petForm, setPetForm] = useState(EMPTY_PET_FORM);
  const [deleting, setDeleting] = useState<{ id: string; name: string; type: ItemType } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    const [productsRes, petsRes, categoriesRes, brandsRes, branchesRes] = await Promise.all([
      fetch('/api/products?limit=100'),
      fetch('/api/pets?limit=100&all=true'),
      fetch('/api/categories'),
      fetch('/api/brands'),
      fetch('/api/branches'),
    ]);
    const productsBody = await productsRes.json();
    const petsBody = await petsRes.json();
    const categoriesBody = await categoriesRes.json();
    const brandsBody = await brandsRes.json();
    const branchesBody = await branchesRes.json();
    setProducts(productsBody.data?.data || []);
    setPets(petsBody.data?.data || []);
    setCategories(categoriesBody.data || []);
    setBrands(brandsBody.data || []);
    setBranches(branchesBody.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormType(tab);
    setProductForm({
      ...EMPTY_PRODUCT_FORM,
      category_id: categories[0]?.id || '',
      branch_id: branches[0]?.id || '',
    });
    setPetForm({ ...EMPTY_PET_FORM, branch_id: branches[0]?.id || '' });
    setError(null);
    setShowForm(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingId(product.id);
    setFormType('product');
    setProductForm({
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
      image_urls: (product.image_urls || []).join(', '),
      // Left blank on purpose: we don't know this product's current stock
      // per branch here, so only touch inventory if the admin explicitly
      // picks a branch and stock value while editing.
      branch_id: '',
      initial_stock: '0',
    });
    setError(null);
    setShowForm(true);
  };

  const openEditPet = (pet: Pet) => {
    setEditingId(pet.id);
    setFormType('pet');
    setPetForm({
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      sex: pet.sex || '',
      age_months: pet.age_months != null ? String(pet.age_months) : '',
      description: pet.description || '',
      price: String(pet.price),
      image_urls: (pet.image_urls || []).join(', '),
      branch_id: pet.branch_id,
    });
    setError(null);
    setShowForm(true);
  };

  const parseImageUrls = (value: string) =>
    value
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const isProduct = formType === 'product';
    const url = isProduct
      ? editingId
        ? `/api/products/${editingId}`
        : '/api/products'
      : editingId
      ? `/api/pets/${editingId}`
      : '/api/pets';
    const method = editingId ? 'PUT' : 'POST';

    const payload = isProduct
      ? {
          code: productForm.code,
          barcode: productForm.barcode || undefined,
          name: productForm.name,
          description: productForm.description || undefined,
          category_id: productForm.category_id,
          brand_id: productForm.brand_id || undefined,
          cost_price: Number(productForm.cost_price),
          selling_price: Number(productForm.selling_price),
          utility_percentage: Number(productForm.utility_percentage) || 0,
          iva_percentage: Number(productForm.iva_percentage) || 0,
          image_urls: parseImageUrls(productForm.image_urls),
          branch_id: productForm.branch_id || undefined,
          initial_stock: productForm.branch_id ? Number(productForm.initial_stock) || 0 : undefined,
        }
      : {
          name: petForm.name,
          species: petForm.species,
          breed: petForm.breed || undefined,
          sex: petForm.sex || undefined,
          age_months: petForm.age_months ? Number(petForm.age_months) : undefined,
          description: petForm.description || undefined,
          price: Number(petForm.price),
          image_urls: parseImageUrls(petForm.image_urls),
          branch_id: petForm.branch_id,
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
      setTab(formType);
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
      const url = deleting.type === 'product' ? `/api/products/${deleting.id}` : `/api/pets/${deleting.id}`;
      await fetch(url, { method: 'DELETE' });
      setDeleting(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name || '—';

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Productos y Mascotas</h1>
        <Button
          onClick={openCreate}
          disabled={tab === 'product' ? categories.length === 0 : branches.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" /> Nuevo {tab === 'product' ? 'insumo' : 'mascota'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setTab('product')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'product' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          <Package className="w-4 h-4" /> Insumos ({products.length})
        </button>
        <button
          onClick={() => setTab('pet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'pet' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          <PawPrint className="w-4 h-4" /> Mascotas ({pets.length})
        </button>
      </div>

      {tab === 'product' && categories.length === 0 && !isLoading && (
        <div className="mb-6">
          <Alert
            type="warning"
            message="Necesitas crear al menos una categoría antes de agregar insumos."
          />
        </div>
      )}

      {tab === 'pet' && branches.length === 0 && !isLoading && (
        <div className="mb-6">
          <Alert
            type="warning"
            message="Necesitas crear al menos una sucursal antes de agregar mascotas."
          />
        </div>
      )}

      {tab === 'product' ? (
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
                  <button onClick={() => openEditProduct(row)} className="text-blue-600 hover:text-blue-800">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleting({ id: row.id, name: row.name, type: 'product' })}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <DataTable
          isLoading={isLoading}
          data={pets}
          columns={[
            { label: 'Nombre', key: 'name' },
            { label: 'Especie', key: 'species' },
            { label: 'Sucursal', key: 'branch_id', render: (v) => branchName(v) },
            {
              label: 'Precio',
              key: 'price',
              render: (v) => `$${Number(v).toFixed(2)}`,
            },
            {
              label: 'Estado',
              key: 'status',
              render: (v) => (
                <span
                  className={
                    v === 'available'
                      ? 'text-green-600'
                      : v === 'reserved'
                      ? 'text-yellow-600'
                      : 'text-gray-400'
                  }
                >
                  {v === 'available' ? 'Disponible' : v === 'reserved' ? 'Reservada' : 'Vendida'}
                </span>
              ),
            },
            {
              label: 'Acciones',
              key: 'id',
              render: (_v, row) => (
                <div className="flex gap-3">
                  <button onClick={() => openEditPet(row)} className="text-blue-600 hover:text-blue-800">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleting({ id: row.id, name: row.name, type: 'pet' })}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {showForm && (
        <Modal
          title={editingId ? `Editar ${formType === 'product' ? 'insumo' : 'mascota'}` : 'Nuevo elemento del catálogo'}
          onClose={() => setShowForm(false)}
        >
          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          {!editingId && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué quieres agregar?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormType('product')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold border transition-colors ${
                    formType === 'product'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  <Package className="w-4 h-4" /> Insumo
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('pet')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold border transition-colors ${
                    formType === 'pet'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  <PawPrint className="w-4 h-4" /> Mascota
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Esto define en qué carrusel y listado del sitio aparecerá.
              </p>
            </div>
          )}

          {formType === 'product' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <Input
                    required
                    value={productForm.code}
                    onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de barras</label>
                  <Input
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <Input
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <Input
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imágenes (URLs separadas por coma)
                </label>
                <Input
                  placeholder="https://.../foto1.jpg, https://.../foto2.jpg"
                  value={productForm.image_urls}
                  onChange={(e) => setProductForm({ ...productForm, image_urls: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    required
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
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
                    value={productForm.brand_id}
                    onChange={(e) => setProductForm({ ...productForm, brand_id: e.target.value })}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio de costo</label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.cost_price}
                    onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta</label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.selling_price}
                    onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% IVA</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={productForm.iva_percentage}
                    onChange={(e) => setProductForm({ ...productForm, iva_percentage: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% Utilidad</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={productForm.utility_percentage}
                    onChange={(e) => setProductForm({ ...productForm, utility_percentage: e.target.value })}
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Disponibilidad en tienda (sucursal y existencias)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={productForm.branch_id}
                      onChange={(e) => setProductForm({ ...productForm, branch_id: e.target.value })}
                    >
                      <option value="">No publicar en tienda todavía</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
                    <Input
                      type="number"
                      min="0"
                      value={productForm.initial_stock}
                      onChange={(e) => setProductForm({ ...productForm, initial_stock: e.target.value })}
                      disabled={!productForm.branch_id}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  El listado de productos de la tienda sólo muestra insumos con existencias mayores a 0 en la
                  sucursal seleccionada. La página de inicio muestra todo el catálogo activo.
                </p>
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
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <Input required value={petForm.name} onChange={(e) => setPetForm({ ...petForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especie</label>
                  <Input
                    required
                    placeholder="Perro, gato, ave..."
                    value={petForm.species}
                    onChange={(e) => setPetForm({ ...petForm, species: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raza</label>
                  <Input value={petForm.breed} onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Edad (meses)</label>
                  <Input
                    type="number"
                    min="0"
                    value={petForm.age_months}
                    onChange={(e) => setPetForm({ ...petForm, age_months: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={petForm.sex}
                    onChange={(e) => setPetForm({ ...petForm, sex: e.target.value })}
                  >
                    <option value="">Sin especificar</option>
                    <option value="M">Macho</option>
                    <option value="F">Hembra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={petForm.price}
                    onChange={(e) => setPetForm({ ...petForm, price: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <Input
                  value={petForm.description}
                  onChange={(e) => setPetForm({ ...petForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imágenes (URLs separadas por coma)
                </label>
                <Input
                  placeholder="https://.../foto1.jpg, https://.../foto2.jpg"
                  value={petForm.image_urls}
                  onChange={(e) => setPetForm({ ...petForm, image_urls: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                <select
                  required
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={petForm.branch_id}
                  onChange={(e) => setPetForm({ ...petForm, branch_id: e.target.value })}
                >
                  <option value="" disabled>
                    Selecciona...
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
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
          )}
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Eliminar ${deleting.type === 'product' ? 'insumo' : 'mascota'}`}
          message={`¿Seguro que quieres eliminar "${deleting.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          isLoading={saving}
        />
      )}
    </>
  );
}
