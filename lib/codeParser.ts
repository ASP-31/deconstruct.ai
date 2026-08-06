import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  'coverage',
  '.vercel',
  '.cache',
  '.turbo',
  '.idea',
  '.vscode',
  '__pycache__',
  '.svelte-kit',
  'target',
  'vendor',
  'Pods',
]);

const IGNORED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.svg',
  '.webp',
  '.bmp',
  '.tif',
  '.tiff',
  '.mp4',
  '.mov',
  '.mp3',
  '.wav',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.tgz',
  '.7z',
  '.rar',
  '.lock',
  '.bin',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.class',
  '.jar',
  '.war',
  '.pyc',
  '.wasm',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.mdx',
  '.txt',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.c',
  '.h',
  '.cpp',
  '.cc',
  '.cxx',
  '.hpp',
  '.cs',
  '.php',
  '.rb',
  '.sh',
  '.bash',
  '.zsh',
  '.yml',
  '.yaml',
  '.toml',
  '.ini',
  '.env',
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.sql',
  '.vue',
  '.svelte',
  '.kt',
  '.swift',
  '.m',
  '.mm',
  '.r',
  '.pl',
  '.lua',
  '.ex',
  '.exs',
  '.elm',
  '.clj',
  '.scala',
  '.dart',
  '.gradle',
  '.properties',
  '.gitignore',
  '.gitattributes',
  '.editorconfig',
  '.dockerfile',
]);

const MAX_ENTRY_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
const MAX_FILE_COUNT = 1500;
const MAX_PATH_LENGTH = 512;

export interface CodeFile {
  path: string;
  content: string;
}

export interface CodebaseSummary {
  fileTree: string;
  files: CodeFile[];
}

function normalizePath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\/+/, '');
}

function hasTraversal(segments: string[]): boolean {
  return segments.some((segment) => segment === '..' || segment === '.');
}

function isProbablyText(buffer: Buffer): boolean {
  if (buffer.length === 0) return true;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    if (byte < 9 || (byte > 13 && byte < 32 && byte !== 27)) {
      suspicious += 1;
    }
  }
  return suspicious / sample.length < 0.05;
}

export interface ParseLimits {
  maxEntryBytes?: number;
  maxTotalBytes?: number;
  maxFileCount?: number;
  maxPathLength?: number;
}

export class UnsafeArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeArchiveError';
  }
}

export async function parseProjectZip(
  fileBuffer: Buffer,
  limits: ParseLimits = {}
): Promise<CodebaseSummary> {
  const maxEntryBytes = limits.maxEntryBytes ?? MAX_ENTRY_BYTES;
  const maxTotalBytes = limits.maxTotalBytes ?? MAX_TOTAL_BYTES;
  const maxFileCount = limits.maxFileCount ?? MAX_FILE_COUNT;
  const maxPathLength = limits.maxPathLength ?? MAX_PATH_LENGTH;

  let zip: AdmZip;
  try {
    zip = new AdmZip(fileBuffer);
  } catch (err) {
    throw new UnsafeArchiveError('Archive is not a valid ZIP file.');
  }

  const entries = zip.getEntries();
  const files: CodeFile[] = [];
  const structuralPaths: string[] = [];
  let totalBytes = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const rawPath = entry.entryName;
    if (!rawPath || rawPath.length > maxPathLength) {
      throw new UnsafeArchiveError('Archive contains an entry with an invalid path length.');
    }

    const relativePath = normalizePath(rawPath);
    const segments = relativePath.split('/').filter(Boolean);
    if (segments.length === 0 || hasTraversal(segments)) {
      throw new UnsafeArchiveError(
        'Archive contains a path traversal sequence and was rejected.'
      );
    }

    if (segments.some((segment) => IGNORED_DIRECTORIES.has(segment))) continue;

    const ext = path.extname(relativePath).toLowerCase();
    if (IGNORED_EXTENSIONS.has(ext)) continue;
    if (!TEXT_EXTENSIONS.has(ext) && !isProbablyText(entry.getData().subarray(0, 256))) {
      continue;
    }

    const headerSize = entry.header.size;
    if (headerSize > maxEntryBytes) continue;

    let data: Buffer;
    try {
      data = entry.getData();
    } catch (err) {
      throw new UnsafeArchiveError(`Failed to read entry ${relativePath}.`);
    }

    if (data.length > maxEntryBytes) continue;
    if (!isProbablyText(data)) continue;

    totalBytes += data.length;
    if (totalBytes > maxTotalBytes) {
      throw new UnsafeArchiveError(
        'Archive exceeds the maximum total uncompressed text size.'
      );
    }
    if (files.length >= maxFileCount) {
      throw new UnsafeArchiveError('Archive contains too many files.');
    }

    structuralPaths.push(relativePath);
    files.push({ path: relativePath, content: data.toString('utf8') });
  }

  return { fileTree: buildTreeString(structuralPaths), files };
}

function buildTreeString(paths: string[]): string {
  const tree: Record<string, Record<string, unknown>> = {};

  paths.forEach((p) => {
    const parts = p.split('/');
    let current: Record<string, unknown> = tree;
    parts.forEach((part) => {
      const next = current[part] as Record<string, unknown> | undefined;
      if (!next) {
        const created: Record<string, unknown> = {};
        current[part] = created;
        current = created;
      } else {
        current = next;
      }
    });
  });

  function renderTree(node: Record<string, unknown>, indent = ''): string {
    let result = '';
    const keys = Object.keys(node);
    keys.forEach((key, index) => {
      const isLast = index === keys.length - 1;
      result += `${indent}${isLast ? '└── ' : '├── '}${key}\n`;
      result += renderTree(
        node[key] as Record<string, unknown>,
        indent + (isLast ? '    ' : '│   ')
      );
    });
    return result;
  }

  return renderTree(tree);
}

void fs;
