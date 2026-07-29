import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductImage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service, buildProductImageKey } from './s3.util';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { ConfirmProductImageDto } from './dto/confirm-product-image.dto';

export interface UploadUrlResult {
  uploadUrl: string;
  key: string;
}

@Injectable()
export class MediaService {
  private readonly s3: S3Service;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3Service(config);
  }

  // Step 1 of 2. Returns a presigned URL the client uploads directly to —
  // this call alone doesn't create any DB record, since the upload could
  // still fail or never happen. See ConfirmProductImageDto for step 2.
  async requestProductImageUploadUrl(dto: RequestUploadUrlDto): Promise<UploadUrlResult> {
    await this.assertProductExists(dto.productId);

    const key = buildProductImageKey(dto.productId, dto.contentType);
    const uploadUrl = await this.s3.getPresignedUploadUrl(key, dto.contentType);
    return { uploadUrl, key };
  }

  // Step 2 of 2. Called after the client has successfully PUT the file to
  // the presigned URL from step 1 — this is what actually creates the
  // ProductImage record. There's a real gap here: nothing verifies the
  // object actually exists at `key` in S3 before creating this record
  // (that would need a HeadObject call). A client that requests an upload
  // URL and never uploads, then calls confirm anyway, produces a
  // ProductImage row pointing at nothing. Acceptable for admin-only usage
  // today; worth closing with a HeadObject check before this is exposed
  // more broadly.
  async confirmProductImage(dto: ConfirmProductImageDto): Promise<ProductImage> {
    await this.assertProductExists(dto.productId);

    const url = this.s3.getPublicUrl(dto.key);
    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(dto.productId));

    return this.prisma.productImage.create({
      data: { productId: dto.productId, url, sortOrder },
    });
  }

  async removeProductImage(id: string): Promise<void> {
    const image = await this.prisma.productImage.findUnique({ where: { id } });
    if (!image) {
      throw new NotFoundException(`Product image '${id}' not found`);
    }

    // DB row removed first, S3 object second — if the S3 delete fails, the
    // record is still gone from what the storefront shows, which matters
    // more than a soon-to-be-orphaned S3 object costing a few cents.
    await this.prisma.productImage.delete({ where: { id } });
    await this.s3.deleteObject(this.s3.keyFromPublicUrl(image.url));
  }

  private async nextSortOrder(productId: string): Promise<number> {
    const count = await this.prisma.productImage.count({ where: { productId } });
    return count;
  }

  private async assertProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }
  }
}
