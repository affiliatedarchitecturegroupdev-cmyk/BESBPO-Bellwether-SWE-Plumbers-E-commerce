import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class ConfirmProductImageDto {
  @IsUUID()
  productId!: string;

  // The S3 key returned by the upload-url step — not the public URL. The
  // service derives the public URL itself (S3Service.getPublicUrl), so the
  // client doesn't need to know or reconstruct that logic.
  @IsString()
  @MinLength(1)
  key!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
