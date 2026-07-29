import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Coupon, DiscountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { round2 } from '../../common/utils/money.util';

export interface CouponValidationResult {
  coupon: Coupon;
  discountAmount: number;
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto): Promise<Coupon> {
    if (dto.discountType === DiscountType.PERCENTAGE && dto.discountValue > 100) {
      throw new BadRequestException('A percentage discount cannot exceed 100');
    }

    const code = dto.code.toUpperCase();
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`Coupon code '${code}' already exists`);
    }

    return this.prisma.coupon.create({
      data: {
        code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minSubtotal: dto.minSubtotal,
        maxUses: dto.maxUses,
        maxUsesPerAccount: dto.maxUsesPerAccount,
        active: dto.active ?? true,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  async findAll(): Promise<Coupon[]> {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async setActive(id: string, active: boolean): Promise<Coupon> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon '${id}' not found`);
    }
    return this.prisma.coupon.update({ where: { id }, data: { active } });
  }

  // The single place every rule about whether a coupon actually applies
  // lives — called from both CartService (when a customer applies a code,
  // and again on every price() call to re-validate) and
  // OrdersService.checkout (the final, authoritative calculation right
  // before an order is created). Same function, same rules, both times —
  // there's no second, drifting copy of "is this coupon valid right now"
  // logic anywhere else.
  //
  // Throws with a specific, customer-facing reason on any failure, rather
  // than a generic "invalid coupon" — CartService surfaces this message
  // directly (see its own comment on couponError).
  async validateAndCompute(code: string, accountId: string, subtotal: number): Promise<CouponValidationResult> {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) {
      throw new BadRequestException(`Coupon code '${code}' doesn't exist`);
    }
    if (!coupon.active) {
      throw new BadRequestException('This coupon is no longer active');
    }

    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new BadRequestException('This coupon is not active yet');
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      throw new BadRequestException('This coupon has expired');
    }

    if (coupon.minSubtotal && subtotal < Number(coupon.minSubtotal)) {
      throw new BadRequestException(
        `This coupon requires a minimum order of R${Number(coupon.minSubtotal).toFixed(2)}`,
      );
    }

    if (coupon.maxUses || coupon.maxUsesPerAccount) {
      const [totalRedemptions, accountRedemptions] = await Promise.all([
        coupon.maxUses
          ? this.prisma.couponRedemption.count({ where: { couponId: coupon.id } })
          : Promise.resolve(0),
        coupon.maxUsesPerAccount
          ? this.prisma.couponRedemption.count({ where: { couponId: coupon.id, accountId } })
          : Promise.resolve(0),
      ]);
      if (coupon.maxUses && totalRedemptions >= coupon.maxUses) {
        throw new BadRequestException('This coupon has reached its usage limit');
      }
      if (coupon.maxUsesPerAccount && accountRedemptions >= coupon.maxUsesPerAccount) {
        throw new BadRequestException("You've already used this coupon the maximum number of times");
      }
    }

    const discountAmount =
      coupon.discountType === DiscountType.PERCENTAGE
        ? round2(subtotal * (Number(coupon.discountValue) / 100))
        : // Fixed amount, capped at the subtotal itself — a R500 coupon on
          // a R200 order discounts R200, never producing a negative total.
          Math.min(Number(coupon.discountValue), subtotal);

    return { coupon, discountAmount: round2(discountAmount) };
  }
}
