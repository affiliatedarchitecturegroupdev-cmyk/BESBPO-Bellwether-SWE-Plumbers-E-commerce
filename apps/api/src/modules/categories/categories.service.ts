import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Category with slug '${dto.slug}' already exists`);
    }
    if (dto.parentId) {
      await this.assertExists(dto.parentId);
    }
    return this.prisma.category.create({ data: dto });
  }

  // Returns the full tree in one query rather than N+1-ing children per
  // node — the nav strip and admin panel both want the whole tree at once,
  // and the category count stays small enough that this is cheap.
  async findTree() {
    const all = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    const byParent = new Map<string | null, typeof all>();
    for (const category of all) {
      const key = category.parentId ?? null;
      byParent.set(key, [...(byParent.get(key) ?? []), category]);
    }

    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? []).map((c) => ({ ...c, children: build(c.id) }));

    return build(null);
  }

  async findOneBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { children: true },
    });
    if (!category) {
      throw new NotFoundException(`Category '${slug}' not found`);
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.assertExists(id);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      await this.assertExists(dto.parentId);
      await this.assertNotDescendant(id, dto.parentId);
    }

    return this.prisma.category.update({ where: { id }, data: dto });
  }

  // Without this check, setting a category's parentId to one of its own
  // descendants creates a cycle in the tree — and findTree()'s recursive
  // build() function has no cycle detection at all, so the very next
  // request to GET /v1/categories (a public endpoint hit on nearly every
  // storefront page load) would recurse forever. A single bad admin edit
  // would take down category browsing platform-wide until someone found
  // and manually fixed the bad row in the database. Walks up from the
  // proposed new parent toward the root, rejecting if it ever reaches the
  // category being moved.
  private async assertNotDescendant(categoryId: string, proposedParentId: string): Promise<void> {
    let currentId: string | null = proposedParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === categoryId) {
        throw new BadRequestException(
          'Cannot set this parent — it is a descendant of the category being moved, which would create a cycle',
        );
      }
      if (visited.has(currentId)) {
        // A cycle already exists somewhere else in the tree (shouldn't be
        // reachable if this check has always run, but stop rather than
        // loop forever if one is ever found some other way).
        break;
      }
      visited.add(currentId);

      const current: { parentId: string | null } | null = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      currentId = current?.parentId ?? null;
    }
  }

  async remove(id: string): Promise<void> {
    await this.assertExists(id);

    const [childCount, productCount] = await this.prisma.$transaction([
      this.prisma.category.count({ where: { parentId: id } }),
      this.prisma.product.count({ where: { categoryId: id } }),
    ]);
    if (childCount > 0 || productCount > 0) {
      throw new ConflictException(
        'Cannot delete a category that still has child categories or products — move or remove those first',
      );
    }

    await this.prisma.category.delete({ where: { id } });
  }

  private async assertExists(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category '${id}' not found`);
    }
  }
}
