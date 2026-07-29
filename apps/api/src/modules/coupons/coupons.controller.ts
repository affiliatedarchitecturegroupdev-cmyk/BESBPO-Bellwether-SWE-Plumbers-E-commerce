import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { SetCouponActiveDto } from './dto/set-coupon-active.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';

// Entirely admin-only — there's no customer-facing coupon management,
// only application (see CartController.applyCoupon/removeCoupon on the
// customer side, which go through CouponsService too but don't need
// products:write).
@UseGuards(KeycloakAuthGuard)
@Scopes('products:write')
@Controller({ path: 'coupons', version: '1' })
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  findAll() {
    return this.couponsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Patch(':id/active')
  setActive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetCouponActiveDto) {
    return this.couponsService.setActive(id, dto.active);
  }
}
