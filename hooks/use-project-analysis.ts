'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  // A ref (not state) so abort/cleanup always targets the latest request
  // even if `analyze` is invoked twice within one render cycle.
  const controllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState({ status: 'idle', data: null, error: null });
  }, []);

  const analyze = useCallback(async (file: File) => {
    controllerRef.current?.abort();
    const next = new AbortController();
    controllerRef.current = next;
    setState({ status: 'loading', data: null, error: null });

    try {
      const data = await analyzeProjectArchive(file, next.signal);
      if (controllerRef.current === next) {
        setState({ status: 'success', data, error: null });
      }
      return data;
    } catch (err) {
      if (controllerRef.current === next && (err as Error).name !== 'AbortError') {
        setState({
          status: 'error',
          data: null,
          error: (err as Error).message ?? 'Unknown error',
        });
      }
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  return { ...state, analyze, reset };
}
