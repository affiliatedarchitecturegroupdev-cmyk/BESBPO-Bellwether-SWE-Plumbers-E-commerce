import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { WarrantyRecord } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { IssueWarrantyDto } from './dto/issue-warranty.dto';

@Injectable()
export class WarrantyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Field-team/admin action, gated by 'warranty:manage' in the controller —
  // a warranty gets issued once a job is actually done, not requested by
  // the customer. accountId comes from the booking record, not the caller.
  async issue(dto: IssueWarrantyDto, actorEmail: string): Promise<WarrantyRecord> {
    const booking = await this.prisma.installationBooking.findUnique({
      where: { id: dto.bookingId },
      include: { account: true },
    });
    if (!booking) {
      throw new NotFoundException(`Booking '${dto.bookingId}' not found`);
    }
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Cannot issue a warranty for a booking that is not yet COMPLETED');
    }

    const termMonths = dto.termMonths ?? 12;
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt);
    expiresAt.setMonth(expiresAt.getMonth() + termMonths);

    const record = await this.prisma.warrantyRecord.create({
      data: {
        bookingId: booking.id,
        accountId: booking.accountId,
        termMonths,
        issuedAt,
        expiresAt,
      },
    });

    await this.notificationsService.queueWarrantyIssued({
      recipientEmail: booking.account.email,
      warrantyId: record.id,
      termMonths,
      expiresAt: expiresAt.toISOString(),
    });

    await this.auditLogService.record({
      actorEmail,
      action: 'warranty.issued',
      targetType: 'WarrantyRecord',
      targetId: record.id,
      metadata: { bookingId: dto.bookingId, termMonths },
    });

    return record;
  }

  async findMine(keycloakSub: string, email: string): Promise<WarrantyRecord[]> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    return this.prisma.warrantyRecord.findMany({
      where: { accountId: account.id },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOneForAccount(keycloakSub: string, email: string, id: string): Promise<WarrantyRecord> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const record = await this.prisma.warrantyRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Warranty record '${id}' not found`);
    }
    if (record.accountId !== account.id) {
      throw new ForbiddenException(`Warranty record '${id}' does not belong to your account`);
    }
    return record;
  }
}
