import { NextResponse } from 'next/server';
import { parseProjectZip, UnsafeArchiveError } from '@/lib/codeParser';
import { generateAnalysisText } from '@/lib/gemini';
import { getRequiredEnv, hasEnv } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { deleteBlob, fetchBlobBuffer, isBlobUrl, MAX_BLOB_BYTES } from '@/lib/blob';
import { bumpUsage, getCachedAnalysisByCodeHash, hashCodebase, hashFileBuffer, logUpload, saveCachedBlueprint } from '@/lib/db/cache';
import { ANALYSIS_MODELS } from '@/lib/gemini';
import { buildPrompt, buildSystemPrompt } from '@/lib/prompt';
import {
  detectPromptInjection,
} from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

let apiKeyBootstrapped = false;

function ensureApiKey(): void {
  if (apiKeyBootstrapped) return;
  if (!hasEnv('GEMINI_API_KEY')) {
    throw new Error('Missing GEMINI_API_KEY server configuration.');
  }
  getRequiredEnv('GEMINI_API_KEY');
  apiKeyBootstrapped = true;
}

function clientError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isAcceptableFile(file: File): boolean {
  if (file.size === 0) return false;
  if (file.size > MAX_REQUEST_BYTES) return false;
  const name = file.name.toLowerCase();
  if (!name.endsWith('.zip')) return false;
  const type = file.type.toLowerCase();
  if (type && !/(zip|octet-stream|application\/x-zip)/.test(type)) return false;
  return true;
}

function publicError(err: unknown): { status: number; message: string } {
  if (err instanceof UnsafeArchiveError) {
    return { status: 400, message: err.message };
  }
  if (err instanceof Error) {
    if (err.name === 'AbortError') return { status: 499, message: 'Request aborted.' };
    if (err.message.includes('API key')) return { status: 503, message: 'Service unavailable.' };
    if (/fetch failed|ECONN|UND_ERR|timeout|timed out|deadline|network/i.test(err.message)) {
      return {
        status: 503,
        message:
          'The AI backend is temporarily unreachable. Please wait a moment and try again.',
      };
    }
    if (err.message.includes('Blob not configured')) {
      return { status: 503, message: 'Storage not configured for large uploads. Use a ZIP under 4MB.' };
    }
    if (/PerDay|RESOURCE_EXHAUSTED|check your plan and billing/i.test(err.message)) {
      return {
        status: 429,
        message:
          'Daily AI analysis quota exhausted. Free tier allows 20 analyses per day — try again tomorrow or upgrade the Gemini API plan.',
      };
    }
    if (/truncated|MAX_TOKENS/i.test(err.message)) {
      return {
        status: 422,
        message:
          'The codebase snapshot was too large for a single AI response. Try trimming large generated files from the archive.',
      };
    }
    if (
      /\b(429|500|502|503|504)\b|UNAVAILABLE|overloaded|high demand|rate.?limit/i.test(
        err.message
      )
    ) {
      return {
        status: 503,
        message:
          'The AI backend is temporarily overloaded. Please wait a moment and try again.',
      };
    }
  }
  return { status: 500, message: 'Failed to analyze project architecture.' };
}

export async function POST(request: Request) {
  const limit = await rateLimit(request.headers, {
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    keyPrefix: 'analyze',
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(limit.resetMs / 1000).toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  let blobUrlToCleanup: string | null = null;
  let uploadFileName: string | null = null;

  try {
    ensureApiKey();

    const contentType = request.headers.get('content-type') ?? '';
    let buffer: Buffer;

    if (contentType.toLowerCase().includes('application/json')) {
      const body = await request.json().catch(() => null);
      const blobUrl = typeof body?.blobUrl === 'string' ? body.blobUrl : null;
      if (!blobUrl || !isBlobUrl(blobUrl)) {
        return clientError('Invalid blob URL. Upload the file first, then analyze it.');
      }
      blobUrlToCleanup = blobUrl;
      logger.info('analyze', { message: 'Fetching blob for analysis', blobUrl });
      buffer = await fetchBlobBuffer(blobUrl);
      if (buffer.byteLength > MAX_BLOB_BYTES) {
        return clientError('Upload exceeds the 500MB limit.');
      }
    } else if (contentType.toLowerCase().includes('multipart/form-data')) {
      const contentLengthHeader = request.headers.get('content-length');
      if (contentLengthHeader && Number(contentLengthHeader) > MAX_REQUEST_BYTES) {
        return clientError('Upload exceeds the 4MB direct limit. Larger files upload via Blob first.');
      }

      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        return clientError('Could not parse the uploaded form data.');
      }

      const file = formData.get('file');
      if (!(file instanceof File)) {
        return clientError('No project archive file provided.');
      }
      uploadFileName = file.name || null;
      if (!isAcceptableFile(file)) {
        return clientError('Please upload a non-empty .zip archive under 4MB.');
      }

      const arrayBuffer = await file.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_REQUEST_BYTES) {
        return clientError('Upload exceeds the 4MB limit (Vercel free tier).');
      }
      buffer = Buffer.from(arrayBuffer);
    } else {
      return clientError('Expected a multipart/form-data or JSON request.');
    }

    const t0 = Date.now();
    const { fileTree, files } = await parseProjectZip(buffer);
    const parseMs = Date.now() - t0;

    if (files.length === 0) {
      return clientError('No parseable source files found in the archive.');
    }

    // Layer 2 cache: same code → skip Gemini entirely.
    const codeHash = hashCodebase(files);
    const fileHash = hashFileBuffer(buffer);
    const forwarded = request.headers.get('x-forwarded-for');
    const userKey = (forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown').slice(0, 128);
    void bumpUsage(`analyze:${userKey}`);
    void logUpload({ codeHash, fileName: uploadFileName, fileSize: buffer.byteLength, blobUrl: blobUrlToCleanup });

    const cached = await getCachedAnalysisByCodeHash(codeHash);
    if (cached) {
      const extracted = cached.extractedFiles ?? files;
      logger.info('analyze', { message: 'Cache hit — skipping Gemini', codeHash: codeHash.slice(0, 12), files: files.length, parseMs });
      return NextResponse.json(
        { blueprint: cached.blueprint, extractedFiles: extracted, cached: true },
        {
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'X-Cache-Hit': 'true',
          },
        }
      );
    }

    const { userPrompt, promptChars, includedFiles, totalFiles } = buildPrompt(files, fileTree);
    const systemPrompt = buildSystemPrompt();

    // Prompt-injection markers are logged for review but never reject the
    // upload: the same phrases appear in legitimate security tooling and test
    // code, and the untrusted-data trailers below make injection harmless.
    if (detectPromptInjection(userPrompt)) {
      logger.warn('analyze', 'Upload contains suspected prompt-injection content; proceeding with hardened prompt.');
    }

    logger.info('analyze', {
      message: 'Calling Gemini',
      parseMs,
      promptChars,
      includedFiles,
      totalFiles,
      bufferBytes: buffer.byteLength,
    });

    const tGen = Date.now();
    const responseText = await generateAnalysisText({
      systemInstruction: systemPrompt,
      userPrompt,
    });
    const geminiMs = Date.now() - tGen;
    logger.info('analyze', { message: 'Gemini done', geminiMs, parseMs, totalMs: Date.now() - t0 });

    const architectureBlueprint = JSON.parse(responseText);
    validateBlueprint(architectureBlueprint, files);
    void saveCachedBlueprint(codeHash, architectureBlueprint, ANALYSIS_MODELS[0], fileHash, files);

    return NextResponse.json(
      { blueprint: architectureBlueprint, extractedFiles: files, cached: false },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Cache-Hit': 'false',
        },
      }
    );
  } catch (err) {
    logger.error('analyze', err);
    const { status, message } = publicError(err);
    return NextResponse.json({ error: message }, { status });
  } finally {
    if (blobUrlToCleanup) {
      await deleteBlob(blobUrlToCleanup);
    }
  }
}

function validateBlueprint(
  blueprint: unknown,
  files: Array<{ path: string; content: string }>
): asserts blueprint is import('@/types/analysis').ArchitectureBlueprint {
  if (!blueprint || typeof blueprint !== 'object') {
    throw new Error('Invalid blueprint payload.');
  }
  const candidate = blueprint as Record<string, unknown>;
  if (typeof candidate.projectOverview !== 'string') throw new Error('Invalid projectOverview.');
  if (!Array.isArray(candidate.entryPoints)) throw new Error('Invalid entryPoints.');
  if (!Array.isArray(candidate.slides)) throw new Error('Invalid slides.');
  if (!Array.isArray(candidate.quizzes)) throw new Error('Invalid quizzes.');

  const filePaths = new Set(files.map((file) => file.path));
  const fileLineCounts = new Map(files.map((file) => [file.path, file.content.split('\n').length]));

  for (const slide of candidate.slides as Array<Record<string, unknown>>) {
    if (typeof slide.targetFile === 'string') {
      if (!filePaths.has(slide.targetFile)) {
        slide.targetFile = matchClosestFile(slide.targetFile, filePaths);
      }
      const total = fileLineCounts.get(slide.targetFile as string) ?? 0;
      const start = Number(slide.startLine) || 1;
      const end = Number(slide.endLine) || Math.min(total, start + 50);
      const safeStart = Math.max(1, Math.min(start, total || 1));
      slide.startLine = safeStart;
      slide.endLine = Math.max(safeStart, Math.min(end, total || safeStart));
    }
  }

  // Quizzes are repaired defensively: incomplete or malformed questions are
  // dropped, and any answer index outside the options list is clamped so the
  // UI never renders an impossible or empty quiz card.
  const quizzes = candidate.quizzes as Array<Record<string, unknown>>;
  candidate.quizzes = quizzes.filter(
    (quiz) =>
      typeof quiz.question === 'string' &&
      typeof quiz.explanation === 'string' &&
      Array.isArray(quiz.options) &&
      quiz.options.length >= 2 &&
      quiz.options.every((option) => typeof option === 'string' && option.trim().length > 0)
  );
  for (const quiz of candidate.quizzes as Array<Record<string, unknown>>) {
    const maxIndex = (quiz.options as string[]).length - 1;
    if (
      typeof quiz.correctAnswerIndex !== 'number' ||
      !Number.isInteger(quiz.correctAnswerIndex) ||
      quiz.correctAnswerIndex < 0 ||
      quiz.correctAnswerIndex > maxIndex
    ) {
      quiz.correctAnswerIndex = 0;
    }
  }
}

function matchClosestFile(target: string, filePaths: Set<string>): string {
  if (filePaths.has(target)) return target;
  const lowered = target.toLowerCase();
  for (const path of filePaths) {
    if (path.toLowerCase() === lowered) return path;
  }
  const basename = lowered.split('/').pop() ?? lowered;
  for (const path of filePaths) {
    if (path.toLowerCase().endsWith(basename)) return path;
  }
  return target;
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
