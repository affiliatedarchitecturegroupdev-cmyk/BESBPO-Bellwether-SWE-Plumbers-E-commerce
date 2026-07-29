import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType, TradeApplicationStatus, TradeAccountApplication } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTradeAccountApplicationDto } from './dto/create-trade-account-application.dto';

// The self-service half of trade account TYPE (trade pricing) — a
// genuinely separate thing from trade CREDIT (payment terms), which
// stays administrative and is unlocked separately, after an account is
// already trade type. Discovered while building this that NO mechanism
// existed anywhere, not even administrative, to ever set Account.type
// to TRADE — this service's approve() is that mechanism, not just the
// application-submission half of it.
//
// approve()/reject() now also queue a real customer notification — a
// gap found directly in Gap Analysis V: a customer applying previously
// had no way to find out their status changed except by remembering to
// revisit /trade/apply themselves.
@Injectable()
export class TradeAccountApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    keycloakSub: string,
    email: string,
    dto: CreateTradeAccountApplicationDto,
  ): Promise<TradeAccountApplication> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);

    if (account.type === AccountType.TRADE) {
      throw new BadRequestException('This account already has trade pricing.');
    }

    const existingPending = await this.prisma.tradeAccountApplication.findFirst({
      where: { accountId: account.id, status: TradeApplicationStatus.PENDING },
    });
    if (existingPending) {
      throw new ConflictException('You already have a pending trade account application.');
    }

    return this.prisma.tradeAccountApplication.create({
      data: { accountId: account.id, ...dto },
    });
  }

  async findMine(keycloakSub: string, email: string): Promise<TradeAccountApplication[]> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    return this.prisma.tradeAccountApplication.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(status?: TradeApplicationStatus) {
    return this.prisma.tradeAccountApplication.findMany({
      where: status ? { status } : undefined,
      include: { account: { select: { email: true, companyName: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Both updates happen in one transaction — approving an application
  // must never leave the account not actually switched to TRADE type,
  // or vice versa. That inconsistency would be worse than either update
  // failing cleanly on its own. The notification is queued AFTER the
  // transaction commits, not inside it — a queue failure shouldn't roll
  // back a real, already-successful approval.
  async approve(id: string): Promise<TradeAccountApplication> {
    const application = await this.findByIdOrThrowWithAccount(id);
    if (application.status !== TradeApplicationStatus.PENDING) {
      throw new ConflictException(`Application is already ${application.status.toLowerCase()}`);
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.account.update({ where: { id: application.accountId }, data: { type: AccountType.TRADE } }),
      this.prisma.tradeAccountApplication.update({
        where: { id },
        data: { status: TradeApplicationStatus.APPROVED, reviewedAt: new Date() },
      }),
    ]);

    await this.notificationsService.queueTradeApplicationApproved({
      recipientEmail: application.account.email,
      companyName: application.companyName,
    });

    return updated;
  }

  async reject(id: string, reason: string): Promise<TradeAccountApplication> {
    const application = await this.findByIdOrThrowWithAccount(id);
    if (application.status !== TradeApplicationStatus.PENDING) {
      throw new ConflictException(`Application is already ${application.status.toLowerCase()}`);
    }

    const updated = await this.prisma.tradeAccountApplication.update({
      where: { id },
      data: { status: TradeApplicationStatus.REJECTED, reviewedAt: new Date(), rejectionReason: reason },
    });

    await this.notificationsService.queueTradeApplicationRejected({
      recipientEmail: application.account.email,
      companyName: application.companyName,
      rejectionReason: reason,
    });

    return updated;
  }

  private async findByIdOrThrowWithAccount(
    id: string,
  ): Promise<TradeAccountApplication & { account: { email: string } }> {
    const application = await this.prisma.tradeAccountApplication.findUnique({
      where: { id },
      include: { account: { select: { email: true } } },
    });
    if (!application) throw new NotFoundException(`Application '${id}' not found`);
    return application;
  }
}
