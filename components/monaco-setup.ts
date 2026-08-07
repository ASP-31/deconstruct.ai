'use client';

import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

const WORKER_CDN =
  'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';

(globalThis as unknown as Record<string, unknown>).MonacoEnvironment = {
  getWorkerUrl(_: string, label: string) {
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
  },
};

loader.config({ monaco });