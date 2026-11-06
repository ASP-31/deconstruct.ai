'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor';
import { detectLanguageFromPath } from '@/utils/language';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface MonacoViewerProps {
  value: string;
  language?: string;
  path: string;
  highlightLines?: { startLine: number; endLine: number } | null;
  className?: string;
}

export function MonacoViewer({
  value,
  language,
  path,
  highlightLines,
  className,
}: MonacoViewerProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [ready, setReady] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('./monaco-setup')
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = () => setIsNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ minimap: { enabled: !isNarrow && value.length < 80_000 } });
    }
  }, [isNarrow, value.length]);

  const resolvedLanguage = language ?? detectLanguageFromPath(path);

  const handleMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.updateOptions({
      readOnly: true,
      fontSize: 13,
      fontLigatures: true,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      minimap: { enabled: !isNarrow && value.length < 80_000, maxColumn: 80 },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      renderLineHighlight: 'line',
      lineNumbers: 'on',
      wordWrap: 'on',
      padding: { top: 12, bottom: 12 },
      contextmenu: false,
      occurrencesHighlight: 'off',
      selectionHighlight: false,
      cursorBlinking: 'phase',
      cursorSmoothCaretAnimation: 'on',
      renderWhitespace: 'none',
    });
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const safeStart = Math.max(1, highlightLines?.startLine ?? 1);
    const safeEnd = Math.max(safeStart, highlightLines?.endLine ?? safeStart);

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(safeStart, 1, safeEnd, 1),
        options: {
          isWholeLine: true,
          className: 'deconstruct-highlight-line',
          marginClassName: 'deconstruct-highlight-margin',
        },
      },
    ]);

    if (highlightLines) {
      editor.revealLineInCenterIfOutsideViewport(safeStart);
    }
  }, [highlightLines, value, path]);

  return (
    <div className={`bg-grid relative h-full w-full ${className ?? ''}`}>
      {!ready ? (
        <SkeletonEditor />
      ) : (
        <Editor
          height="100%"
          path={path}
          value={value}
          language={resolvedLanguage}
          theme="vs-dark"
          onMount={handleMount}
          loading={<SkeletonEditor />}
          options={{ readOnly: true, domReadOnly: true }}
        />
      )}
    </div>
  );
}

function SkeletonEditor() {
  return (
    <div className="flex h-full flex-col gap-2 p-4" aria-busy="true" aria-label="Loading editor">
      <div className="h-4 w-2/5 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-3/5 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-full animate-pulse rounded bg-white/5" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
    </div>
  );
}
