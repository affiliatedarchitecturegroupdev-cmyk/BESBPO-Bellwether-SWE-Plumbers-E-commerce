import { Injectable, Logger } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordAuditEntryInput {
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Deliberately swallows its own failures rather than throwing — an
  // audit log write failing should never be the reason the actual admin
  // action (which already succeeded by the time this is called) gets
  // reported back to the caller as failed. Logged so it's visible, not
  // silently lost.
  async record(entry: RecordAuditEntryInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorEmail: entry.actorEmail,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId,
          metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to record audit log entry (${entry.action} on ${entry.targetType} ${entry.targetId}): ${err}`);
    }
  }

  async findForTarget(targetType: string, targetId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRecent(limit: number): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
