import { IsString, MinLength } from 'class-validator';

export class BulkImportProductsDto {
  @IsString()
  @MinLength(1)
  csvContent!: string;
}
