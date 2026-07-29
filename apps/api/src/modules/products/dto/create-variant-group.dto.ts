import { IsString, MinLength } from 'class-validator';

export class CreateVariantGroupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  optionLabel!: string;
}
