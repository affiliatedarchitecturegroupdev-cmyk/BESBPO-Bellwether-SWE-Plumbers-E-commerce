import { IsString, IsUUID, IsUrl, MinLength } from 'class-validator';

export class IssueCoCRecordDto {
  @IsUUID()
  bookingId!: string;

  // Manual workflow, not an API integration — PIRB has no public API (see
  // docs/BSWE-ECOM-PRODUCTION-PLAN.md and /areas notes on this). The
  // registered plumber's PIRB number is entered by whoever is recording
  // the certificate, not looked up automatically.
  @IsString()
  @MinLength(1)
  pirbRegNumber!: string;

  @IsString()
  @MinLength(1)
  certificateNumber!: string;

  // The actual certificate document is uploaded to S3 by the admin panel
  // before this call — this endpoint just records the reference, it
  // doesn't handle the upload itself.
  @IsUrl()
  documentUrl!: string;
}
