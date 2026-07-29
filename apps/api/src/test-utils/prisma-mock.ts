import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

// One factory, reused by every *.service.spec.ts — mocks the entire Prisma
// client shape (every model's every method) without hand-writing jest.fn()
// per method per test file. If a test needs $transaction to actually invoke
// its callback (rather than just recording that it was called), pass a
// mock implementation for that specific test — the default here just
// resolves whatever the callback/array returns, which suffices for most
// cases (see products.service.spec.ts and orders.service.spec.ts).
export function createPrismaMock(): DeepMockProxy<PrismaService> {
  const mock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaService>;

  mock.$transaction.mockImplementation(((arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: DeepMockProxy<PrismaService>) => unknown)(mock);
    }
    return Promise.all(arg as Promise<unknown>[]);
  }) as PrismaService['$transaction']);

  return mock;
}
