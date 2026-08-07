import { put, del } from '@vercel/blob';

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export function generateUploadKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `uploads/${timestamp}-${random}.zip`;
}

export interface PresignResult {
  uploadUrl: string;
  key: string;
  downloadUrl: string;
}

export async function createPresignedUploadUrl(key: string): Promise<PresignResult> {
  if (!isBlobConfigured()) throw new Error('Vercel Blob not configured');

  // For private stores, multipart upload returns a different structure
  // Use put with multipart: true - it returns { url, uploadUrl } for multipart
  const result = await put(key, new ReadableStream(), {
    access: 'private',
    token: process.env.BLOB_READ_WRITE_TOKEN,
    multipart: true,
  });

  // Handle both possible response formats
  const uploadUrl = (result as { uploadUrl?: string; url: string }).uploadUrl;
  const downloadUrl = (result as { url: string }).url;

  if (!uploadUrl) {
    throw new Error('Vercel Blob did not return uploadUrl for multipart upload. Check store configuration.');
  }

  return { uploadUrl, key, downloadUrl };
}

export async function getObjectBuffer(downloadUrl: string): Promise<Buffer> {
  if (!isBlobConfigured()) throw new Error('Vercel Blob not configured');

  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error('Failed to fetch object');
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteObject(key: string): Promise<void> {
  if (!isBlobConfigured()) throw new Error('Vercel Blob not configured');

  await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
}

export function getPublicUrl(key: string): string | null {
  return null;
}