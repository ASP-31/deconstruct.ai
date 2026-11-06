import { pgTable, uuid, text, jsonb, timestamp, integer, date, primaryKey } from 'drizzle-orm/pg-core';
import type { ArchitectureBlueprint, ExtractedFile } from '@/types/analysis';

export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  codeHash: text('code_hash').notNull().unique(),
  fileHash: text('file_hash').unique(),
  blueprint: jsonb('blueprint').$type<ArchitectureBlueprint>().notNull(),
  extractedFiles: jsonb('extracted_files').$type<ExtractedFile[]>(),
  model: text('model'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const uploads = pgTable('uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  codeHash: text('code_hash').notNull(),
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  blobUrl: text('blob_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usage = pgTable(
  'usage',
  {
    userKey: text('user_key').notNull(),
    day: date('day').notNull(),
    count: integer('count').notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.userKey, t.day] })]
);

export type AnalysisRow = typeof analyses.$inferSelect;
export type NewAnalysisRow = typeof analyses.$inferInsert;
export type UploadRow = typeof uploads.$inferSelect;
export type UsageRow = typeof usage.$inferSelect;
