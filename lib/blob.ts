import { put, del } from '@vercel/blob';

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export function generateUploadKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `uploads/${timestamp}-${random}.zip`;
}

export async function uploadToBlob(key: string, file: File): Promise<string> {
  if (!isBlobConfigured()) throw new Error('Vercel Blob not configured');

  const blob = await put(key, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  if (!isBlobConfigured()) throw new Error('Vercel Blob not configured');

  const token = process.env.BLOB_READ_WRITE_TOKEN!;
  const response = await fetch(`https://${token.split('_')[3]}.public.blob.vercel-storage.com/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch object');
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteObject(key: string): Promise<void> {
  if (!isBlobConfigured()) throw new Error('Vercel Blob not configured');

  await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
}

export function getPublicUrl(key: string): string | null {
  if (!isBlobConfigured()) return null;
  const token = process.env.BLOB_READ_WRITE_TOKEN!;
  return `https://${token.split('_')[3]}.public.blob.vercel-storage.com/${key}`;
}