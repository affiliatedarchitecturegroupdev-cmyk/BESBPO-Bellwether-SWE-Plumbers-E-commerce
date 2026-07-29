import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Address } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  async create(keycloakSub: string, email: string, dto: CreateAddressDto): Promise<Address> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const existingCount = await this.prisma.address.count({ where: { accountId: account.id } });

    // The first address an account saves becomes the default regardless
    // of what's passed — an account with saved addresses but none marked
    // default is a confusing state for anything that later says "use my
    // default address" (checkout's saved-address picker does exactly
    // that). Every address after the first respects whatever isDefault
    // was actually requested.
    const shouldBeDefault = existingCount === 0 || dto.isDefault === true;

    if (shouldBeDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({ where: { accountId: account.id }, data: { isDefault: false } });
        return tx.address.create({ data: { ...dto, accountId: account.id, isDefault: true } });
      });
    }

    return this.prisma.address.create({ data: { ...dto, accountId: account.id, isDefault: false } });
  }

  async findMine(keycloakSub: string, email: string): Promise<Address[]> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    return this.prisma.address.findMany({
      where: { accountId: account.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async update(keycloakSub: string, email: string, id: string, dto: UpdateAddressDto): Promise<Address> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    await this.assertOwnership(id, account.id);

    if (dto.isDefault === true) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({ where: { accountId: account.id }, data: { isDefault: false } });
        return tx.address.update({ where: { id }, data: dto });
      });
    }

    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async remove(keycloakSub: string, email: string, id: string): Promise<void> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const address = await this.assertOwnership(id, account.id);

    await this.prisma.address.delete({ where: { id } });

    // Deleting the default address leaves nothing marked default — same
    // "confusing for the checkout picker" reasoning as create(). Promote
    // the most recently added remaining address, if any, rather than
    // leaving the account with saved addresses but no default at all.
    if (address.isDefault) {
      const nextDefault = await this.prisma.address.findFirst({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
      });
      if (nextDefault) {
        await this.prisma.address.update({ where: { id: nextDefault.id }, data: { isDefault: true } });
      }
    }
  }

  private async assertOwnership(addressId: string, accountId: string): Promise<Address> {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address) {
      throw new NotFoundException(`Address '${addressId}' not found`);
    }
    if (address.accountId !== accountId) {
      throw new ForbiddenException(`Address '${addressId}' does not belong to your account`);
    }
    return address;
  }
}
