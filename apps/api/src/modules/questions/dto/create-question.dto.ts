import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateQuestionDto {
  @IsUUID()
  productId!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  question!: string;
}
