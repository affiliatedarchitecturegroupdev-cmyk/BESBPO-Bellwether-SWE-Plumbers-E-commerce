import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: DeepMockProxy<PrismaService>;

  const mockAccount = { id: 'acc-1', keycloakSub: 'sub-1', email: 'buyer@example.com' };

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.account.upsert.mockResolvedValue(mockAccount as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AccountsService);
  });

  describe('exportData', () => {
    it('gathers every category of personal data, but not the cart', async () => {
      prisma.address.findMany.mockResolvedValue([] as never);
      prisma.order.findMany.mockResolvedValue([] as never);
      prisma.installationBooking.findMany.mockResolvedValue([] as never);
      prisma.warrantyRecord.findMany.mockResolvedValue([] as never);
      prisma.coCRecord.findMany.mockResolvedValue([] as never);
      prisma.review.findMany.mockResolvedValue([] as never);
      prisma.tradeCreditAccount.findUnique.mockResolvedValue(null);

      const result = await service.exportData('sub-1', 'buyer@example.com');

      expect(result.profile).toEqual(mockAccount);
      expect(result).toHaveProperty('orders');
      expect(result).toHaveProperty('bookings');
      expect(result).toHaveProperty('certificatesOfCompliance');
      expect(result).not.toHaveProperty('cart');
    });
  });

  describe('eraseData', () => {
    it('anonymizes the account rather than deleting it', async () => {
      await service.eraseData('sub-1', 'buyer@example.com');

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { email: 'deleted-acc-1@anonymized.local', companyName: null, phone: null },
      });
    });

    it('deletes purely personal data: addresses, reviews, and the cart', async () => {
      await service.eraseData('sub-1', 'buyer@example.com');

      expect(prisma.address.deleteMany).toHaveBeenCalledWith({ where: { accountId: 'acc-1' } });
      expect(prisma.review.deleteMany).toHaveBeenCalledWith({ where: { accountId: 'acc-1' } });
      expect(prisma.cart.deleteMany).toHaveBeenCalledWith({ where: { accountId: 'acc-1' } });
    });

    it('does NOT delete orders, bookings, warranty, or CoC records — these need retention', async () => {
      await service.eraseData('sub-1', 'buyer@example.com');

      expect(prisma.order.deleteMany).not.toHaveBeenCalled();
      expect(prisma.installationBooking.deleteMany).not.toHaveBeenCalled();
      expect(prisma.warrantyRecord.deleteMany).not.toHaveBeenCalled();
      expect(prisma.coCRecord.deleteMany).not.toHaveBeenCalled();
    });

    it('performs every deletion inside a single transaction', async () => {
      await service.eraseData('sub-1', 'buyer@example.com');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateProfile', () => {
    it('updates companyName and phone without touching email when none is given', async () => {
      prisma.account.update.mockResolvedValue({ ...mockAccount, companyName: 'Acme Plumbing' } as never);

      await service.updateProfile('sub-1', 'buyer@example.com', { companyName: 'Acme Plumbing', phone: '0821234567' });

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { companyName: 'Acme Plumbing', phone: '0821234567' },
      });
      expect(prisma.account.findUnique).not.toHaveBeenCalled(); // no email-uniqueness check needed when email isn't changing
    });

    it('allows changing email when the new address is not already in use', async () => {
      prisma.account.findUnique.mockResolvedValue(null); // no other account has this email
      prisma.account.update.mockResolvedValue({ ...mockAccount, email: 'new@example.com' } as never);

      await service.updateProfile('sub-1', 'buyer@example.com', { email: 'new@example.com' });

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { email: 'new@example.com' },
      });
    });

    it('throws ConflictException when the new email already belongs to a different account', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: 'someone-elses-account-id' } as never);

      await expect(
        service.updateProfile('sub-1', 'buyer@example.com', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it('does not throw when "changing" email to the value it already is', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never); // resolveOrCreate's own lookup
      prisma.account.update.mockResolvedValue(mockAccount as never);

      await service.updateProfile('sub-1', 'buyer@example.com', { email: mockAccount.email });

      // resolveOrCreate's own keycloakSub-based lookup happens regardless
      // (that's not what this test is about) — what should specifically
      // NOT happen is the separate email-uniqueness check, since the
      // email isn't actually changing.
      expect(prisma.account.findUnique).not.toHaveBeenCalledWith({ where: { email: mockAccount.email } });
      expect(prisma.account.update).toHaveBeenCalled();
    });
  });

  describe('resolveOrCreate — the full member-resolution chain', () => {
    it('returns the account directly when the keycloakSub is its own original owner', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);

      const result = await service.resolveOrCreate('sub-1', 'buyer@example.com');

      expect(result).toEqual(mockAccount);
      expect(prisma.accountMember.findUnique).not.toHaveBeenCalled();
    });

    it('returns the shared account when the keycloakSub is already a LINKED member', async () => {
      prisma.account.findUnique.mockResolvedValue(null); // not an original owner
      prisma.accountMember.findUnique.mockResolvedValue({
        id: 'member-1',
        accountId: 'acc-1',
        keycloakSub: 'sub-colleague',
        account: mockAccount,
      } as never);

      const result = await service.resolveOrCreate('sub-colleague', 'colleague@example.com');

      expect(result).toEqual(mockAccount);
      expect(prisma.accountMember.findFirst).not.toHaveBeenCalled();
      expect(prisma.account.upsert).not.toHaveBeenCalled();
    });

    it('links a PENDING invite on first login (matches by email, keycloakSub still null) and returns that account', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.accountMember.findUnique.mockResolvedValue(null); // not yet linked
      prisma.accountMember.findFirst.mockResolvedValue({
        id: 'member-1',
        accountId: 'acc-1',
        email: 'colleague@example.com',
        keycloakSub: null,
      } as never);
      prisma.accountMember.update.mockResolvedValue({ id: 'member-1', account: mockAccount } as never);

      const result = await service.resolveOrCreate('sub-new-colleague', 'colleague@example.com');

      expect(prisma.accountMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'member-1' },
          data: expect.objectContaining({ keycloakSub: 'sub-new-colleague' }),
        }),
      );
      expect(result).toEqual(mockAccount);
      expect(prisma.account.upsert).not.toHaveBeenCalled();
    });

    it('creates a genuinely new account when nothing matches at all — no invite, no existing membership', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.accountMember.findUnique.mockResolvedValue(null);
      prisma.accountMember.findFirst.mockResolvedValue(null);
      prisma.account.upsert.mockResolvedValue(mockAccount as never);

      const result = await service.resolveOrCreate('sub-brand-new', 'newperson@example.com');

      expect(prisma.account.upsert).toHaveBeenCalled();
      expect(result).toEqual(mockAccount);
    });
  });

  describe('inviteMember', () => {
    it('lets the original account owner invite a new member', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never); // caller is the owner
      prisma.accountMember.findUnique.mockResolvedValue(null); // owner-check path, not called in this branch since account.keycloakSub matches directly
      prisma.accountMember.create.mockResolvedValue({ id: 'member-1' } as never);

      await service.inviteMember('sub-1', 'buyer@example.com', 'colleague@example.com');

      expect(prisma.accountMember.create).toHaveBeenCalledWith({
        data: { accountId: 'acc-1', email: 'colleague@example.com' },
      });
    });

    it('rejects a non-owner caller with ForbiddenException', async () => {
      prisma.account.findUnique.mockResolvedValue(null); // caller is not an original owner
      prisma.accountMember.findUnique.mockResolvedValue({
        accountId: 'acc-1',
        keycloakSub: 'sub-buyer',
        role: 'BUYER',
        account: mockAccount,
      } as never);

      await expect(service.inviteMember('sub-buyer', 'buyer2@example.com', 'someone@example.com')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.accountMember.create).not.toHaveBeenCalled();
    });

    it('allows a member explicitly promoted to OWNER to also invite', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.accountMember.findUnique.mockResolvedValue({
        accountId: 'acc-1',
        keycloakSub: 'sub-co-owner',
        role: 'OWNER',
        account: mockAccount,
      } as never);
      prisma.accountMember.create.mockResolvedValue({ id: 'member-2' } as never);

      await service.inviteMember('sub-co-owner', 'coowner@example.com', 'newperson@example.com');

      expect(prisma.accountMember.create).toHaveBeenCalled();
    });

    it('rejects inviting the same email twice to the same account', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.accountMember.findUnique.mockResolvedValue({ id: 'existing' } as never);

      await expect(
        service.inviteMember('sub-1', 'buyer@example.com', 'colleague@example.com'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeMember', () => {
    it('lets the owner remove a member belonging to their own account', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.accountMember.findUnique.mockResolvedValue({ id: 'member-1', accountId: 'acc-1' } as never);

      await service.removeMember('sub-1', 'buyer@example.com', 'member-1');

      expect(prisma.accountMember.delete).toHaveBeenCalledWith({ where: { id: 'member-1' } });
    });

    it('throws NotFoundException, without deleting anything, for a member belonging to a DIFFERENT account', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.accountMember.findUnique.mockResolvedValue({ id: 'member-1', accountId: 'someone-elses-acc' } as never);

      await expect(service.removeMember('sub-1', 'buyer@example.com', 'member-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.accountMember.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateMemberRole', () => {
    it('lets the owner promote a member to OWNER', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.accountMember.findUnique.mockResolvedValue({ id: 'member-1', accountId: 'acc-1' } as never);
      prisma.accountMember.update.mockResolvedValue({ id: 'member-1', role: 'OWNER' } as never);

      await service.updateMemberRole('sub-1', 'buyer@example.com', 'member-1', 'OWNER' as never);

      expect(prisma.accountMember.update).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        data: { role: 'OWNER' },
      });
    });

    it('rejects a non-owner caller with ForbiddenException', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.accountMember.findUnique.mockResolvedValue({
        accountId: 'acc-1',
        keycloakSub: 'sub-buyer',
        role: 'BUYER',
        account: mockAccount,
      } as never);

      await expect(
        service.updateMemberRole('sub-buyer', 'buyer2@example.com', 'member-1', 'OWNER' as never),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.accountMember.update).not.toHaveBeenCalled();
    });

    it('a promoted co-owner can also change roles, not just the original holder', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.accountMember.findUnique.mockResolvedValue({
        accountId: 'acc-1',
        keycloakSub: 'sub-co-owner',
        role: 'OWNER',
        account: mockAccount,
      } as never);
      prisma.accountMember.update.mockResolvedValue({ id: 'member-2' } as never);

      await service.updateMemberRole('sub-co-owner', 'coowner@example.com', 'member-2', 'BUYER' as never);

      expect(prisma.accountMember.update).toHaveBeenCalled();
    });

    it('throws NotFoundException for a member on a different account', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.accountMember.findUnique.mockResolvedValue({ id: 'member-1', accountId: 'someone-elses-acc' } as never);

      await expect(
        service.updateMemberRole('sub-1', 'buyer@example.com', 'member-1', 'OWNER' as never),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.accountMember.update).not.toHaveBeenCalled();
    });
  });

  describe('eraseData — branches on who is actually asking', () => {
    it('anonymizes the full shared account when the ORIGINAL owner requests erasure', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never); // caller IS the owner

      await service.eraseData('sub-1', 'buyer@example.com');

      expect(prisma.account.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ companyName: null, phone: null }) }),
      );
      expect(prisma.accountMember.deleteMany).toHaveBeenCalledWith({ where: { accountId: 'acc-1' } });
    });

    it('only removes their OWN membership, never touching shared account fields, when an invited member requests erasure', async () => {
      prisma.account.findUnique.mockResolvedValue(null); // caller is not the original owner
      prisma.accountMember.findUnique.mockResolvedValue({
        accountId: 'acc-1',
        keycloakSub: 'sub-colleague',
        account: mockAccount,
      } as never);

      await service.eraseData('sub-colleague', 'colleague@example.com');

      expect(prisma.accountMember.deleteMany).toHaveBeenCalledWith({
        where: { accountId: 'acc-1', keycloakSub: 'sub-colleague' },
      });
      expect(prisma.account.update).not.toHaveBeenCalled();
      expect(prisma.address.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('resolveOrCreateGuest', () => {
    it('creates a new guest account, with a synthetic keycloakSub and isGuest true, when the email is new', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue({ id: 'guest-1', email: 'guest@example.com', isGuest: true } as never);

      await service.resolveOrCreateGuest('guest@example.com', 'Acme Ltd', '0821234567');

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'guest@example.com',
          companyName: 'Acme Ltd',
          phone: '0821234567',
          isGuest: true,
          keycloakSub: expect.stringMatching(/^guest:/),
        }),
      });
    });

    it('reuses an existing account by email — whether a previous guest or a real logged-in-before account — instead of creating a duplicate', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-existing',
        email: 'returning@example.com',
        isGuest: false,
      } as never);

      const result = await service.resolveOrCreateGuest('returning@example.com');

      expect(result).toEqual(expect.objectContaining({ id: 'acc-existing' }));
      expect(prisma.account.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllAdmin', () => {
    it('searches across BOTH email and companyName together, not just one field', async () => {
      prisma.$transaction.mockResolvedValue([[], 0] as never);

      await service.findAllAdmin({ search: 'acme', page: 1, pageSize: 24 });

      const [call] = prisma.account.findMany.mock.calls;
      expect(call[0].where.OR).toEqual([
        { email: { contains: 'acme', mode: 'insensitive' } },
        { companyName: { contains: 'acme', mode: 'insensitive' } },
      ]);
    });

    it('filters by account type when provided', async () => {
      prisma.$transaction.mockResolvedValue([[], 0] as never);

      await service.findAllAdmin({ type: 'TRADE' as never, page: 1, pageSize: 24 });

      const [call] = prisma.account.findMany.mock.calls;
      expect(call[0].where.type).toBe('TRADE');
    });

    it('paginates correctly — page 2 skips the first page worth of results', async () => {
      prisma.$transaction.mockResolvedValue([[], 0] as never);

      await service.findAllAdmin({ page: 2, pageSize: 10 });

      const [call] = prisma.account.findMany.mock.calls;
      expect(call[0].skip).toBe(10);
      expect(call[0].take).toBe(10);
    });

    it('returns the real total count alongside the page of items, not just the page length', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: 'acc-1' }], 137] as never);

      const result = await service.findAllAdmin({ page: 1, pageSize: 24 });

      expect(result.total).toBe(137);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findOneAdmin', () => {
    it('throws NotFoundException for an account that does not exist', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      await expect(service.findOneAdmin('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('includes trade credit status and order count alongside the account itself', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc-1',
        tradeCreditAccount: { creditLimit: '5000.00' },
        _count: { orders: 12 },
      } as never);

      const result = await service.findOneAdmin('acc-1');

      expect(result).toEqual(
        expect.objectContaining({
          tradeCreditAccount: expect.objectContaining({ creditLimit: '5000.00' }),
          _count: { orders: 12 },
        }),
      );
    });
  });
});
