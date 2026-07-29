import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Review } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';

// Orders in any of these statuses represent a real, completed-enough
// purchase to review honestly — PENDING (never paid), CANCELLED, and
// REFUNDED deliberately excluded. A review shouldn't be possible for an
// order that was refunded, even if it briefly passed through CONFIRMED.
const VERIFIED_PURCHASE_STATUSES = ['CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'];

export interface ProductReviewsResult {
  items: Review[];
  page: number;
  pageSize: number;
  total: number;
  averageRating: number | null;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  async create(keycloakSub: string, email: string, dto: CreateReviewDto): Promise<Review> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);

    await this.assertVerifiedPurchase(account.id, dto.productId);

    const existing = await this.prisma.review.findUnique({
      where: { productId_accountId: { productId: dto.productId, accountId: account.id } },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this product');
    }

    return this.prisma.review.create({
      data: {
        productId: dto.productId,
        accountId: account.id,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
      },
    });
  }

  async findByProduct(query: QueryReviewsDto): Promise<ProductReviewsResult> {
    const skip = (query.page - 1) * query.pageSize;

    const [items, total, aggregate] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { productId: query.productId },
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { productId: query.productId } }),
      this.prisma.review.aggregate({
        where: { productId: query.productId },
        _avg: { rating: true },
      }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      averageRating: aggregate._avg.rating,
    };
  }

  async remove(keycloakSub: string, email: string, id: string): Promise<void> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const review = await this.prisma.review.findUnique({ where: { id } });

    if (!review) {
      throw new NotFoundException(`Review '${id}' not found`);
    }
    if (review.accountId !== account.id) {
      throw new ForbiddenException(`Review '${id}' does not belong to your account`);
    }

    await this.prisma.review.delete({ where: { id } });
  }

  private async assertVerifiedPurchase(accountId: string, productId: string): Promise<void> {
    const purchase = await this.prisma.orderLineItem.findFirst({
      where: {
        productId,
        order: { accountId, status: { in: VERIFIED_PURCHASE_STATUSES } },
      },
    });
    if (!purchase) {
      throw new BadRequestException('You can only review products from a completed order');
    }
  }
}
