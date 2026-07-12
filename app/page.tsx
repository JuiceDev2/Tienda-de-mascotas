import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">🐾 PetShop ERP/POS</h1>
        <p className="text-xl text-gray-600 mb-8">Sistema integral de gestión para tiendas de mascotas</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link
            href="/client"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            🛒 Cliente - Comprar
          </Link>
          <Link
            href="/admin"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            📊 Admin - Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 text-left mb-8">
          <h2 className="text-2xl font-bold mb-4">Características</h2>
          <ul className="space-y-2 text-gray-700">
            <li>✅ Multi-tenant con empresas y sucursales</li>
            <li>✅ Gestión de inventario inteligente</li>
            <li>✅ Sistema POS integrado</li>
            <li>✅ Notificaciones push</li>
            <li>✅ PWA instalable</li>
            <li>✅ Reportes PDF y Excel</li>
            <li>✅ Control de acceso por roles</li>
            <li>✅ Auditoría completa</li>
          </ul>
        </div>

        <div className="text-sm text-gray-600">
          <p>Para más información, lee <strong>README.md</strong> o <strong>DEPLOYMENT_GUIDE.md</strong></p>
        </div>
      </div>
    </div>
  );
}
