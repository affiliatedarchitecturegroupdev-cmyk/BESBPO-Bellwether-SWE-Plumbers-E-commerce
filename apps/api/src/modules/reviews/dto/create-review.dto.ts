import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @MinLength(1)
  body!: string;
}
