import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { NotificationTemplatesService } from './notification-templates.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock } from '../../../test-utils/prisma-mock';

describe('NotificationTemplatesService', () => {
  let service: NotificationTemplatesService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationTemplatesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(NotificationTemplatesService);
  });

  describe('render', () => {
    it('falls back to the existing hardcoded default when no custom template exists for this type', async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue(null);

      const result = await service.render({
        type: 'order.confirmed',
        recipientEmail: 'buyer@example.com',
        orderNumber: 'BSWE-1',
        total: '100.00',
      } as never);

      expect(result.subject).toContain('BSWE-1');
      expect(result.subject).toContain('confirmed');
    });

    it('uses the custom template with placeholder substitution when one exists', async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue({
        type: 'order.confirmed',
        subjectTemplate: 'Thanks for order {{orderNumber}}!',
        bodyTemplate: 'Your total was R{{total}}.',
      } as never);

      const result = await service.render({
        type: 'order.confirmed',
        recipientEmail: 'buyer@example.com',
        orderNumber: 'BSWE-42',
        total: '250.00',
      } as never);

      expect(result.subject).toBe('Thanks for order BSWE-42!');
      expect(result.body).toBe('Your total was R250.00.');
      expect(result.recipientEmail).toBe('buyer@example.com');
    });

    it('correctly resolves the conditional order.cancelled refund text through a custom template', async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue({
        type: 'order.cancelled',
        subjectTemplate: 'Update on {{orderNumber}}',
        bodyTemplate: 'Your order {{refundText}}',
      } as never);

      const refunded = await service.render({
        type: 'order.cancelled',
        recipientEmail: 'buyer@example.com',
        orderNumber: 'BSWE-1',
        total: '100.00',
        wasRefunded: true,
      } as never);
      expect(refunded.body).toContain('cancelled and refunded');

      const notRefunded = await service.render({
        type: 'order.cancelled',
        recipientEmail: 'buyer@example.com',
        orderNumber: 'BSWE-2',
        total: '100.00',
        wasRefunded: false,
      } as never);
      expect(notRefunded.body).toContain('nothing to refund');
    });
  });

  describe('findAll', () => {
    it('returns all 8 known types, including ones with no custom override at all', async () => {
      prisma.notificationTemplate.findMany.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toHaveLength(8);
      expect(result.every((r) => r.customTemplate === null)).toBe(true);
    });

    it('attaches the custom template to its matching type only, leaving the rest null', async () => {
      prisma.notificationTemplate.findMany.mockResolvedValue([
        { type: 'order.confirmed', subjectTemplate: 'Custom!', bodyTemplate: 'Body' },
      ] as never);

      const result = await service.findAll();
      const confirmed = result.find((r) => r.type === 'order.confirmed');
      const shipped = result.find((r) => r.type === 'order.shipped');

      expect(confirmed?.customTemplate).toEqual(expect.objectContaining({ subjectTemplate: 'Custom!' }));
      expect(shipped?.customTemplate).toBeNull();
    });
  });

  describe('resetToDefault', () => {
    it('throws NotFoundException when no custom template exists for the type', async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue(null);
      await expect(service.resetToDefault('order.confirmed')).rejects.toThrow(NotFoundException);
      expect(prisma.notificationTemplate.delete).not.toHaveBeenCalled();
    });

    it('deletes the custom template row, restoring default behavior', async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue({ type: 'order.confirmed' } as never);
      await service.resetToDefault('order.confirmed');
      expect(prisma.notificationTemplate.delete).toHaveBeenCalledWith({ where: { type: 'order.confirmed' } });
    });
  });
});
