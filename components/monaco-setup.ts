'use client';

import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

const WORKER_CDN =
  'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';

function cdnWorkerPath(label: string): string {
  switch (label) {
    case 'json':
      return `${WORKER_CDN}/language/json/json.worker.js`;
    case 'css':
    case 'scss':
    case 'less':
      return `${WORKER_CDN}/language/css/css.worker.js`;
    case 'html':
    case 'handlebars':
    case 'razor':
      return `${WORKER_CDN}/language/html/html.worker.js`;
    case 'typescript':
    case 'javascript':
      return `${WORKER_CDN}/language/typescript/ts.worker.js`;
    default:
      return `${WORKER_CDN}/editor/editor.worker.js`;
  }
}

// Browsers refuse to construct a Worker directly from a cross-origin URL, so
// the CDN worker is proxied through a same-origin blob: URL (allowed by the
// CSP's `worker-src blob:`) which importScripts the real worker from the CDN.
(globalThis as unknown as Record<string, unknown>).MonacoEnvironment = {
  getWorkerUrl(_: string, label: string) {
    const bootstrap = `self.MonacoEnvironment={baseUrl:'${WORKER_CDN}/'};importScripts('${cdnWorkerPath(label)}');`;
    return URL.createObjectURL(new Blob([bootstrap], { type: 'text/javascript' }));
  },
};

loader.config({ monaco });
