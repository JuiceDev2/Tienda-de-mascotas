'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PawPrint, LogIn, ChevronLeft, ChevronRight, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { useCart } from '@/lib/hooks';

interface Company {
  name: string;
  logo_url: string | null;
  hero_image_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_cta_text: string | null;
  hero_cta_url: string | null;
}

interface PetCard {
  id: string;
  name: string;
  species: string;
  price: number;
  image_urls: string[];
}

interface ProductCard {
  id: string;
  name: string;
  selling_price: number;
  image_urls: string[];
}

function Carousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => scroll('left')}
        aria-label="Anterior"
        className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md items-center justify-center text-gray-500 hover:text-gray-900"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-2 no-scrollbar">
        {children}
      </div>
      <button
        onClick={() => scroll('right')}
        aria-label="Siguiente"
        className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-md items-center justify-center text-gray-500 hover:text-gray-900"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function Card({
  image,
  title,
  price,
  onAdd,
}: {
  image: string | undefined;
  title: string;
  price: number;
  onAdd: () => void;
}) {
  return (
    <div className="flex-shrink-0 w-44 sm:w-48 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="relative w-full aspect-square bg-gray-100">
        {image ? (
          <Image src={image} alt={title} fill sizes="200px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <PawPrint className="w-8 h-8" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
        <p className="text-sm text-gray-600 mb-2">${price.toFixed(2)}</p>
        <button
          onClick={onAdd}
          className="w-full text-xs font-bold uppercase tracking-wide bg-blue-600 hover:bg-blue-700 text-white rounded-full py-2 transition-colors"
        >
          Añadir al carrito
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [pets, setPets] = useState<PetCard[]>([]);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const { addItem, itemCount } = useCart();

  useEffect(() => {
    fetch('/api/company')
      .then((res) => res.json())
      .then((body) => setCompany(body.data));

    fetch('/api/pets?limit=12')
      .then((res) => res.json())
      .then((body) => setPets(body.data?.data || []));

    fetch('/api/products?limit=12')
      .then((res) => res.json())
      .then((body) => setProducts(body.data?.data || []));
  }, []);

  const storeName = company?.name || 'PetShop';

  return (
    <div className="min-h-screen bg-sky-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-sky-50/90 backdrop-blur border-b border-sky-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
            <PawPrint className="w-6 h-6 text-blue-600" />
            {storeName.toUpperCase()}
          </Link>

          <nav className="hidden md:flex items-center gap-3">
            <Link
              href="/client"
              className="px-6 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-colors"
            >
              PRODUCTOS
            </Link>
            <Link
              href="#mascotas"
              className="px-6 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-colors"
            >
              MASCOTAS
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {itemCount > 0 && (
              <Link href="/client/cart" className="text-sm font-semibold text-gray-700">
                🛒 {itemCount}
              </Link>
            )}
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <LogIn className="w-4 h-4" /> Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-14">
        {/* Hero */}
        <section className="relative rounded-2xl overflow-hidden bg-gray-900" style={{ aspectRatio: '21 / 9' }}>
          {company?.hero_image_url && (
            <Image
              src={company.hero_image_url}
              alt={company.hero_title || 'Banner'}
              fill
              priority
              sizes="(max-width: 1152px) 100vw, 1152px"
              className="object-cover opacity-80"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
          <div className="relative h-full flex flex-col justify-center px-6 sm:px-12 max-w-xl">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">
              {company?.hero_title || '¡Sumérgete en el mundo de las mascotas!'}
            </h1>
            <p className="text-sm sm:text-base text-white/90 mb-6">
              {company?.hero_subtitle ||
                'Encuentra los mejores productos y compañeros para tu hogar.'}
            </p>
            <Link
              href={company?.hero_cta_url || '/client'}
              className="inline-block w-fit bg-white hover:bg-gray-100 text-gray-900 font-bold text-sm uppercase tracking-wide px-6 py-3 rounded-full transition-colors"
            >
              {company?.hero_cta_text || 'Explorar ahora'}
            </Link>
          </div>
        </section>

        {/* Pets */}
        <section id="mascotas">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-5 text-center uppercase tracking-wide">
            Encuentra tus nuevas mascotas
          </h2>
          {pets.length > 0 ? (
            <Carousel>
              {pets.map((pet) => (
                <Card
                  key={pet.id}
                  image={pet.image_urls?.[0]}
                  title={pet.name}
                  price={pet.price}
                  onAdd={() =>
                    addItem({
                      productId: pet.id,
                      productName: pet.name,
                      price: pet.price,
                      quantity: 1,
                      image: pet.image_urls?.[0],
                    })
                  }
                />
              ))}
            </Carousel>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Todavía no hay mascotas disponibles en el catálogo.
            </p>
          )}
        </section>

        {/* Products */}
        <section id="productos">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-5 text-center uppercase tracking-wide">
            Insumos y accesorios esenciales
          </h2>
          {products.length > 0 ? (
            <Carousel>
              {products.map((product) => (
                <Card
                  key={product.id}
                  image={product.image_urls?.[0]}
                  title={product.name}
                  price={product.selling_price}
                  onAdd={() =>
                    addItem({
                      productId: product.id,
                      productName: product.name,
                      price: product.selling_price,
                      quantity: 1,
                      image: product.image_urls?.[0],
                    })
                  }
                />
              ))}
            </Carousel>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Todavía no hay productos publicados.
            </p>
          )}
        </section>
      </main>

      <footer className="border-t border-sky-100 mt-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-6 text-sm text-gray-600">
            <Link href="#contacto" className="hover:text-gray-900">Contáctanos</Link>
            <Link href="#nosotros" className="hover:text-gray-900">Sobre Nosotros</Link>
          </div>
          <div className="flex gap-4 text-gray-500">
            <Facebook className="w-4 h-4" />
            <Twitter className="w-4 h-4" />
            <Instagram className="w-4 h-4" />
            <Youtube className="w-4 h-4" />
          </div>
        </div>
      </footer>
    </div>
  );
}
