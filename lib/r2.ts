import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getR2Config() {
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_BUCKET = process.env.R2_BUCKET;
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    return null;
  }

  return { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL };
}

function getR2Client() {
  const config = getR2Config();
  if (!config) return null;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
  });
}

const r2Client = getR2Client();

export function isR2Configured(): boolean {
  return r2Client !== null;
}

export function generateUploadKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `uploads/${timestamp}-${random}.zip`;
}

export async function createPresignedUploadUrl(
  key: string,
  contentType = 'application/zip',
  expiresIn = 3600
): Promise<string> {
  const client = getR2Client();
  if (!client) throw new Error('R2 not configured');

  const config = getR2Config()!;
  const command = new PutObjectCommand({
    Bucket: config.R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const client = getR2Client();
  if (!client) throw new Error('R2 not configured');

  const config = getR2Config()!;
  const command = new GetObjectCommand({
    Bucket: config.R2_BUCKET,
    Key: key,
  });
  const response = await client.send(command);
  if (!response.Body) throw new Error('Empty object');
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteObject(key: string): Promise<void> {
  const client = getR2Client();
  if (!client) throw new Error('R2 not configured');

  const config = getR2Config()!;
  const command = new DeleteObjectCommand({
    Bucket: config.R2_BUCKET,
    Key: key,
  });
  await client.send(command);
}

export function getPublicUrl(key: string): string | null {
  const config = getR2Config();
  if (!config || !config.R2_PUBLIC_URL) return null;
  return `${config.R2_PUBLIC_URL}/${key}`;
}