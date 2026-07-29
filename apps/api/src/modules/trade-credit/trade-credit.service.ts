import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TradeCreditAccount } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateTradeCreditAccountDto } from './dto/create-trade-credit-account.dto';
import { RecordDrawdownDto, RecordRepaymentDto } from './dto/credit-transaction.dto';
import { QueryTradeCreditAccountsDto } from './dto/query-trade-credit-accounts.dto';

@Injectable()
export class TradeCreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Admin-only (gated by 'trade-credit:manage' in the controller) — this is
  // deliberately not a self-service application flow. Extending credit is
  // a human underwriting decision (and, on the INTERNAL_INCIDENTAL path, a
  // decision with real National Credit Act structuring implications — see
  // /areas notes on the incidental-credit exemption this relies on), not
  // something a customer should be able to grant themselves by filling in
  // a form. approvedAt is set to now at creation: by the time this
  // endpoint is called, the underwriting decision has already been made
  // outside this system.
  async create(dto: CreateTradeCreditAccountDto, actorEmail: string): Promise<TradeCreditAccount> {
    const existingAccount = await this.prisma.account.findUnique({ where: { id: dto.accountId } });
    if (!existingAccount) {
      throw new NotFoundException(`Account '${dto.accountId}' not found`);
    }

    const existingCreditAccount = await this.prisma.tradeCreditAccount.findUnique({
      where: { accountId: dto.accountId },
    });
    if (existingCreditAccount) {
      throw new ConflictException(`Account '${dto.accountId}' already has a trade credit account`);
    }

    const created = await this.prisma.tradeCreditAccount.create({
      data: {
        accountId: dto.accountId,
        creditPath: dto.creditPath,
        creditLimit: dto.creditLimit,
        paymentTermDays: dto.paymentTermDays ?? 30,
        intermediaryProvider: dto.intermediaryProvider,
        intermediaryAccountRef: dto.intermediaryAccountRef,
        approvedAt: new Date(),
      },
    });

    await this.auditLogService.record({
      actorEmail,
      action: 'trade_credit.account_created',
      targetType: 'TradeCreditAccount',
      targetId: created.id,
      metadata: { accountId: dto.accountId, creditLimit: dto.creditLimit, creditPath: dto.creditPath },
    });

    return created;
  }

  async findMine(keycloakSub: string, email: string): Promise<TradeCreditAccount> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const record = await this.prisma.tradeCreditAccount.findUnique({ where: { accountId: account.id } });
    if (!record) {
      throw new NotFoundException('No trade credit account exists for you yet');
    }
    return record;
  }

  async findAll(query: QueryTradeCreditAccountsDto) {
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tradeCreditAccount.findMany({
        include: { account: true },
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tradeCreditAccount.count(),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  // Race-safe against two concurrent drawdowns both reading a stale
  // creditUsed and both deciding they fit under the limit — the same
  // problem OrdersService.checkout solved for stock, but this one needs
  // raw SQL: it compares two columns of the same row (creditUsed + amount
  // vs creditLimit), which Prisma's query builder can't express as an
  // atomic WHERE condition the way a column-vs-literal comparison (like
  // stock's `stockQty >= quantity`) can.
  async recordDrawdown(
    tradeCreditAccountId: string,
    dto: RecordDrawdownDto,
    actorEmail: string,
  ): Promise<TradeCreditAccount> {
    await this.assertExists(tradeCreditAccountId);

    const affected = await this.prisma.$executeRaw`
      UPDATE trade_credit_accounts
      SET "creditUsed" = "creditUsed" + ${dto.amount}, "updatedAt" = now()
      WHERE id = ${tradeCreditAccountId}
        AND "creditUsed" + ${dto.amount} <= "creditLimit"
    `;

    if (affected === 0) {
      throw new BadRequestException('This drawdown would exceed the account\'s available credit');
    }

    await this.auditLogService.record({
      actorEmail,
      action: 'trade_credit.drawdown',
      targetType: 'TradeCreditAccount',
      targetId: tradeCreditAccountId,
      metadata: { amount: dto.amount, reference: dto.reference ?? null },
    });

    return this.prisma.tradeCreditAccount.findUniqueOrThrow({ where: { id: tradeCreditAccountId } });
  }

  // Simpler than drawdown: comparing creditUsed (a column) to a literal
  // amount doesn't need raw SQL, since there's no second column involved —
  // Prisma's updateMany WHERE clause handles this natively, same shape as
  // the stock check in OrdersService.checkout.
  async recordRepayment(
    tradeCreditAccountId: string,
    dto: RecordRepaymentDto,
    actorEmail: string,
  ): Promise<TradeCreditAccount> {
    await this.assertExists(tradeCreditAccountId);

    const result = await this.prisma.tradeCreditAccount.updateMany({
      where: { id: tradeCreditAccountId, creditUsed: { gte: dto.amount } },
      data: { creditUsed: { decrement: dto.amount } },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'Repayment amount exceeds the outstanding balance — check for a data-entry error before retrying',
      );
    }

    await this.auditLogService.record({
      actorEmail,
      action: 'trade_credit.repayment',
      targetType: 'TradeCreditAccount',
      targetId: tradeCreditAccountId,
      metadata: { amount: dto.amount, reference: dto.reference ?? null },
    });

    return this.prisma.tradeCreditAccount.findUniqueOrThrow({ where: { id: tradeCreditAccountId } });
  }

  private async assertExists(id: string): Promise<void> {
    const record = await this.prisma.tradeCreditAccount.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Trade credit account '${id}' not found`);
    }
  }
}
