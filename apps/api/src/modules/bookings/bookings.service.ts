import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InstallationBooking } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(keycloakSub: string, email: string, dto: CreateBookingDto): Promise<InstallationBooking> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);

    if (dto.complexityMultiplierCodes?.length) {
      await this.assertMultipliersExist(dto.complexityMultiplierCodes);
    }
    if (dto.orderId) {
      await this.assertOrderBelongsToAccount(dto.orderId, account.id);
    }

    return this.prisma.installationBooking.create({
      data: {
        accountId: account.id,
        orderId: dto.orderId,
        sector: dto.sector,
        serviceCode: dto.serviceCode,
        siteAddress: dto.siteAddress,
        complexityMultiplierCodes: dto.complexityMultiplierCodes ?? [],
        notes: dto.notes,
      },
    });
  }

  async findMine(keycloakSub: string, email: string, query: QueryBookingsDto) {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.installationBooking.findMany({
        where: { accountId: account.id },
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.installationBooking.count({ where: { accountId: account.id } }),
    ]);

    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  // Admin path — every booking, plus the account it belongs to (an admin
  // scheduling a job needs to know whose it is).
  async findAllAdmin(query: QueryBookingsDto) {
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.installationBooking.findMany({
        include: { account: true },
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.installationBooking.count(),
    ]);

    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async findOneForAccount(keycloakSub: string, email: string, id: string): Promise<InstallationBooking> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const booking = await this.findByIdOrThrow(id);

    if (booking.accountId !== account.id) {
      throw new ForbiddenException(`Booking '${id}' does not belong to your account`);
    }
    return booking;
  }

  // Field-team/admin path — gated by the 'bookings:manage' scope in the
  // controller, same shape as OrdersService.updateStatus. Deliberately not
  // account-scoped: the person moving a booking from SCHEDULED to
  // IN_PROGRESS is a technician, not the customer who requested it.
  async updateStatus(id: string, dto: UpdateBookingStatusDto): Promise<InstallationBooking> {
    const existing = await this.prisma.installationBooking.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!existing) {
      throw new NotFoundException(`Booking '${id}' not found`);
    }

    const updated = await this.prisma.installationBooking.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.scheduledFor ? { scheduledFor: new Date(dto.scheduledFor) } : {}),
      },
    });

    // Was defined (job type + template) since the notifications module was
    // built, but never actually called until now — same "built, unwired"
    // gap /search-rank and /recommend had on the AI service side. Only
    // fires on a genuine transition to SCHEDULED with a real date — an
    // admin moving a booking to IN_PROGRESS or setting some other status
    // shouldn't re-send "your appointment is scheduled".
    if (dto.status === 'SCHEDULED' && updated.scheduledFor) {
      await this.notificationsService.queueBookingScheduled({
        recipientEmail: existing.account.email,
        bookingId: updated.id,
        scheduledFor: updated.scheduledFor.toISOString(),
        siteAddress: updated.siteAddress,
      });
    }

    return updated;
  }

  private async findByIdOrThrow(id: string): Promise<InstallationBooking> {
    const booking = await this.prisma.installationBooking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking '${id}' not found`);
    }
    return booking;
  }

  private async assertMultipliersExist(codes: string[]): Promise<void> {
    const found = await this.prisma.complexityMultiplier.count({ where: { code: { in: codes } } });
    if (found !== new Set(codes).size) {
      throw new BadRequestException('One or more complexity multiplier codes are unknown');
    }
  }

  private async assertOrderBelongsToAccount(orderId: string, accountId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    if (order.accountId !== accountId) {
      throw new ForbiddenException(`Order '${orderId}' does not belong to your account`);
    }
    // InstallationBooking.orderId is unique in schema.prisma — a second
    // booking attempt against an already-booked order surfaces via the
    // global Prisma exception filter's P2002 handling if this check is
    // somehow bypassed, but checking here first gives a clearer message.
    const existingBooking = await this.prisma.installationBooking.findUnique({ where: { orderId } });
    if (existingBooking) {
      throw new BadRequestException(`Order '${orderId}' already has a booking`);
    }
  }
}
