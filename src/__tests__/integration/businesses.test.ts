import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import { CreateBusinessInput } from "../../models/business.model";


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

  test('GET /api/v1/businesses/:id returns a business', async () => {
    const response = await request(BASE_URL)
      .get(`/api/v1/businesses/${TEST_IDS.business1}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: TEST_IDS.business1,
      })
    );
  });

  test('GET /api/v1/businesses/:id returns 400 for Invalid ID format', async () => {
    await request(BASE_URL)
      .get('/api/v1/businesses/999999')
      .expect(400);
  });

  test('GET /api/v1/businesses/:id returns 404 for Business not found', async () => {
    await request(BASE_URL)
      .get('/api/v1/businesses/f1b2c3d4-0000-0000-0000-000000000022')
      .expect(404);
  });

  test('POST /api/v1/businesses posts a business', async () => {
    const body: CreateBusinessInput = { name: "Test Restaurant", type: "restaurant"}
    const response = await request(BASE_URL)
    .post('/api/v1/businesses')
    .send(body)
    .set('Accept', 'application/json')
    .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({name: "Test Restaurant", type: "restaurant"})
    )
  })

  test('POST /api/v1/businesses rejects invalid payload', async () => {
    const response = await request(BASE_URL)
      .post('/api/v1/businesses')
      .send({})
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
});