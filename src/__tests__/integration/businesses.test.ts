import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});


describe('businesses', () => {
  test('GET /api/v1/businesses returns a list of businesses', async () => {
    const response = await request(BASE_URL)
      .get('/api/v1/businesses')
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: TEST_IDS.business1 }),
        expect.objectContaining({ id: TEST_IDS.business2 }),
      ])
    );
  });
});