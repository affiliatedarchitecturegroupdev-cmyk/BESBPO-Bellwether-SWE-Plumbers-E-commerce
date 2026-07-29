import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

// Service-level tests (products.service.spec.ts) mock Prisma directly and
// never run real class-validator decorators — this file exists
// specifically to prove the variant-field validation actually behaves as
// intended, since it has a genuinely subtle nuance: @ValidateIf alone
// isn't enough here, because @IsUUID()/@IsString() would still reject an
// explicit `null` even when ValidateIf's condition means "skip this
// check." Found and fixed while wiring up the admin form, which needs to
// send {variantGroupId: null, variantValue: null} to clear a previously
// set assignment — not just omit both fields.
describe('CreateProductDto — variant field validation', () => {
  const baseFields = {
    sku: 'BSWE-TEST',
    slug: 'test',
    name: 'Test',
    categoryId: '11111111-1111-1111-1111-111111111111',
    retailPrice: 100,
    tradePrice: 80,
  };

  async function validateDto(fields: Record<string, unknown>) {
    const dto = plainToInstance(CreateProductDto, { ...baseFields, ...fields });
    return validate(dto);
  }

  it('passes when both variant fields are omitted (a standalone, non-variant product)', async () => {
    const errors = await validateDto({});
    expect(errors).toHaveLength(0);
  });

  it('passes when both variant fields are set to real values', async () => {
    const errors = await validateDto({
      variantGroupId: '22222222-2222-2222-2222-222222222222',
      variantValue: '15mm',
    });
    expect(errors).toHaveLength(0);
  });

  it('passes when both variant fields are explicitly null — clearing a previous assignment', async () => {
    const errors = await validateDto({ variantGroupId: null, variantValue: null });
    expect(errors).toHaveLength(0);
  });

  it('fails when variantGroupId is set but variantValue is missing', async () => {
    const errors = await validateDto({ variantGroupId: '22222222-2222-2222-2222-222222222222' });
    expect(errors.some((e) => e.property === 'variantValue')).toBe(true);
  });

  it('fails when variantValue is set but variantGroupId is missing', async () => {
    const errors = await validateDto({ variantValue: '15mm' });
    expect(errors.some((e) => e.property === 'variantGroupId')).toBe(true);
  });

  it('fails when variantGroupId is not a real UUID', async () => {
    const errors = await validateDto({ variantGroupId: 'not-a-uuid', variantValue: '15mm' });
    expect(errors.some((e) => e.property === 'variantGroupId')).toBe(true);
  });
});
