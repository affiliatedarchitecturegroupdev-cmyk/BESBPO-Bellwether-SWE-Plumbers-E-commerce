import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

const mockGetPresignedUploadUrl = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockDeleteObject = jest.fn();
const mockKeyFromPublicUrl = jest.fn();

jest.mock('./s3.util', () => ({
  ...jest.requireActual('./s3.util'), // keep the real buildProductImageKey/extensionForContentType pure functions
  S3Service: jest.fn().mockImplementation(() => ({
    getPresignedUploadUrl: mockGetPresignedUploadUrl,
    getPublicUrl: mockGetPublicUrl,
    deleteObject: mockDeleteObject,
    keyFromPublicUrl: mockKeyFromPublicUrl,
  })),
}));

describe('MediaService', () => {
  let service: MediaService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => 'test-value' } },
      ],
    }).compile();

    service = module.get(MediaService);
  });

  describe('requestProductImageUploadUrl', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(
        service.requestProductImageUploadUrl({ productId: 'missing', contentType: 'image/jpeg' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns a presigned URL and key for a valid product', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);
      mockGetPresignedUploadUrl.mockResolvedValue('https://s3.example.com/presigned');

      const result = await service.requestProductImageUploadUrl({
        productId: 'prod-1',
        contentType: 'image/jpeg',
      });

      expect(result.uploadUrl).toBe('https://s3.example.com/presigned');
      expect(result.key).toMatch(/^products\/prod-1\/.+\.jpg$/);
    });
  });

  describe('confirmProductImage', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.confirmProductImage({ productId: 'missing', key: 'x.jpg' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates a ProductImage using the next available sortOrder when none is given', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);
      prisma.productImage.count.mockResolvedValue(2); // two existing images
      mockGetPublicUrl.mockReturnValue('https://bucket.s3.af-south-1.amazonaws.com/products/prod-1/img.jpg');
      prisma.productImage.create.mockResolvedValue({ id: 'img-1' } as never);

      await service.confirmProductImage({ productId: 'prod-1', key: 'products/prod-1/img.jpg' });

      expect(prisma.productImage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ productId: 'prod-1', sortOrder: 2 }),
      });
    });

    it('uses the explicitly given sortOrder when provided', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);
      mockGetPublicUrl.mockReturnValue('https://bucket.s3.af-south-1.amazonaws.com/products/prod-1/img.jpg');
      prisma.productImage.create.mockResolvedValue({ id: 'img-1' } as never);

      await service.confirmProductImage({ productId: 'prod-1', key: 'x.jpg', sortOrder: 5 });

      expect(prisma.productImage.count).not.toHaveBeenCalled();
      expect(prisma.productImage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sortOrder: 5 }),
      });
    });
  });

  describe('removeProductImage', () => {
    it('throws NotFoundException when the image does not exist', async () => {
      prisma.productImage.findUnique.mockResolvedValue(null);
      await expect(service.removeProductImage('missing')).rejects.toThrow(NotFoundException);
      expect(mockDeleteObject).not.toHaveBeenCalled();
    });

    it('deletes the DB record before the S3 object', async () => {
      const callOrder: string[] = [];
      prisma.productImage.findUnique.mockResolvedValue({ id: 'img-1', url: 'https://x/y.jpg' } as never);
      prisma.productImage.delete.mockImplementation(async () => {
        callOrder.push('db-delete');
        return {} as never;
      });
      mockKeyFromPublicUrl.mockReturnValue('products/prod-1/y.jpg');
      mockDeleteObject.mockImplementation(async () => {
        callOrder.push('s3-delete');
      });

      await service.removeProductImage('img-1');

      expect(callOrder).toEqual(['db-delete', 's3-delete']);
    });
  });
});
