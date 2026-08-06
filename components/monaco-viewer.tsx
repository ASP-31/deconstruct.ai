'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
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

  const resolvedLanguage = language ?? detectLanguageFromPath(path);

  const handleMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.updateOptions({
      readOnly: true,
      fontSize: 13,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      renderLineHighlight: 'all',
      lineNumbers: 'on',
      wordWrap: 'on',
      padding: { top: 12, bottom: 12 },
      contextmenu: false,
      occurrencesHighlight: 'off',
      selectionHighlight: false,
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
    <div className={className}>
      <Editor
        height="100%"
        path={path}
        value={value}
        language={resolvedLanguage}
        theme="vs-dark"
        onMount={handleMount}
        loading={
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Loading editor…
          </div>
        }
        options={{ readOnly: true, domReadOnly: true }}
      />
      <style jsx global>{`
        .deconstruct-highlight-line {
          background: rgba(56, 189, 248, 0.12);
        }
        .deconstruct-highlight-margin {
          background: rgba(56, 189, 248, 0.25);
          border-left: 2px solid rgb(56, 189, 248);
        }
      `}</style>
    </div>
  );
}
