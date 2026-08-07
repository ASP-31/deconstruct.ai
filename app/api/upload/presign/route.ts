import { NextResponse } from 'next/server';
import { createPresignedUploadUrl, generateUploadKey, isBlobConfigured } from '@/lib/blob';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

export async function POST(request: Request) {
  if (!isBlobConfigured()) {
    logger.error('presign', { message: 'Blob not configured', hasToken: !!process.env.BLOB_READ_WRITE_TOKEN });
    return NextResponse.json({ error: 'Storage not configured. Check BLOB_READ_WRITE_TOKEN.' }, { status: 503 });
  }

  const limit = rateLimit(request.headers, {
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
    const { contentType } = await request.json();
    if (contentType && !/(zip|octet-stream|application\/x-zip)/.test(contentType)) {
      return NextResponse.json({ error: 'Only .zip files allowed.' }, { status: 400 });
    }

    const key = generateUploadKey();
    const { uploadUrl, downloadUrl } = await createPresignedUploadUrl(key);

    logger.info('presign', { message: 'Generated presigned URL', key });

    return NextResponse.json({
      uploadUrl,
      key,
      downloadUrl,
      expiresIn: 3600,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('presign', { message: 'Presign failed', error: message });
    return NextResponse.json({ error: `Failed to generate upload URL: ${message}` }, { status: 500 });
  }
}