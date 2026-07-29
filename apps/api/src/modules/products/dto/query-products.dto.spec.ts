import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryProductsDto } from './query-products.dto';

// Query-string values always arrive as strings — "false" is a non-empty
// string, so a naive @Type(() => Boolean) would produce Boolean('false')
// === true. This file exists specifically to prove the actual @Transform
// used instead handles both directions correctly, against real
// class-transformer behavior rather than just the reasoning in a comment.
describe('QueryProductsDto — inStockOnly transform', () => {
  async function transformAndValidate(inStockOnly: unknown) {
    const dto = plainToInstance(QueryProductsDto, { inStockOnly });
    const errors = await validate(dto);
    return { dto, errors };
  }

  it('transforms the query-string "true" to boolean true', async () => {
    const { dto, errors } = await transformAndValidate('true');
    expect(dto.inStockOnly).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('transforms the query-string "false" to boolean false, not true', async () => {
    const { dto, errors } = await transformAndValidate('false');
    expect(dto.inStockOnly).toBe(false);
    expect(errors).toHaveLength(0);
  });

  it('leaves an actual boolean true untouched', async () => {
    const { dto } = await transformAndValidate(true);
    expect(dto.inStockOnly).toBe(true);
  });
});
