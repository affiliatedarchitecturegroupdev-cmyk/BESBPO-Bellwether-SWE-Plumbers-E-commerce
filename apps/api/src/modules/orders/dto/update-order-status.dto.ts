import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  // Set by the payments module once it exists (PayFast's payment reference);
  // optional here because status can also change for reasons unrelated to a
  // gateway callback (admin manually marking DISPATCHED, for instance).
  @IsOptional()
  @IsString()
  paymentRef?: string;

  // Set by an admin, typically alongside a transition to DISPATCHED — see
  // OrdersService.updateStatus for how these three combine into a
  // shipped-notification, and common/utils/courier.util.ts for why
  // trackingUrl isn't auto-generated from the other two.
  @IsOptional()
  @IsString()
  courierName?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsUrl()
  trackingUrl?: string;
}
