import { IsEnum } from 'class-validator';
import { AccountMemberRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(AccountMemberRole)
  role!: AccountMemberRole;
}
