import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type Db = NeonHttpDatabase<typeof schema>;

let cached: Db | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): Db | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (cached) return cached;
  try {
    const sql = neon(url);
    cached = drizzle(sql, { schema });
    return cached;
  } catch {
    return null;
  }
}
