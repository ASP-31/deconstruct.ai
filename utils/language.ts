const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  md: 'markdown',
  mdx: 'markdown',
  py: 'python',
  java: 'java',
  go: 'go',
  rs: 'rust',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  c: 'c',
  cs: 'csharp',
  php: 'php',
  rb: 'ruby',
  sh: 'shell',
  bash: 'shell',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sql: 'sql',
};

export function detectLanguageFromPath(filePath: string): string {
  const cleanPath = filePath.toLowerCase().split('?')[0] ?? '';
  const dotIndex = cleanPath.lastIndexOf('.');
  if (dotIndex === -1) return 'plaintext';
  const ext = cleanPath.slice(dotIndex + 1);
  return EXTENSION_LANGUAGE_MAP[ext] ?? 'plaintext';
}
