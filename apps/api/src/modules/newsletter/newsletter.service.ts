import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  // Idempotent by design — submitting the same email twice (a double
  // click, a resubmitted form) is a no-op success, not an error a
  // visitor filling in a footer form should ever have to see. A
  // previously-unsubscribed email resubscribing clears unsubscribedAt
  // rather than creating a second row — email is the unique identity
  // here, not a fresh signup event each time.
  async subscribe(email: string): Promise<{ alreadySubscribed: boolean }> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email: normalized } });

    if (existing && existing.unsubscribedAt === null) {
      return { alreadySubscribed: true };
    }

    await this.prisma.newsletterSubscriber.upsert({
      where: { email: normalized },
      update: { unsubscribedAt: null },
      create: { email: normalized },
    });
    return { alreadySubscribed: false };
  }

  // Also idempotent — unsubscribing an email that's already
  // unsubscribed, or was never subscribed at all, is a quiet success,
  // not a 404 an unsubscribe-link click should ever surface.
  async unsubscribe(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    await this.prisma.newsletterSubscriber.updateMany({
      where: { email: normalized, unsubscribedAt: null },
      data: { unsubscribedAt: new Date() },
    });
  }
}
