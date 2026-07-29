import { Injectable, NotFoundException } from '@nestjs/common';
import { WishlistItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';

const PRODUCT_INCLUDE = {
  product: { include: { category: true, images: { orderBy: { sortOrder: 'asc' as const } } } },
};

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  async list(keycloakSub: string, email: string) {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    return this.prisma.wishlistItem.findMany({
      where: { accountId: account.id },
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Idempotent — adding a product already on the wishlist isn't an
  // error condition (the customer's intent, "I want this saved," is
  // already satisfied), unlike e.g. AccountsService.inviteMember's
  // duplicate-email rejection where a second invite really is a mistake
  // worth surfacing. A wishlist button is a toggle in the UI; the API
  // underneath it should behave like one too.
  async add(keycloakSub: string, email: string, productId: string): Promise<WishlistItem> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    return this.prisma.wishlistItem.upsert({
      where: { accountId_productId: { accountId: account.id, productId } },
      update: {}, // already wishlisted — nothing to change, just confirm it's there
      create: { accountId: account.id, productId },
    });
  }

  // Also idempotent — removing something not on the wishlist is a
  // no-op success, not a 404. The end state the caller wants ("this
  // product is not on my wishlist") is already true either way.
  async remove(keycloakSub: string, email: string, productId: string): Promise<void> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    await this.prisma.wishlistItem.deleteMany({ where: { accountId: account.id, productId } });
  }
}
