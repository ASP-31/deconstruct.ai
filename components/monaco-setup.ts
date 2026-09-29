'use client';

import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Workers are bundled locally by webpack (same-origin chunks), which avoids
// cross-origin worker restrictions, CDN downtime, and CSP exceptions entirely.
// `getWorker` returns real Worker instances so no blob proxying is needed.
(globalThis as unknown as Record<string, unknown>).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string): Worker {
    switch (label) {
      case 'json':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url)
        );
      case 'css':
      case 'scss':
      case 'less':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url)
        );
      case 'html':
      case 'handlebars':
      case 'razor':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url)
        );
      case 'typescript':
      case 'javascript':
        return new Worker(
          new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url)
        );
      default:
        return new Worker(
          new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url)
        );
    }
  },
};

loader.config({ monaco });
