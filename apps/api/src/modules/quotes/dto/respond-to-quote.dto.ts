import { IsIn } from 'class-validator';

export class RespondToQuoteDto {
  @IsIn(['ACCEPTED', 'DECLINED'])
  response!: 'ACCEPTED' | 'DECLINED';
}
