import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// Only these — validated against the client-supplied contentType before a
// presigned URL is ever issued, so this isn't a general-purpose file
// upload endpoint that happens to be used for images. No SVG (XSS risk via
// inline scripts in an "image"), no arbitrary types.
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function extensionForContentType(contentType: string): string | null {
  return ALLOWED_CONTENT_TYPES[contentType] ?? null;
}

export function buildProductImageKey(productId: string, contentType: string): string {
  const ext = extensionForContentType(contentType);
  if (!ext) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }
  // A random UUID per upload, not the product SKU — decouples storage from
  // a business identifier that can change, and means re-uploading a photo
  // doesn't silently overwrite a previous one before the new one is
  // confirmed to have uploaded successfully.
  return `products/${productId}/${randomUUID()}.${ext}`;
}

export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(config: ConfigService) {
    this.region = config.get<string>('S3_REGION') ?? 'af-south-1';
    this.bucket = this.requireConfig(config, 'S3_BUCKET');
    this.client = new S3Client({ region: this.region });
  }

  // A presigned PUT URL, not a proxied upload through this API — the
  // client uploads the file bytes directly to S3. This is the standard,
  // scalable pattern (large binary uploads never touch the API server's
  // memory or count against its request timeout), at the cost of the
  // client needing two round trips (get the URL, then PUT to it) instead
  // of one. Known limitation: a presigned PUT URL can't enforce a max file
  // size the way an S3 POST-policy upload can — that would need switching
  // upload styles, not a small addition to this method. Not done in this
  // pass; worth doing before this is exposed to untrusted uploaders rather
  // than admin-only use.
  async getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.client, command, { expiresIn: 300 }); // 5 minutes — long enough for a real upload, short enough that a leaked URL isn't a standing liability
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  // Reverses getPublicUrl — needed because ProductImage only stores the
  // public URL, but deleting from S3 needs the key.
  keyFromPublicUrl(url: string): string {
    const prefix = `https://${this.bucket}.s3.${this.region}.amazonaws.com/`;
    if (!url.startsWith(prefix)) {
      throw new Error(`URL does not belong to this bucket: ${url}`);
    }
    return url.slice(prefix.length);
  }

  private requireConfig(config: ConfigService, key: string): string {
    const value = config.get<string>(key);
    if (!value) {
      throw new Error(`Missing required config for S3: ${key}`);
    }
    return value;
  }
}
