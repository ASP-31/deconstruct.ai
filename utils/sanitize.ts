const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

export function escapeHtml(input: string): string {
  return input.replace(CONTROL_CHAR_PATTERN, '').replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char]);
}

export function sanitizeText(input: string, maxLength = 20_000): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.slice(0, maxLength);
  return escapeHtml(trimmed);
}

export function sanitizeMultiline(input: string, maxLength = 20_000): string {
  return sanitizeText(input, maxLength);
}

export function sanitizeFilePath(input: string, maxLength = 512): string {
  if (typeof input !== 'string') return '';
  const cleaned = input
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\\+/g, '/')
    .replace(/^\/+/, '')
    .slice(0, maxLength);
  return escapeHtml(cleaned);
}
