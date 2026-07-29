import { IsIn, IsUUID } from 'class-validator';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class RequestUploadUrlDto {
  @IsUUID()
  productId!: string;

  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType!: string;
}
