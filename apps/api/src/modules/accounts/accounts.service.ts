import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Account, AccountMember, AccountMemberRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryAccountsDto } from './dto/query-accounts.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  // Every authenticated request carries a valid Keycloak identity, but not
  // every identity has an Account row yet on its first call — this
  // provisions one lazily rather than requiring a separate signup step.
  // Every other module that needs "the current account" (cart, orders,
  // bookings, warranty, trade-credit) should go through this, not query
  // Prisma directly — see docs/AGENTS.md.
  //
  // Four possible outcomes, checked in order:
  //  1. This keycloakSub is already an Account's own (the original owner,
  //     unchanged behavior from before AccountMember existed).
  //  2. This keycloakSub is already a LINKED AccountMember (an invited
  //     colleague who's logged in before) — return their account.
  //  3. This email matches a PENDING invite (an AccountMember row with no
  //     keycloakSub yet) — this is that person's first login since being
  //     invited; link it (set keycloakSub + joinedAt) and return that
  //     account, rather than creating a brand new standalone one.
  //  4. None of the above — a genuinely new identity with no invite
  //     waiting for them; create a new Account, exactly as before.
  async resolveOrCreate(keycloakSub: string, email: string): Promise<Account> {
    const ownAccount = await this.prisma.account.findUnique({ where: { keycloakSub } });
    if (ownAccount) return ownAccount;

    const linkedMembership = await this.prisma.accountMember.findUnique({
      where: { keycloakSub },
      include: { account: true },
    });
    if (linkedMembership) return linkedMembership.account;

    const pendingInvite = await this.prisma.accountMember.findFirst({
      where: { email, keycloakSub: null },
    });
    if (pendingInvite) {
      const linked = await this.prisma.accountMember.update({
        where: { id: pendingInvite.id },
        data: { keycloakSub, joinedAt: new Date() },
        include: { account: true },
      });
      return linked.account;
    }

    // Same upsert reasoning as before AccountMember existed — two
    // concurrent first-time requests from a genuinely new identity could
    // otherwise both see "nothing matches" above and both attempt to
    // create an Account, racing keycloakSub's unique constraint.
    return this.prisma.account.upsert({
      where: { keycloakSub },
      update: {},
      create: { keycloakSub, email },
    });
  }

  // Guest checkout — resolves purely by EMAIL, never by keycloakSub,
  // since a guest never has a real Keycloak identity to look one up by.
  // Deliberately reuses whatever account already owns this email if one
  // exists — whether that's a real, logged-in-before account (someone
  // who forgot they already had one, or is deliberately checking out
  // without bothering to log in this time) or a previous guest checkout
  // with the same email — rather than trying to create a second Account
  // and hitting email's own unique constraint. This is what makes
  // returning-guest and already-has-a-real-account both "just work" with
  // the same code path, not two separate ones.
  async resolveOrCreateGuest(email: string, companyName?: string, phone?: string): Promise<Account> {
    const existing = await this.prisma.account.findUnique({ where: { email } });
    if (existing) return existing;

    return this.prisma.account.create({
      data: {
        // Guaranteed to never collide with a real JWT's sub claim — a
        // real Keycloak sub is never formatted like this. Satisfies
        // keycloakSub's own NOT NULL + UNIQUE constraint without a schema
        // change to make it nullable, which would have meant touching
        // every other place in this codebase that assumes an Account
        // always has one.
        keycloakSub: `guest:${randomUUID()}`,
        email,
        companyName,
        phone,
        isGuest: true,
      },
    });
  }

  // Owner-only — see AccountMemberRole's own comment on why this
  // deliberately small permission set exists. "Owner" here means either
  // the original Account.keycloakSub holder, or a member explicitly
  // promoted to the OWNER role — both checked, not just the former,
  // so that role actually means something rather than being vestigial.
  async inviteMember(callerKeycloakSub: string, callerEmail: string, inviteeEmail: string): Promise<AccountMember> {
    const account = await this.requireOwnerAccount(callerKeycloakSub, callerEmail);

    if (inviteeEmail === account.email) {
      throw new ConflictException('That is already the account owner\u2019s own email');
    }

    const existing = await this.prisma.accountMember.findUnique({
      where: { accountId_email: { accountId: account.id, email: inviteeEmail } },
    });
    if (existing) {
      throw new ConflictException('That email has already been invited to this account');
    }

    return this.prisma.accountMember.create({
      data: { accountId: account.id, email: inviteeEmail },
    });
  }

  async listMembers(callerKeycloakSub: string, callerEmail: string): Promise<AccountMember[]> {
    const account = await this.resolveOrCreate(callerKeycloakSub, callerEmail);
    return this.prisma.accountMember.findMany({ where: { accountId: account.id }, orderBy: { invitedAt: 'asc' } });
  }

  async removeMember(callerKeycloakSub: string, callerEmail: string, memberId: string): Promise<void> {
    const account = await this.requireOwnerAccount(callerKeycloakSub, callerEmail);

    const member = await this.prisma.accountMember.findUnique({ where: { id: memberId } });
    if (!member || member.accountId !== account.id) {
      throw new NotFoundException(`Member '${memberId}' not found on this account`);
    }

    await this.prisma.accountMember.delete({ where: { id: memberId } });
  }

  // Promoting someone to OWNER makes AccountMemberRole's own OWNER value
  // actually reachable through the product — until this existed, the
  // role only meant anything via direct database access. Owner-only,
  // same enforcement as invite/remove; a promoted co-owner can then also
  // promote/demote others, not just invite.
  async updateMemberRole(
    callerKeycloakSub: string,
    callerEmail: string,
    memberId: string,
    role: AccountMemberRole,
  ): Promise<AccountMember> {
    const account = await this.requireOwnerAccount(callerKeycloakSub, callerEmail);

    const member = await this.prisma.accountMember.findUnique({ where: { id: memberId } });
    if (!member || member.accountId !== account.id) {
      throw new NotFoundException(`Member '${memberId}' not found on this account`);
    }

    return this.prisma.accountMember.update({ where: { id: memberId }, data: { role } });
  }

  private async requireOwnerAccount(keycloakSub: string, email: string): Promise<Account> {
    const account = await this.resolveOrCreate(keycloakSub, email);
    if (account.keycloakSub === keycloakSub) return account; // the original holder

    const membership = await this.prisma.accountMember.findUnique({ where: { keycloakSub } });
    if (membership?.role === 'OWNER' && membership.accountId === account.id) return account;

    throw new ForbiddenException('Only the account owner can manage members');
  }

  async findByKeycloakSub(keycloakSub: string): Promise<Account | null> {
    return this.prisma.account.findUnique({ where: { keycloakSub } });
  }

  // The missing counterpart to resolveOrCreate's read side — until this,
  // there was no way for a customer to change their own name/phone, or
  // correct their email, after the account auto-created on first login
  // (see docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md §6.6). Safe to let
  // email drift from whatever Keycloak's JWT claims — resolveOrCreate's
  // upsert never refreshes it on subsequent logins (see that method's own
  // comment), so an edit here won't get silently overwritten next time
  // this identity signs in.
  async updateProfile(keycloakSub: string, email: string, dto: UpdateProfileDto): Promise<Account> {
    const account = await this.resolveOrCreate(keycloakSub, email);

    if (dto.email && dto.email !== account.email) {
      const existing = await this.prisma.account.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== account.id) {
        throw new ConflictException('That email is already in use by another account');
      }
    }

    return this.prisma.account.update({
      where: { id: account.id },
      data: dto,
    });
  }

  // POPIA data-portability request — everything personally tied to this
  // account, gathered in one call. Deliberately excludes the cart: it's
  // ephemeral working state, not something a "what data do you hold on
  // me" request is really asking about.
  async exportData(keycloakSub: string, email: string) {
    const account = await this.resolveOrCreate(keycloakSub, email);

    const [addresses, orders, bookings, warranties, cocRecords, reviews, tradeCreditAccount] =
      await Promise.all([
        this.prisma.address.findMany({ where: { accountId: account.id } }),
        this.prisma.order.findMany({
          where: { accountId: account.id },
          include: { lineItems: true },
        }),
        this.prisma.installationBooking.findMany({ where: { accountId: account.id } }),
        this.prisma.warrantyRecord.findMany({ where: { accountId: account.id } }),
        this.prisma.coCRecord.findMany({ where: { booking: { accountId: account.id } } }),
        this.prisma.review.findMany({ where: { accountId: account.id } }),
        this.prisma.tradeCreditAccount.findUnique({ where: { accountId: account.id } }),
      ]);

    return {
      profile: account,
      addresses,
      orders,
      bookings,
      warranties,
      certificatesOfCompliance: cocRecords,
      reviews,
      tradeCreditAccount,
      exportedAt: new Date().toISOString(),
    };
  }

  // POPIA erasure request — deliberately anonymization, not a hard delete
  // of everything. Orders, bookings, warranty records, and CoC records are
  // KEPT: financial transaction history generally has its own legal
  // retention requirements (tax, accounting) independent of a data-subject
  // erasure request, and CoC records specifically are the plumber's own
  // regulatory attestation, not solely the customer's personal data to
  // begin with. What's fully removed is data that's *only* personal —
  // addresses, reviews, the cart. The account record itself is
  // anonymized rather than deleted so the (kept) orders/bookings/etc.
  // still have a valid accountId to reference.
  //
  // This is a reasonable interpretation, not legal advice — verify the
  // actual retention/erasure balance with counsel before relying on this
  // for real compliance. Known gap, stated plainly rather than hidden:
  // keycloakSub is left untouched, so if this same Keycloak identity
  // signs in again later, resolveOrCreate's upsert will find and return
  // this now-anonymized account rather than starting fresh — there's no
  // "re-registration after erasure" flow designed here.
  // Branches on who's actually asking, not just "the account" — a real
  // correctness issue AccountMember surfaced, not a pre-existing one:
  // once an account can have multiple people on it, "erase MY data" from
  // an invited BUYER is a fundamentally different request than "erase
  // this account's data" from the original owner. The owner's email/
  // companyName/phone belong to the account (and, in spirit, the
  // company) — an invited member has no standing to have those wiped,
  // and doing so would incorrectly affect every other member sharing
  // that account. An invited member's own "personal data" in this
  // context really is just their own membership record.
  async eraseData(keycloakSub: string, email: string): Promise<void> {
    const account = await this.resolveOrCreate(keycloakSub, email);

    if (account.keycloakSub !== keycloakSub) {
      // Not the original owner — this identity resolved to a shared
      // account via AccountMember. Erase only their own membership;
      // never touch the shared account's own fields.
      await this.prisma.accountMember.deleteMany({ where: { accountId: account.id, keycloakSub } });
      return;
    }

    const anonymizedEmail = `deleted-${account.id}@anonymized.local`;

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: account.id },
        data: { email: anonymizedEmail, companyName: null, phone: null },
      }),
      this.prisma.address.deleteMany({ where: { accountId: account.id } }),
      this.prisma.review.deleteMany({ where: { accountId: account.id } }),
      this.prisma.cartItem.deleteMany({ where: { cart: { accountId: account.id } } }),
      this.prisma.cart.deleteMany({ where: { accountId: account.id } }),
      // The owner's own erasure request reasonably includes removing
      // every OTHER member too — those members' access existed only
      // because this owner's account granted it, and there'd be no
      // account left for their AccountMember rows to meaningfully
      // belong to once the owner's own data is anonymized.
      this.prisma.accountMember.deleteMany({ where: { accountId: account.id } }),
    ]);
  }

  // Admin-only — the customer/account listing that never existed
  // anywhere before this. Every other method on this service is scoped
  // to "me" (the current caller's own account); this is the first
  // genuinely admin-wide view. Real search across both email and
  // companyName together, since an admin looking for a specific
  // customer rarely knows which field they'll actually be found under.
  async findAllAdmin(
    query: QueryAccountsDto,
  ): Promise<{ items: Account[]; page: number; pageSize: number; total: number }> {
    const { search, type, page, pageSize } = query;
    const where: Prisma.AccountWhereInput = {
      ...(type ? { type } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { companyName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.account.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  // Admin-only detail view — a few real, useful aggregates alongside the
  // account itself (order count, trade credit status if any) so
  // reviewing one customer doesn't require opening several other admin
  // screens to piece together the same picture.
  async findOneAdmin(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        tradeCreditAccount: true,
        _count: { select: { orders: true } },
      },
    });
    if (!account) throw new NotFoundException(`Account '${id}' not found`);
    return account;
  }
}
