import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { AddressesService } from './addresses.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('AddressesService', () => {
  let service: AddressesService;
  let prisma: DeepMockProxy<PrismaService>;

  const mockAccount = { id: 'acc-1', keycloakSub: 'sub-1', email: 'buyer@example.com' };
  const baseDto = { line1: '1 Main Rd', city: 'Durban', province: 'KZN', postalCode: '4001' };

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: { resolveOrCreate: jest.fn().mockResolvedValue(mockAccount) } },
      ],
    }).compile();

    service = module.get(AddressesService);
  });

  describe('create', () => {
    it("forces isDefault true for an account's first address, even if not requested", async () => {
      prisma.address.count.mockResolvedValue(0);
      prisma.address.create.mockResolvedValue({ id: 'addr-1' } as never);

      await service.create('sub-1', 'buyer@example.com', { ...baseDto, isDefault: false });

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { accountId: 'acc-1' },
        data: { isDefault: false },
      });
      expect(prisma.address.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isDefault: true }) }),
      );
    });

    it('does not force default for a second address unless explicitly requested', async () => {
      prisma.address.count.mockResolvedValue(1);
      prisma.address.create.mockResolvedValue({ id: 'addr-2' } as never);

      await service.create('sub-1', 'buyer@example.com', baseDto);

      expect(prisma.address.updateMany).not.toHaveBeenCalled();
      expect(prisma.address.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isDefault: false }) }),
      );
    });

    it('unsets other defaults when a new address explicitly requests isDefault', async () => {
      prisma.address.count.mockResolvedValue(1);
      prisma.address.create.mockResolvedValue({ id: 'addr-2' } as never);

      await service.create('sub-1', 'buyer@example.com', { ...baseDto, isDefault: true });

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { accountId: 'acc-1' },
        data: { isDefault: false },
      });
    });
  });

  describe('remove', () => {
    it('promotes the most recent remaining address to default, when the deleted one was default', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 'addr-1', accountId: 'acc-1', isDefault: true } as never);
      prisma.address.findFirst.mockResolvedValue({ id: 'addr-2' } as never);

      await service.remove('sub-1', 'buyer@example.com', 'addr-1');

      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr-2' },
        data: { isDefault: true },
      });
    });

    it('does not attempt to promote anything when the deleted address was not default', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 'addr-1', accountId: 'acc-1', isDefault: false } as never);

      await service.remove('sub-1', 'buyer@example.com', 'addr-1');

      expect(prisma.address.findFirst).not.toHaveBeenCalled();
      expect(prisma.address.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the address belongs to a different account', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 'addr-1', accountId: 'someone-else' } as never);
      await expect(service.remove('sub-1', 'buyer@example.com', 'addr-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the address does not exist', async () => {
      prisma.address.findUnique.mockResolvedValue(null);
      await expect(service.remove('sub-1', 'buyer@example.com', 'missing')).rejects.toThrow(NotFoundException);
    });
  });
});
