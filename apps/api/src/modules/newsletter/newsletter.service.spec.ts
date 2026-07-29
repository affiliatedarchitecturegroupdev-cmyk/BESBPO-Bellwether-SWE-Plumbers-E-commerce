import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy } from 'jest-mock-extended';
import { NewsletterService } from './newsletter.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [NewsletterService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(NewsletterService);
  });

  describe('subscribe', () => {
    it('creates a new subscriber for a genuinely new email', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue(null);
      prisma.newsletterSubscriber.upsert.mockResolvedValue({ email: 'new@example.com' } as never);

      const result = await service.subscribe('new@example.com');

      expect(result.alreadySubscribed).toBe(false);
      expect(prisma.newsletterSubscriber.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'new@example.com' } }),
      );
    });

    it('is idempotent — submitting the same already-subscribed email twice is a quiet success, not an error', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue({
        email: 'already@example.com',
        unsubscribedAt: null,
      } as never);

      const result = await service.subscribe('already@example.com');

      expect(result.alreadySubscribed).toBe(true);
      expect(prisma.newsletterSubscriber.upsert).not.toHaveBeenCalled();
    });

    it('clears unsubscribedAt when a previously-unsubscribed email resubscribes, rather than creating a second row', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue({
        email: 'back@example.com',
        unsubscribedAt: new Date('2026-01-01'),
      } as never);
      prisma.newsletterSubscriber.upsert.mockResolvedValue({ email: 'back@example.com' } as never);

      const result = await service.subscribe('back@example.com');

      expect(result.alreadySubscribed).toBe(false);
      expect(prisma.newsletterSubscriber.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { unsubscribedAt: null } }),
      );
    });

    it('normalizes email case and whitespace before storing/checking', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue(null);
      prisma.newsletterSubscriber.upsert.mockResolvedValue({} as never);

      await service.subscribe('  Mixed.Case@Example.COM  ');

      expect(prisma.newsletterSubscriber.findUnique).toHaveBeenCalledWith({
        where: { email: 'mixed.case@example.com' },
      });
    });
  });

  describe('unsubscribe', () => {
    it('marks a subscribed email as unsubscribed', async () => {
      prisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 1 } as never);

      await service.unsubscribe('subscriber@example.com');

      expect(prisma.newsletterSubscriber.updateMany).toHaveBeenCalledWith({
        where: { email: 'subscriber@example.com', unsubscribedAt: null },
        data: { unsubscribedAt: expect.any(Date) },
      });
    });

    it('is a quiet no-op for an email that was never subscribed at all — never throws', async () => {
      prisma.newsletterSubscriber.updateMany.mockResolvedValue({ count: 0 } as never);
      await expect(service.unsubscribe('never-subscribed@example.com')).resolves.not.toThrow();
    });
  });
});
