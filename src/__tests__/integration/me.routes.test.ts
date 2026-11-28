import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import { authHeader } from '../helpers/auth';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

describe('GET /api/v1/me', () => {
  test('returns the seeded user for a valid access token', async () => {
    const response = await request(BASE_URL)
      .get('/api/v1/me')
      .set(await authHeader())
      .expect(200);

    expect(response.body.id).toBe(TEST_IDS.user1);
    expect(response.body).not.toHaveProperty('auth_provider_id');
  });

  test('returns 401 when the Authorization header is missing', async () => {
    const response = await request(BASE_URL).get('/api/v1/me').expect(401);
    expect(response.body.error).toBeDefined();
  });

  test('returns 401 for a non-Bearer scheme', async () => {
    await request(BASE_URL)
      .get('/api/v1/me')
      .set('Authorization', 'Basic dXNlcjpwYXNz')
      .expect(401);
  });

  test('returns 401 for a malformed token', async () => {
    const response = await request(BASE_URL)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer not-a-real-jwt')
      .expect(401);
    expect(response.body.error).toBe('Invalid or expired token');
  });
});
