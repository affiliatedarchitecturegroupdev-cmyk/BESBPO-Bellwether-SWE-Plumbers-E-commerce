import { IsOptional, IsString } from 'class-validator';

export class AdminNoteDto {
  @IsOptional()
  @IsString()
  adminNote?: string;
}
