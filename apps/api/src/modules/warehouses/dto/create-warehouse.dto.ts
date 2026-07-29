import { IsString, MinLength } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  streetAddress!: string;

  @IsString()
  @MinLength(1)
  city!: string;

  @IsString()
  @MinLength(1)
  province!: string;

  @IsString()
  @MinLength(1)
  postalCode!: string;
}
