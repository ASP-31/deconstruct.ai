import { NextResponse } from 'next/server';
import { createPresignedUploadUrl, generateUploadKey } from '@/lib/r2';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

export async function POST(request: Request) {
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
    const uploadUrl = await createPresignedUploadUrl(key, contentType ?? 'application/zip');

    logger.info('presign', { message: 'Generated presigned URL', key });

    return NextResponse.json({
      uploadUrl,
      key,
      expiresIn: 3600,
    });
  } catch (err) {
    logger.error('presign', err);
    return NextResponse.json({ error: 'Failed to generate upload URL.' }, { status: 500 });
  }
}