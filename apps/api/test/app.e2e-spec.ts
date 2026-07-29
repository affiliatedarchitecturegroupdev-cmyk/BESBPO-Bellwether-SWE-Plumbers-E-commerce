import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/create-test-app';

// This suite requires a real, reachable Postgres database at DATABASE_URL
// (see test/.env.test.example) — it boots the actual AppModule, not a
// mocked one, so there's genuinely nothing to assert here without one.
// These tests were written and validated for internal consistency (they
// compile, the assertions match the real response shapes documented
// elsewhere in this codebase), but have NOT been executed against a live
// database in the environment this codebase was built in — there was no
// Postgres instance reachable there. Run `npm run test:e2e` with a real
// test database configured before trusting these pass; that's the first
// thing to verify in CI, not assume.
describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/health', () => {
    it('reports ok when the database is actually reachable', async () => {
      const response = await request(app.getHttpServer()).get('/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.checks.database).toBe('ok');
    });
  });

  describe('GET /v1/products', () => {
    it('returns a paginated envelope, unauthenticated — product browsing is public', async () => {
      const response = await request(app.getHttpServer()).get('/v1/products');

      expect(response.status).toBe(200);
      // The global TransformResponseInterceptor wraps every response in
      // {data, meta} — this is the one thing every endpoint in this API
      // has in common, so it's worth asserting on directly rather than
      // just the inner shape.
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta.timestamp');
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('total');
    });
  });

  describe('ValidationPipe (via POST /v1/reviews as a representative example)', () => {
    it('rejects a request missing required fields with a 400, not a 500', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/reviews')
        .send({}); // missing productId, rating, body entirely

      // No Authorization header either — this specific case should fail
      // on missing auth (401) before validation even runs, which is
      // itself worth confirming: auth guards run before the validation
      // pipe gets a chance to reject the empty body.
      expect(response.status).toBe(401);
    });

    it('rejects unknown properties on a public endpoint (forbidNonWhitelisted)', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/products')
        .query({ notARealQueryParam: 'x' });

      // QueryProductsDto doesn't declare this field — forbidNonWhitelisted
      // means this should be rejected as a 400, not silently ignored.
      expect(response.status).toBe(400);
    });
  });

  describe('KeycloakAuthGuard (via a protected endpoint)', () => {
    it('rejects an unauthenticated request to a protected endpoint with 401, not 500 or a silent pass-through', async () => {
      const response = await request(app.getHttpServer()).get('/v1/cart');

      expect(response.status).toBe(401);
    });

    it('rejects a request with a malformed bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/cart')
        .set('Authorization', 'Bearer not-a-real-jwt');

      expect(response.status).toBe(401);
    });
  });

  describe('global exception filter', () => {
    it('returns a 404 with the expected error body shape for an unknown product slug', async () => {
      const response = await request(app.getHttpServer()).get('/v1/products/this-product-does-not-exist');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
