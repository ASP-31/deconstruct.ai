'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { ArrowUpFromLine, FileArchive, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AnalysisResult } from '@/types/analysis';

interface UploadZoneProps {
  compact?: boolean;
  className?: string;
}

const MAX_BYTES = 500 * 1024 * 1024;

export function UploadZone({ compact = false, className }: UploadZoneProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('Please upload a .zip archive of your project.');
        return;
      }
      if (file.size === 0 || file.size > MAX_BYTES) {
        setError('Archive must be a non-empty .zip under 500MB.');
        return;
      }

      setLoading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload/complete', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Analysis failed');

        const result: AnalysisResult = data;
        sessionStorage.setItem('deconstruct:analysis', JSON.stringify(result));
        router.push('/workspace');
      } catch (err) {
        setError((err as Error).message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          'group relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/40 p-8 text-center transition-all',
          isDragging && 'border-sky-400/80 bg-sky-500/5',
          compact ? 'p-5' : 'p-10',
          loading && 'pointer-events-none opacity-70'
        )}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-sky-500/10 text-sky-400">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUpFromLine className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm font-medium">
            {loading ? 'Analyzing your project…' : 'Drop your project ZIP here'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse — we filter out node_modules, .git, build outputs, and binaries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            <FileArchive className="h-4 w-4" />
            Select ZIP
          </Button>
          <span className="text-xs text-muted-foreground">Up to 500MB</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {isDragging && <div className="absolute inset-0 rounded-2xl ring-2 ring-sky-400/40" />}
        <Sparkles className="pointer-events-none absolute right-4 top-4 h-4 w-4 text-sky-400/60" />
      </div>
      {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}