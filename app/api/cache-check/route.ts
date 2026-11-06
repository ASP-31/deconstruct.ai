import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getCachedAnalysisByFileHash } from '@/lib/db/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

const FILE_HASH_RE = /^[a-f0-9]{64}$/i;

export async function POST(request: Request) {
  const limit = await rateLimit(request.headers, {
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    keyPrefix: 'cache-check',
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { hit: false, error: 'Too many requests. Please slow down.' },
      {
        status: 429,
        headers: { 'Retry-After': Math.ceil(limit.resetMs / 1000).toString() },
      }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const fileHash = typeof body?.fileHash === 'string' ? body.fileHash.toLowerCase() : null;
    if (!fileHash || !FILE_HASH_RE.test(fileHash)) {
      return NextResponse.json({ hit: false });
    }

    const cached = await getCachedAnalysisByFileHash(fileHash);
    if (!cached) {
      return NextResponse.json({ hit: false });
    }

    logger.info('cache-check', { message: 'Hit', fileHash: fileHash.slice(0, 12) });
    return NextResponse.json({
      hit: true,
      blueprint: cached.blueprint,
      extractedFiles: cached.extractedFiles,
    });
  } catch (err) {
    logger.warn('cache-check', { message: 'Failed; failing open', error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ hit: false });
  }
}
