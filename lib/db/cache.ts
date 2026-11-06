import 'server-only';
import { createHash } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { getDb, isDbConfigured } from './client';
import { analyses, uploads, usage } from './schema';
import { logger } from '../logger';
import type { ArchitectureBlueprint } from '@/types/analysis';

interface CodeFile {
  path: string;
  content: string;
}

/**
 * Deterministic hash over parsed source files (sorted path + content).
 * Ignores ZIP metadata/timestamps so re-uploads of the same code hit.
 */
export function hashCodebase(files: CodeFile[]): string {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const hash = createHash('sha256');
  for (const f of sorted) {
    hash.update(f.path);
    hash.update('\0');
    hash.update(String(f.content.length));
    hash.update(':');
    hash.update(f.content);
    hash.update('\0');
  }
  return hash.digest('hex');
}

/** Raw ZIP byte hash — same value the browser computes via crypto.subtle. */
export function hashFileBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export interface CachedAnalysis {
  blueprint: ArchitectureBlueprint;
  extractedFiles: CodeFile[] | null;
}

function isValidBlueprint(blueprint: unknown): blueprint is ArchitectureBlueprint {
  if (!blueprint || typeof blueprint !== 'object' || Array.isArray(blueprint)) return false;
  const b = blueprint as Record<string, unknown>;
  return (
    typeof b.projectOverview === 'string' &&
    Array.isArray(b.entryPoints) &&
    Array.isArray(b.slides) &&
    Array.isArray(b.quizzes)
  );
}

export async function getCachedBlueprint(codeHash: string): Promise<ArchitectureBlueprint | null> {
  const cached = await getCachedAnalysisByCodeHash(codeHash);
  return cached?.blueprint ?? null;
}

export async function getCachedAnalysisByCodeHash(codeHash: string): Promise<CachedAnalysis | null> {
  if (!isDbConfigured()) return null;
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select({ blueprint: analyses.blueprint, extractedFiles: analyses.extractedFiles })
      .from(analyses)
      .where(eq(analyses.codeHash, codeHash))
      .limit(1);
    const row = rows[0];
    if (!row || !isValidBlueprint(row.blueprint)) return null;
    const extractedFiles =
      Array.isArray(row.extractedFiles) &&
      (row.extractedFiles as CodeFile[]).every((f) => typeof f?.path === 'string' && typeof f?.content === 'string')
        ? (row.extractedFiles as CodeFile[])
        : null;
    return { blueprint: row.blueprint, extractedFiles };
  } catch (err) {
    logger.warn('db-cache', {
      message: 'cache read failed; continuing without cache',
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function getCachedAnalysisByFileHash(fileHash: string): Promise<CachedAnalysis | null> {
  if (!isDbConfigured()) return null;
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select({ blueprint: analyses.blueprint, extractedFiles: analyses.extractedFiles })
      .from(analyses)
      .where(eq(analyses.fileHash, fileHash))
      .limit(1);
    const row = rows[0];
    if (!row || !isValidBlueprint(row.blueprint)) return null;
    const extractedFiles =
      Array.isArray(row.extractedFiles) &&
      (row.extractedFiles as CodeFile[]).every((f) => typeof f?.path === 'string' && typeof f?.content === 'string')
        ? (row.extractedFiles as CodeFile[])
        : null;
    return { blueprint: row.blueprint, extractedFiles };
  } catch (err) {
    logger.warn('db-cache', {
      message: 'file-hash cache read failed; continuing without cache',
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function saveCachedBlueprint(
  codeHash: string,
  blueprint: ArchitectureBlueprint,
  model?: string,
  fileHash?: string,
  extractedFiles?: CodeFile[]
): Promise<void> {
  if (!isDbConfigured()) return;
  const db = getDb();
  if (!db) return;
  try {
    await db
      .insert(analyses)
      .values({
        codeHash,
        fileHash: fileHash ?? null,
        blueprint,
        extractedFiles: extractedFiles ?? null,
        model: model ?? null,
      })
      .onConflictDoUpdate({
        target: analyses.codeHash,
        set: {
          blueprint,
          extractedFiles: extractedFiles ?? undefined,
          fileHash: fileHash ?? undefined,
          model: model ?? null,
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    logger.warn('db-cache', {
      message: 'cache write failed (non-fatal)',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function logUpload(entry: {
  codeHash: string;
  fileName?: string | null;
  fileSize?: number | null;
  blobUrl?: string | null;
}): Promise<void> {
  if (!isDbConfigured()) return;
  const db = getDb();
  if (!db) return;
  try {
    await db.insert(uploads).values({
      codeHash: entry.codeHash,
      fileName: entry.fileName ?? null,
      fileSize: entry.fileSize ?? null,
      blobUrl: entry.blobUrl ?? null,
    });
  } catch (err) {
    logger.warn('db-log', {
      message: 'upload log failed (non-fatal)',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function bumpUsage(userKey: string): Promise<void> {
  if (!isDbConfigured()) return;
  const db = getDb();
  if (!db) return;
  try {
    const day = new Date().toISOString().slice(0, 10);
    await db
      .insert(usage)
      .values({ userKey: userKey.slice(0, 128), day, count: 1 })
      .onConflictDoUpdate({
        target: [usage.userKey, usage.day],
        set: { count: sql`${usage.count} + 1` },
      });
  } catch (err) {
    logger.warn('db-log', {
      message: 'usage bump failed (non-fatal)',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
