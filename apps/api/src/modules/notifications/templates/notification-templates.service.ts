import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplate } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationJob } from '../interfaces/notification-job.interface';
import { RenderedNotification } from '../channels/notification-channel.interface';
import { renderNotification } from './notification.templates';
import { buildTemplateContext } from './notification.template-context';
import { substitutePlaceholders } from './notification.substitute';
import { NOTIFICATION_TYPES, NOTIFICATION_TYPE_PLACEHOLDERS } from './notification-types.constant';
import { UpsertNotificationTemplateDto } from './dto/upsert-notification-template.dto';

@Injectable()
export class NotificationTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  // Called by NotificationsProcessor for every job, replacing its direct
  // call to renderNotification — this is the ONLY thing that changes
  // about how notifications actually render. If no custom template
  // exists for this job's type (the normal, default state), falls
  // straight through to the existing hardcoded renderNotification,
  // completely unchanged from before this feature existed.
  async render(job: NotificationJob): Promise<RenderedNotification> {
    const custom = await this.prisma.notificationTemplate.findUnique({ where: { type: job.type } });
    if (!custom) {
      return renderNotification(job);
    }

    const context = buildTemplateContext(job);
    return {
      recipientEmail: job.recipientEmail,
      subject: substitutePlaceholders(custom.subjectTemplate, context),
      body: substitutePlaceholders(custom.bodyTemplate, context),
    };
  }

  // Returns all 8 known types, whether or not each has a custom
  // override — an admin managing templates needs to see what's
  // available to customize, not just what's already been touched.
  async findAll(): Promise<{ type: string; placeholders: string[]; customTemplate: NotificationTemplate | null }[]> {
    const customs = await this.prisma.notificationTemplate.findMany();
    const byType = new Map(customs.map((c) => [c.type, c]));

    return NOTIFICATION_TYPES.map((type) => ({
      type,
      placeholders: NOTIFICATION_TYPE_PLACEHOLDERS[type],
      customTemplate: byType.get(type) ?? null,
    }));
  }

  // Upsert by type, not a separate create/update pair — an admin editing
  // an ALREADY-customized template and one customizing a type for the
  // FIRST time go through the exact same action from their own
  // perspective ("save these subject/body values for this type"), so
  // there's no reason to make them two different API calls.
  async upsert(dto: UpsertNotificationTemplateDto): Promise<NotificationTemplate> {
    return this.prisma.notificationTemplate.upsert({
      where: { type: dto.type },
      update: { subjectTemplate: dto.subjectTemplate, bodyTemplate: dto.bodyTemplate },
      create: { type: dto.type, subjectTemplate: dto.subjectTemplate, bodyTemplate: dto.bodyTemplate },
    });
  }

  // "Reset to default" — deletes the custom override entirely, rather
  // than storing some separate "isDefault" flag, since the absence of a
  // row already means "use the hardcoded default" (see render() above).
  async resetToDefault(type: string): Promise<void> {
    const existing = await this.prisma.notificationTemplate.findUnique({ where: { type } });
    if (!existing) {
      throw new NotFoundException(`No custom template exists for '${type}' — nothing to reset`);
    }
    await this.prisma.notificationTemplate.delete({ where: { type } });
  }
}
