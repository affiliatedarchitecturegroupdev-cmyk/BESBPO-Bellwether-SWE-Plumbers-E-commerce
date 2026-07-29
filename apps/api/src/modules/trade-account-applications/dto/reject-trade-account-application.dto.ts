import { IsString, MinLength } from 'class-validator';

export class RejectTradeAccountApplicationDto {
  @IsString()
  @MinLength(1)
  rejectionReason!: string;
}
