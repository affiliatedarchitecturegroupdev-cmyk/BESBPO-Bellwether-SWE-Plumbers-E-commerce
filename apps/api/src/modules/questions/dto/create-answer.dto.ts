import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAnswerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  answer!: string;
}
