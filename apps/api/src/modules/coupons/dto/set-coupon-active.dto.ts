import { IsBoolean } from 'class-validator';

export class SetCouponActiveDto {
  @IsBoolean()
  active!: boolean;
}
