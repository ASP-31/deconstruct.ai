const REDACT_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(GEMINI_API_KEY\s*[:=]\s*)([^\s,;]+)/gi, replacement: '$1[REDACTED]' },
  { pattern: /(api[_-]?key\s*[:=]\s*['"]?)([A-Za-z0-9._\-]{12,})(['"]?)/gi, replacement: '$1[REDACTED]$3' },
  { pattern: /(bearer\s+)([A-Za-z0-9._\-]{12,})/gi, replacement: '$1[REDACTED]' },
  { pattern: /(AIza[0-9A-Za-z_\-]{16,})/g, replacement: '[REDACTED-GEMINI-KEY]' },
  { pattern: /(sk-[A-Za-z0-9]{16,})/g, replacement: '[REDACTED-OPENAI-KEY]' },
];

function redact(input: string): string {
  let output = input;
  for (const { pattern, replacement } of REDACT_PATTERNS) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function safe(value: unknown): string {
  if (value instanceof Error) {
    return redact(`${value.name}: ${value.message}`);
  }
  if (typeof value === 'string') return redact(value);
  try {
    return redact(JSON.stringify(value));
  } catch {
    return '[unserializable]';
  }
}

type Level = 'info' | 'warn' | 'error';

function emit(level: Level, scope: string, payload: unknown) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${scope}] ${safe(payload)}\n`;
  if (level === 'error') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

export const logger = {
  info: (scope: string, payload: unknown) => emit('info', scope, payload),
  warn: (scope: string, payload: unknown) => emit('warn', scope, payload),
  error: (scope: string, payload: unknown) => emit('error', scope, payload),
};
