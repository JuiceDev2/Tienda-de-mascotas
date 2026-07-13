'use client';

import { useEffect, useState } from 'react';
import { DataTable, Modal, ConfirmDialog, Alert } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, UserX } from 'lucide-react';

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  branch_id: string | null;
  is_active: boolean;
}

interface Branch {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  role: 'seller',
  branch_id: '',
  password: '',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deactivating, setDeactivating] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    const [usersRes, branchesRes] = await Promise.all([
      fetch('/api/users?limit=100'),
      fetch('/api/branches'),
    ]);
    const usersBody = await usersRes.json();
    const branchesBody = await branchesRes.json();
    setUsers(usersBody.data?.data || []);
    setBranches(branchesBody.data || []);
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

  const openEdit = (user: UserRow) => {
    setEditing(user);
    setForm({
      full_name: user.full_name,
      email: user.email,
      phone: '',
      role: user.role,
      branch_id: user.branch_id || '',
      password: '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editing) {
        const res = await fetch(`/api/users/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: form.full_name,
            role: form.role,
            branch_id: form.branch_id || null,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Error al guardar');
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: form.full_name,
            email: form.email,
            phone: form.phone || undefined,
            role: form.role,
            branch_id: form.branch_id || undefined,
            password: form.password,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Error al crear usuario');
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivating) return;
    setSaving(true);
    try {
      await fetch(`/api/users/${deactivating.id}`, { method: 'DELETE' });
      setDeactivating(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    seller: 'Vendedor',
    client: 'Cliente',
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo usuario
        </Button>
      </div>

      <DataTable
        isLoading={isLoading}
        data={users}
        columns={[
          { label: 'Nombre', key: 'full_name' },
          { label: 'Correo', key: 'email' },
          { label: 'Rol', key: 'role', render: (v) => roleLabel[v] || v },
          {
            label: 'Sucursal',
            key: 'branch_id',
            render: (v) => branches.find((b) => b.id === v)?.name || '—',
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
                {row.is_active && (
                  <button onClick={() => setDeactivating(row)} className="text-red-600 hover:text-red-800">
                    <UserX className="w-4 h-4" />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      {showForm && (
        <Modal title={editing ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setShowForm(false)}>
          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <Input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <Input
                type="email"
                required
                disabled={!!editing}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            {!editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="seller">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                <select
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                >
                  <option value="">Sin asignar</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
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

      {deactivating && (
        <ConfirmDialog
          title="Desactivar usuario"
          message={`¿Seguro que quieres desactivar a "${deactivating.full_name}"? No podrá iniciar sesión.`}
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivating(null)}
          isLoading={saving}
        />
      )}
    </>
  );
}
