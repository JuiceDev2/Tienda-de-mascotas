'use client';

import { useEffect, useState } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Branch {
  id: string;
  name: string;
}

export default function AdminReportsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    fetch('/api/branches')
      .then((res) => res.json())
      .then((body) => setBranches(body.data || []));
  }, []);

  const buildUrl = (format: 'pdf' | 'excel') => {
    const params = new URLSearchParams({ format });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (branchId) params.set('branchId', branchId);
    return `/api/reports/sales?${params.toString()}`;
  };

  const download = (format: 'pdf' | 'excel') => {
    window.location.href = buildUrl(format);
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reportes</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Reporte de ventas</h2>
        <p className="text-sm text-gray-600 mb-6">
          Incluye ventas totales, productos más vendidos, desempeño por vendedor y tendencia diaria.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
          <select
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => download('pdf')} variant="outline">
            <FileText className="w-4 h-4 mr-2" /> Descargar PDF
          </Button>
          <Button onClick={() => download('excel')} variant="outline">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Descargar Excel
          </Button>
        </div>
      </div>
    </>
  );
}
