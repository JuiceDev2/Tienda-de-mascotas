'use client';

import { useEffect, useState } from 'react';
import { useProducts, useCart, useDebounce } from '@/lib/hooks';
import { Header, ProductCard, PetCard, LoadingSpinner, Alert } from '@/components/shared';
import { Package, PawPrint } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  price: number;
  image_urls: string[];
}

export default function ClientStorePage() {
  const [view, setView] = useState<'productos' | 'mascotas'>('productos');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState(false);

  const { addItem } = useCart();

  useEffect(() => {
    fetch('/api/branches')
      .then((res) => res.json())
      .then((body) => {
        const list: Branch[] = body.data || [];
        setBranches(list);
        if (list.length > 0) {
          setBranchId(list[0].id);
        }
      })
      .catch(() => setBranches([]));
  }, []);

  const { products, isLoading, error } = useProducts({
    branchId,
    search: debouncedSearch || undefined,
    limit: 20,
  });

  useEffect(() => {
    if (view !== 'mascotas') return;
    setPetsLoading(true);
    setPetsError(false);
    fetch('/api/pets?limit=50')
      .then((res) => res.json())
      .then((body) => setPets(body.data?.data || []))
      .catch(() => setPetsError(true))
      .finally(() => setPetsLoading(false));
  }, [view]);

  const filteredPets = debouncedSearch
    ? pets.filter((p) => p.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : pets;

  const handleAddToCart = (productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    if (!product) return;

    addItem({
      productId: product.id,
      productName: product.name,
      price: product.selling_price,
      quantity: 1,
      image: product.image_urls?.[0],
    });

    setAddedMessage(`${product.name} agregado al carrito`);
    setTimeout(() => setAddedMessage(null), 2000);
  };

  const handleAddPetToCart = (petId: string) => {
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;

    addItem({
      productId: pet.id,
      productName: pet.name,
      price: pet.price,
      quantity: 1,
      image: pet.image_urls?.[0],
    });

    setAddedMessage(`${pet.name} agregado al carrito`);
    setTimeout(() => setAddedMessage(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showCart />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {view === 'productos' ? 'Nuestros productos' : 'Nuestras mascotas'}
          </h1>

          <div className="flex gap-3">
            {view === 'productos' && branches.length > 1 && (
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={view === 'productos' ? 'Buscar productos...' : 'Buscar mascotas...'}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm w-full sm:w-64"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('productos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              view === 'productos' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <Package className="w-4 h-4" /> Insumos
          </button>
          <button
            onClick={() => setView('mascotas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              view === 'mascotas' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <PawPrint className="w-4 h-4" /> Mascotas
          </button>
        </div>

        {addedMessage && (
          <div className="mb-4">
            <Alert type="success" message={addedMessage} />
          </div>
        )}

        {view === 'productos' ? (
          !branchId ? (
            <div className="text-center text-gray-500 py-16">
              No hay sucursales activas configuradas todavía.
            </div>
          ) : isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <Alert type="error" message="No se pudieron cargar los productos." />
          ) : products.length === 0 ? (
            <div className="text-center text-gray-500 py-16">No se encontraron productos.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
              ))}
            </div>
          )
        ) : petsLoading ? (
          <LoadingSpinner />
        ) : petsError ? (
          <Alert type="error" message="No se pudieron cargar las mascotas." />
        ) : filteredPets.length === 0 ? (
          <div className="text-center text-gray-500 py-16">No se encontraron mascotas disponibles.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPets.map((pet) => (
              <PetCard key={pet.id} pet={pet} onAddToCart={handleAddPetToCart} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
