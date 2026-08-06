import 'server-only';

type EnvKey = 'GEMINI_API_KEY';

const cache = new Map<EnvKey, string | null>();

function read(key: EnvKey): string | null {
  if (cache.has(key)) return cache.get(key) ?? null;
  const value = process.env[key];
  if (typeof value !== 'string') {
    cache.set(key, null);
    return null;
  }
  const trimmed = value.trim();
  const resolved = trimmed.length > 0 ? trimmed : null;
  cache.set(key, resolved);
  return resolved;
}

export function getRequiredEnv(key: EnvKey): string {
  const value = read(key);
  if (!value) {
    throw new Error(
      `Server misconfiguration: ${key} is missing. Set it in .env.local before serving traffic.`
    );
  }
  return value;
}

export function hasEnv(key: EnvKey): boolean {
  return read(key) !== null;
}
