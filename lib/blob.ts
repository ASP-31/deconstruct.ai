import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getBlobConfig() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;

  // Token format: vercel_blob_rw_<storeId>_<secret>
  const parts = token.split('_');
  if (parts.length < 4) return null;

  const storeId = parts[3];
  return {
    token,
    storeId,
    // Vercel Blob S3 endpoint uses lowercase store ID
    endpoint: `https://${storeId.toLowerCase()}.blob.vercel-storage.com`,
    region: 'auto',
  };
}

function getS3Client() {
  const config = getBlobConfig();
  if (!config) return null;

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.storeId,
      secretAccessKey: config.token,
    },
  });
}

export function isBlobConfigured(): boolean {
  return getBlobConfig() !== null;
}

export function generateUploadKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `uploads/${timestamp}-${random}.zip`;
}

export interface PresignResult {
  uploadUrl: string;
  key: string;
  downloadUrl: string;
}

export async function createPresignedUploadUrl(key: string): Promise<PresignResult> {
  const config = getBlobConfig();
  if (!config) throw new Error('Vercel Blob not configured');

  const client = getS3Client();
  if (!client) throw new Error('Failed to create S3 client');

  // Use lowercase storeId for bucket to match DNS subdomain
  const bucket = config.storeId.toLowerCase();
  
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: 'application/zip',
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  const downloadUrl = `${config.endpoint}/${key}`;

  return { uploadUrl, key, downloadUrl };
}

export async function getObjectBuffer(downloadUrl: string): Promise<Buffer> {
  if (!isBlobConfigured()) throw new Error('Vercel Blob not configured');

  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  if (!response.ok) throw new Error('Failed to fetch object');
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteObject(key: string): Promise<void> {
  const config = getBlobConfig();
  if (!config) throw new Error('Vercel Blob not configured');

  const client = getS3Client();
  if (!client) throw new Error('Failed to create S3 client');

  const command = new DeleteObjectCommand({
    Bucket: config.storeId.toLowerCase(),
    Key: key,
  });
  await client.send(command);
}

export function getPublicUrl(key: string): string | null {
  const config = getBlobConfig();
  if (!config) return null;
  return `https://${config.storeId.toLowerCase()}.blob.vercel-storage.com/${key}`;
}