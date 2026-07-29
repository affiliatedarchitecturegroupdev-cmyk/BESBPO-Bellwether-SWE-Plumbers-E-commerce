import { ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnReason } from '@prisma/client';

class ReturnLineItemDto {
  @IsUUID()
  orderLineItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateReturnRequestDto {
  @IsUUID()
  orderId!: string;

  @IsEnum(ReturnReason)
  reason!: ReturnReason;

  @IsOptional()
  @IsString()
  reasonDetail?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnLineItemDto)
  lineItems!: ReturnLineItemDto[];
}
