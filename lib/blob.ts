import { del } from '@vercel/blob';

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export function generateUploadKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `uploads/${timestamp}-${random}.zip`;
}

export async function deleteObject(key: string): Promise<void> {
  if (!isBlobConfigured()) throw new Error('Vercel Blob not configured');
  await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
}