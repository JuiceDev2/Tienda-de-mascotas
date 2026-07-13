'use client';

import { useEffect, useState } from 'react';
import { DataTable, Modal, ConfirmDialog, Alert } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

const EMPTY_FORM = { name: '', description: '', display_order: 0 };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    const res = await fetch('/api/categories');
    const body = await res.json();
    setCategories(body.data || []);
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

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = editing ? `/api/categories/${editing.id}` : '/api/categories';
    const method = editing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
      await fetch(`/api/categories/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nueva categoría
        </Button>
      </div>

      <DataTable
        isLoading={isLoading}
        data={categories}
        columns={[
          { label: 'Nombre', key: 'name' },
          { label: 'Descripción', key: 'description', render: (v) => v || '—' },
          { label: 'Orden', key: 'display_order' },
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
        <Modal title={editing ? 'Editar categoría' : 'Nueva categoría'} onClose={() => setShowForm(false)}>
          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden de despliegue</label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
              />
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
          title="Eliminar categoría"
          message={`¿Seguro que quieres eliminar "${deleting.name}"? Los productos asociados no se eliminarán.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          isLoading={saving}
        />
      )}
    </>
  );
}
