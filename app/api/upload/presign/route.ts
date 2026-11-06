import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { isBlobConfigured, MAX_BLOB_BYTES } from '@/lib/blob';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

export async function POST(request: Request) {
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: 'Storage not configured. Check BLOB_READ_WRITE_TOKEN.' },
      { status: 503 }
    );
  }

  const limit = await rateLimit(request.headers, {
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    keyPrefix: 'presign',
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(limit.resetMs / 1000).toString(),
        },
      }
    );
  }

  try {
    const body = await request.json();

    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.toLowerCase().endsWith('.zip')) {
          throw new Error('Only .zip files allowed.');
        }
        if (!pathname.startsWith('uploads/')) {
          throw new Error('Invalid upload pathname.');
        }
        return {
          allowedContentTypes: [
            'application/zip',
            'application/x-zip-compressed',
            'application/octet-stream',
          ],
          maximumSizeInBytes: MAX_BLOB_BYTES,
          validUntil: Date.now() + 60 * 60 * 1000,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('presign', { message: 'Presign failed', error: message });
    return NextResponse.json({ error: `Failed to generate upload URL: ${message}` }, { status: 500 });
  }
}
