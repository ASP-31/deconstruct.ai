const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore (the )?(previous|above|prior) (instructions|prompt)/i,
  /disregard (the )?(system|previous) (prompt|message)/i,
  /ignore all (previous|above|prior) instructions/i,
  /ignore everything above/i,
  /disregard everything (above|before)/i,
  /you are now (and (will|must) )?(ignore|disregard)/i,
  /forget (all |the )?(previous|above|prior) (instructions|prompt)/i,
  /reveal (the )?(system|hidden) (prompt|instructions)/i,
  /print (the |your )?system prompt/i,
  /exfiltrate/i,
];

const SECRET_PATTERNS: RegExp[] = [
  /\bAIza[0-9A-Za-z_\-]{16,}\b/g,
  /\bsk-[A-Za-z0-9]{16,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

const REDACTION = '[REDACTED]';

export function detectPromptInjection(input: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

export function redactSecrets(input: string): string {
  let output = input;
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, REDACTION);
  }
  return output;
}

export function sanitizeUserContent(input: string, maxLength = 200_000): string {
  const truncated = input.length > maxLength ? `${input.slice(0, maxLength)}\n…[truncated]` : input;
  return redactSecrets(truncated)
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');
}

const FENCE_LINES = [
  '<<<UNTRUSTED_CODE_BEGIN>>>',
  '<<<UNTRUSTED_CODE_END>>>',
];

export function wrapUntrusted(content: string): string {
  return `${FENCE_LINES[0]}\n${content}\n${FENCE_LINES[1]}`;
}
