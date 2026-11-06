import 'server-only';
import { del, get } from '@vercel/blob';
import { logger } from './logger';

export const MAX_BLOB_BYTES = 500 * 1024 * 1024;

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function generateUploadKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `uploads/${timestamp}-${random}.zip`;
}

export function isBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.blob.vercel-storage.com') &&
      parsed.pathname.startsWith('/uploads/')
    );
  } catch {
    return false;
  }
}

export async function fetchBlobBuffer(url: string): Promise<Buffer> {
  if (!isBlobConfigured()) throw new Error('Vercel Blob not configured.');
  if (!isBlobUrl(url)) throw new Error('Invalid blob URL.');

  const result = await get(url, {
    access: 'private',
    token: process.env.BLOB_READ_WRITE_TOKEN,
    useCache: false,
  });
  if (!result || result.statusCode === 304 || !result.stream) {
    throw new Error('Failed to fetch uploaded file.');
  }
  if (result.blob.size > MAX_BLOB_BYTES) {
    throw new Error('Upload exceeds the 500MB limit.');
  }
  if (!result.blob.pathname.toLowerCase().endsWith('.zip')) {
    throw new Error('Only .zip archives are allowed.');
  }

  const chunks: Buffer[] = [];
  let total = 0;
  const reader = result.stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BLOB_BYTES) {
      await reader.cancel();
      throw new Error('Upload exceeds the 500MB limit.');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function deleteBlob(url: string): Promise<void> {
  if (!isBlobConfigured()) return;
  if (!isBlobUrl(url)) return;
  try {
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch (err) {
    // Best-effort cleanup — temp blobs must not break the request.
    logger.warn('blob', { message: 'Failed to delete temp blob', error: err instanceof Error ? err.message : String(err) });
  }
}
