'use client';

import { useEffect, useState } from 'react';
import { DataTable, Modal, ConfirmDialog, Alert } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string | null;
  city: string | null;
  is_active: boolean;
}

const EMPTY_FORM = {
  name: '',
  code: '',
  address: '',
  phone: '',
  city: '',
  manager_name: '',
  opening_time: '',
  closing_time: '',
};

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleting, setDeleting] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    const res = await fetch('/api/branches');
    const body = await res.json();
    setBranches(body.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (branch: any) => {
    setEditing(branch);
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone || '',
      city: branch.city || '',
      manager_name: branch.manager_name || '',
      opening_time: branch.opening_time || '',
      closing_time: branch.closing_time || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = editing ? `/api/branches/${editing.id}` : '/api/branches';
    const method = editing ? 'PUT' : 'POST';

    const payload = {
      ...form,
      phone: form.phone || undefined,
      city: form.city || undefined,
      manager_name: form.manager_name || undefined,
      opening_time: form.opening_time || undefined,
      closing_time: form.closing_time || undefined,
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
      await fetch(`/api/branches/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sucursales</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nueva sucursal
        </Button>
      </div>

      <DataTable
        isLoading={isLoading}
        data={branches}
        columns={[
          { label: 'Nombre', key: 'name' },
          { label: 'Código', key: 'code' },
          { label: 'Dirección', key: 'address' },
          { label: 'Ciudad', key: 'city', render: (v) => v || '—' },
          {
            label: 'Estado',
            key: 'is_active',
            render: (v) => (
              <span className={v ? 'text-green-600' : 'text-gray-400'}>
                {v ? 'Activa' : 'Inactiva'}
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
        <Modal title={editing ? 'Editar sucursal' : 'Nueva sucursal'} onClose={() => setShowForm(false)}>
          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Encargado</label>
              <Input
                value={form.manager_name}
                onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora apertura (HH:mm)</label>
                <Input
                  placeholder="09:00"
                  value={form.opening_time}
                  onChange={(e) => setForm({ ...form, opening_time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora cierre (HH:mm)</label>
                <Input
                  placeholder="19:00"
                  value={form.closing_time}
                  onChange={(e) => setForm({ ...form, closing_time: e.target.value })}
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
          title="Eliminar sucursal"
          message={`¿Seguro que quieres desactivar "${deleting.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          isLoading={saving}
        />
      )}
    </>
  );
}
