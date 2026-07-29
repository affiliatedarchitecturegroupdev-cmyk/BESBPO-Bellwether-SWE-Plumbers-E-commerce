import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CoCRecord } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { IssueCoCRecordDto } from './dto/issue-coc-record.dto';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Field-team/admin action, gated by 'compliance:manage' — same shape as
  // WarrantyService.issue. Unlike warranty, this isn't gated on booking
  // status: a CoC can legitimately be issued the same day work finishes,
  // before an admin has separately marked the booking COMPLETED in the
  // system — the certificate is the plumber's own attestation, not
  // downstream of this app's status field.
  async issue(dto: IssueCoCRecordDto, actorEmail: string): Promise<CoCRecord> {
    const booking = await this.prisma.installationBooking.findUnique({
      where: { id: dto.bookingId },
      include: { account: true },
    });
    if (!booking) {
      throw new NotFoundException(`Booking '${dto.bookingId}' not found`);
    }

    const existing = await this.prisma.coCRecord.findUnique({ where: { bookingId: dto.bookingId } });
    if (existing) {
      throw new ConflictException(`Booking '${dto.bookingId}' already has a CoC record`);
    }

    const record = await this.prisma.coCRecord.create({
      data: {
        bookingId: booking.id,
        pirbRegNumber: dto.pirbRegNumber,
        certificateNumber: dto.certificateNumber,
        documentUrl: dto.documentUrl,
      },
    });

    // Was defined (job type + template) since the notifications module was
    // built, but never actually called until now — same "built, unwired"
    // gap as /search-rank and /recommend had on the AI service side.
    await this.notificationsService.queueCoCIssued({
      recipientEmail: booking.account.email,
      certificateNumber: record.certificateNumber,
      documentUrl: record.documentUrl,
    });

    await this.auditLogService.record({
      actorEmail,
      action: 'compliance.coc_issued',
      targetType: 'CoCRecord',
      targetId: record.id,
      metadata: { bookingId: dto.bookingId, certificateNumber: dto.certificateNumber },
    });

    return record;
  }

  async findMine(keycloakSub: string, email: string): Promise<CoCRecord[]> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    // CoCRecord has no direct accountId column (see schema.prisma) — it's
    // reached through its booking, unlike WarrantyRecord which denormalizes
    // accountId directly. Filtering "mine" means joining through
    // InstallationBooking rather than a simple where clause.
    return this.prisma.coCRecord.findMany({
      where: { booking: { accountId: account.id } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOneForAccount(keycloakSub: string, email: string, id: string): Promise<CoCRecord> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const record = await this.prisma.coCRecord.findUnique({ where: { id }, include: { booking: true } });
    if (!record) {
      throw new NotFoundException(`CoC record '${id}' not found`);
    }
    if (record.booking.accountId !== account.id) {
      throw new ForbiddenException(`CoC record '${id}' does not belong to your account`);
    }
    return record;
  }
}
