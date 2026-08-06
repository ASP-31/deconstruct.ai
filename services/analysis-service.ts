import type { AnalysisResult, AnalysisError } from '@/types/analysis';

export async function analyzeProjectArchive(
  file: File,
  signal?: AbortSignal
): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    body: formData,
    signal,
  });

  const payload = (await response.json()) as AnalysisResult | AnalysisError;

  if (!response.ok || 'error' in payload) {
    const message = 'error' in payload ? payload.error : 'Analysis failed';
    const details = 'details' in payload ? payload.details : undefined;
    throw new Error(details ? `${message}: ${details}` : message);
  }

  return payload as AnalysisResult;
}
