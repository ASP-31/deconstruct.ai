'use client';

import { useCallback, useEffect, useState } from 'react';
import { analyzeProjectArchive } from '@/services/analysis-service';
import type { AnalysisResult } from '@/types/analysis';

interface State {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: AnalysisResult | null;
  error: string | null;
}

export function useProjectAnalysis() {
  const [state, setState] = useState<State>({
    status: 'idle',
    data: null,
    error: null,
  });
  const [controller, setController] = useState<AbortController | null>(null);

  const reset = useCallback(() => {
    controller?.abort();
    setState({ status: 'idle', data: null, error: null });
  }, [controller]);

  const analyze = useCallback(async (file: File) => {
    controller?.abort();
    const next = new AbortController();
    setController(next);
    setState({ status: 'loading', data: null, error: null });

    try {
      const data = await analyzeProjectArchive(file, next.signal);
      setState({ status: 'success', data, error: null });
      return data;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return null;
      setState({
        status: 'error',
        data: null,
        error: (err as Error).message ?? 'Unknown error',
      });
      return null;
    }
  }, [controller]);

  useEffect(() => {
    return () => controller?.abort();
  }, [controller]);

  return { ...state, analyze, reset };
}
