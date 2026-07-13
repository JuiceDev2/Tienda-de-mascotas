'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { convertImageToWebP, formatBytes } from '@/lib/image-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/shared';
import { UploadCloud } from 'lucide-react';

interface CompanySettings {
  id: string;
  hero_image_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_cta_text: string | null;
  hero_cta_url: string | null;
}

export default function AdminSettingsPage() {
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [sizes, setSizes] = useState<{ original: number; converted: number } | null>(null);
  const [form, setForm] = useState({
    hero_title: '',
    hero_subtitle: '',
    hero_cta_text: '',
    hero_cta_url: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/company')
      .then((res) => res.json())
      .then((body) => {
        const c = body.data;
        setCompany(c);
        if (c) {
          setForm({
            hero_title: c.hero_title || '',
            hero_subtitle: c.hero_subtitle || '',
            hero_cta_text: c.hero_cta_text || '',
            hero_cta_url: c.hero_cta_url || '',
          });
          setPreviewUrl(c.hero_image_url);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsConverting(true);
    try {
      const { blob, originalSize, convertedSize } = await convertImageToWebP(file, {
        maxWidth: 1920,
        quality: 0.82,
      });
      setPendingBlob(blob);
      setSizes({ original: originalSize, converted: convertedSize });
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setError(err.message || 'No se pudo procesar la imagen');
    } finally {
      setIsConverting(false);
    }
  };

  const handleSave = async () => {
    if (!company) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let heroImageUrl = company.hero_image_url;

      if (pendingBlob) {
        const supabase = createClient();
        const path = `hero/${company.id}-${Date.now()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('public-assets')
          .upload(path, pendingBlob, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (uploadError) throw new Error(uploadError.message);

        const { data: publicUrlData } = supabase.storage
          .from('public-assets')
          .getPublicUrl(path);
        heroImageUrl = publicUrlData.publicUrl;
      }

      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, hero_image_url: heroImageUrl }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error al guardar');

      setCompany(body.data);
      setPendingBlob(null);
      setSuccess('Banner actualizado. Ya se ve en el landing page.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-gray-500">Cargando...</p>;
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Banner del landing page</h1>

      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert type="success" message={success} onClose={() => setSuccess(null)} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 max-w-3xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Imagen de fondo</label>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative cursor-pointer rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors overflow-hidden bg-gray-900"
            style={{ aspectRatio: '21 / 9' }}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Vista previa del banner" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <UploadCloud className="w-8 h-8" />
                <span className="text-sm">Haz clic para subir una imagen</span>
              </div>
            )}
            {isConverting && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm">
                Convirtiendo a WebP...
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Se convierte automáticamente a WebP y se redimensiona (máx. 1920px) para que cargue rápido.
            </p>
            {sizes && (
              <p className="text-xs text-gray-500">
                {formatBytes(sizes.original)} → <span className="font-medium text-green-600">{formatBytes(sizes.converted)}</span>
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
          <Input
            value={form.hero_title}
            onChange={(e) => setForm({ ...form, hero_title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
          <Input
            value={form.hero_subtitle}
            onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto del botón</label>
            <Input
              value={form.hero_cta_text}
              onChange={(e) => setForm({ ...form, hero_cta_text: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enlace del botón</label>
            <Input
              value={form.hero_cta_url}
              onChange={(e) => setForm({ ...form, hero_cta_url: e.target.value })}
              placeholder="/client"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || isConverting}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </>
  );
}
