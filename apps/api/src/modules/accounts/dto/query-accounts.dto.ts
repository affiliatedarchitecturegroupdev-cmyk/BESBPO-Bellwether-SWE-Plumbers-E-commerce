import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AccountType } from '@prisma/client';

export class QueryAccountsDto {
  // Matches against email OR companyName — a real admin search almost
  // never knows which one a customer will be found under.
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  // Same @Max(100) cap as every other admin/public listing endpoint in
  // this codebase — see QueryProductsDto's own precedent, and the real
  // live bug caught earlier this engagement from a frontend caller
  // assuming a higher cap existed than actually did.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 24;
}
