import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { QueryBundlesDto } from './dto/query-bundles.dto';

const BUNDLE_INCLUDE = { items: { include: { product: true } } } as const;

@Injectable()
export class BundlesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBundleDto) {
    const existing = await this.prisma.bundle.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Bundle with slug '${dto.slug}' already exists`);
    }

    await this.assertProductsExist(dto.items.map((i) => i.productId));

    // Bundle + its items are created together — a bundle with zero items
    // isn't a meaningful state, so this has to be one transaction rather
    // than "create bundle, then create items" as two separate calls.
    return this.prisma.bundle.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        sector: dto.sector,
        bundlePrice: dto.bundlePrice,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: BUNDLE_INCLUDE,
    });
  }

  async findAll(query: QueryBundlesDto) {
    const { sector, page, pageSize } = query;
    const where = sector ? { sector } : {};
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.bundle.findMany({
        where,
        include: BUNDLE_INCLUDE,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bundle.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  async findOneBySlug(slug: string) {
    const bundle = await this.prisma.bundle.findUnique({
      where: { slug },
      include: BUNDLE_INCLUDE,
    });
    if (!bundle) {
      throw new NotFoundException(`Bundle '${slug}' not found`);
    }
    return bundle;
  }

  async update(id: string, dto: UpdateBundleDto) {
    await this.assertExists(id);
    return this.prisma.bundle.update({ where: { id }, data: dto, include: BUNDLE_INCLUDE });
  }

  async remove(id: string): Promise<void> {
    await this.assertExists(id);
    // Bundle items cascade via onDelete: Cascade on the FK in schema.prisma —
    // deleting the bundle removes its item rows, not the underlying products.
    await this.prisma.bundle.delete({ where: { id } });
  }

  private async assertExists(id: string): Promise<void> {
    const bundle = await this.prisma.bundle.findUnique({ where: { id } });
    if (!bundle) {
      throw new NotFoundException(`Bundle '${id}' not found`);
    }
  }

  private async assertProductsExist(productIds: string[]): Promise<void> {
    const found = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    if (found.length !== new Set(productIds).size) {
      const foundIds = new Set(found.map((p) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Unknown product id(s) in bundle items: ${missing.join(', ')}`);
    }
  }
}
