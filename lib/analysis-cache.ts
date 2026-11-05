import type { AnalysisResult } from '@/types/analysis';

const STORAGE_KEY = 'deconstruct:analysis';

// Client-side navigation (router.push) keeps the JS runtime alive, so an
// in-memory copy always works. sessionStorage is a best-effort fallback for
// full page reloads and silently gives up when the quota (~5MB) is exceeded.
let memoryCache: AnalysisResult | null = null;

export function saveAnalysis(result: AnalysisResult): void {
  memoryCache = result;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // Payload too large for sessionStorage — the memory cache still covers
    // the immediate navigation to /workspace.
  }
}

export function loadAnalysis(): AnalysisResult | null {
  if (memoryCache) return memoryCache;

  // Storage can be entirely unavailable (Safari private mode, blocked cookies);
  // treat that as a cache miss rather than throwing.
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    memoryCache = (parsed as AnalysisResult) ?? null;
    return memoryCache;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearAnalysis(): void {
  memoryCache = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore — nothing cached means nothing to clear
  }
}
