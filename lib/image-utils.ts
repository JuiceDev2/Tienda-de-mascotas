'use client';

/**
 * Resizes an image (down to maxWidth) and re-encodes it as WebP using the
 * canvas API. This runs entirely in the browser — no server-side image
 * library needed — and typically cuts a multi-MB phone photo down to a few
 * hundred KB before it ever leaves the device.
 */
export async function convertImageToWebP(
  file: File,
  { maxWidth = 1600, quality = 0.8 }: { maxWidth?: number; quality?: number } = {}
): Promise<{ blob: Blob; originalSize: number; convertedSize: number }> {
  const originalSize = file.size;

  const imageBitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / imageBitmap.width);
  const width = Math.round(imageBitmap.width * scale);
  const height = Math.round(imageBitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen en este navegador');
  ctx.drawImage(imageBitmap, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality)
  );

  if (!blob) {
    throw new Error('Este navegador no soporta la conversión a WebP');
  }

  return { blob, originalSize, convertedSize: blob.size };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
