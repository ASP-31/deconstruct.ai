const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

// NOTE: These helpers intentionally do NOT HTML-escape. All consumer output
// goes through React children, which escapes text automatically. Escaping
// here produced visible artifacts like `&#x2F;` and `&amp;amp;` in the UI.
export function sanitizeText(input: string, maxLength = 20_000): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength);
}

export function sanitizeMultiline(input: string, maxLength = 20_000): string {
  if (typeof input !== 'string') return '';
  return input.replace(CONTROL_CHAR_PATTERN, '').slice(0, maxLength);
}

export function sanitizeFilePath(input: string, maxLength = 512): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\\+/g, '/')
    .replace(/^\/+/, '')
    .slice(0, maxLength);
}
