import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DeepMockProxy } from 'jest-mock-extended';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => undefined } }, // no REDIS_URL — local-dev-shaped
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it('reports ok when the database query succeeds', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.checks.database).toBe('ok');
  });

  it('reports degraded, not ok, when the database is unreachable', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.checks.database).toBe('error');
  });

  it('does not fail Redis check just because REDIS_URL is unset (local dev)', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);

    const result = await service.check();

    expect(result.checks.redis).toBe('ok');
  });
});
