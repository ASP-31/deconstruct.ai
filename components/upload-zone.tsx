'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpFromLine, FileArchive, Loader2, Sparkles } from 'lucide-react';
import { upload } from '@vercel/blob/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { saveAnalysis } from '@/lib/analysis-cache';

interface UploadZoneProps {
  compact?: boolean;
  className?: string;
}

const MAX_BYTES = 500 * 1024 * 1024;
const DIRECT_LIMIT = 4 * 1024 * 1024;

export function UploadZone({ compact = false, className }: UploadZoneProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const requestAnalysis = useCallback(
    async (init: RequestInit, label: string) => {
      const res = await fetch('/api/analyze', { method: 'POST', ...init });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.blueprint) {
        saveAnalysis(data);
        router.push('/workspace');
        return true;
      }

      const message = data?.error ?? 'Analysis failed';
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('Retry-After') ?? '10');
        throw new Error(`Rate limited — slow down. Server says: ${retryAfter}s (daily free quota may also be exhausted).`);
      }

      if (res.status === 503 && label === 'direct') {
        throw new Error('__RETRY_503__');
      }
      throw new Error(message);
    },
    [router]
  );

  const checkCache = useCallback(
    async (file: File): Promise<boolean> => {
      if (file.size > 100 * 1024 * 1024) return false;
      try {
        const buffer = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        const fileHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
        const res = await fetch('/api/cache-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileHash }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.hit && data?.blueprint) {
          saveAnalysis({ blueprint: data.blueprint, extractedFiles: data.extractedFiles ?? [], cached: true });
          router.push('/workspace');
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [router]
  );

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
      setProgress(null);

      try {
        setStatusText('Checking cache…');
        if (await checkCache(file)) return;

        if (file.size <= DIRECT_LIMIT) {
          const formData = new FormData();
          formData.append('file', file);

          const MAX_CLIENT_RETRIES = 2;
          let lastError = 'Analysis failed';

          for (let attempt = 0; attempt <= MAX_CLIENT_RETRIES; attempt += 1) {
            if (attempt > 0) {
              const waitSeconds = 10 * attempt;
              for (let remaining = waitSeconds; remaining > 0; remaining -= 1) {
                setStatusText(
                  `AI backend is busy — retrying automatically in ${remaining}s (attempt ${attempt + 1} of ${MAX_CLIENT_RETRIES + 1})…`
                );
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }
            setStatusText('Analyzing your project…');
            try {
              const done = await requestAnalysis({ body: formData }, 'direct');
              if (done) return;
            } catch (err) {
              lastError = (err as Error).message ?? 'Analysis failed';
              if (lastError === '__RETRY_503__') continue;
              throw err;
            }
          }
          throw new Error(lastError);
        }

        setStatusText('Uploading large file to Blob…');
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 10);
        const blob = await upload(`uploads/${timestamp}-${random}.zip`, file, {
          access: 'private',
          handleUploadUrl: '/api/upload/presign',
          multipart: true,
          onUploadProgress: ({ percentage }) => {
            const pct = Math.round(percentage);
            setProgress(pct);
            setStatusText(`Uploading… ${pct}%`);
          },
        });
        setProgress(null);
        setStatusText('Analyzing your project…');
        await requestAnalysis(
          {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blobUrl: blob.url }),
          },
          'blob'
        );
      } catch (err) {
        const message = (err as Error).message ?? 'Unknown error';
        if (message === '__RETRY_503__') {
          setError('The AI backend is temporarily overloaded. Please wait a moment and try again.');
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
        setStatusText(null);
        setProgress(null);
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    },
    [requestAnalysis, checkCache]
  );

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div className={cn('w-full', className)}>
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          'group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-dashed border-white/15 bg-zinc-900/40 p-8 text-center backdrop-blur-md transition-colors',
          isDragging && 'border-sky-400/60 bg-sky-500/5 shadow-[0_0_32px_rgba(56,189,248,0.15)]',
          compact ? 'p-5' : 'p-10',
          loading && 'pointer-events-none opacity-70'
        )}
      >
        {/* Grid backdrop inside dropzone */}
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

        <div className="relative grid h-12 w-12 place-items-center rounded-full bg-sky-500/10 text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUpFromLine className="h-5 w-5" />}
        </div>
        <div className="relative">
          <p className="text-sm font-medium tracking-tight">
            {statusText ?? (loading ? 'Analyzing your project…' : 'Drop your project ZIP here')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse — we filter out node_modules, .git, build outputs, and binaries.
          </p>
        </div>
        <AnimatePresence>
          {progress !== null && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative w-full max-w-xs"
            >
              <Progress value={progress} className="h-1.5" />
            </motion.div>
          )}
        </AnimatePresence>
        {loading && progress === null && (
          <div className="relative grid w-full max-w-xs gap-2" aria-label="Analyzing">
            <div className="h-1.5 w-full animate-pulse rounded-full bg-white/10">
              <div className="glow h-full w-2/3 rounded-full" />
            </div>
            <div className="h-1.5 w-full animate-pulse rounded-full bg-white/5" />
          </div>
        )}
        <div className="relative flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            <FileArchive className="h-4 w-4" />
            Select ZIP
          </Button>
          <span className="font-mono text-xs text-muted-foreground">Up to 500MB · ⌘K in workspace</span>
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
        {isDragging && <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-sky-400/40" />}
        <Sparkles className="pointer-events-none absolute right-4 top-4 h-4 w-4 text-sky-400/60" />
      </motion.div>
      {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
