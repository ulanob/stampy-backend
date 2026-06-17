import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import { CreateBusinessInput } from '../../models/business.model';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

const tempBusiness: CreateBusinessInput = {
  name: 'Temp Business',
  type: 'cafe',
};

async function createBusiness(payload: CreateBusinessInput = tempBusiness) {
  return request(BASE_URL)
    .post('/api/v1/businesses')
    .send(payload)
    .expect(201);
}

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
      expect.objectContaining({ id: TEST_IDS.business1 })
    );
  });

  test('GET /api/v1/businesses/:id returns 400 for invalid ID format', async () => {
    await request(BASE_URL)
      .get('/api/v1/businesses/999999')
      .expect(400);
  });

  test('GET /api/v1/businesses/:id returns 404 for business not found', async () => {
    await request(BASE_URL)
      .get(`/api/v1/businesses/${TEST_IDS.businessNonExistent}`)
      .expect(404);
  });

  test('GET /api/v1/businesses/:id returns 404 for deleted business', async () => {
    const { body: created } = await createBusiness();

    await request(BASE_URL)
      .delete(`/api/v1/businesses/${created.id}`)
      .expect(204);

    await request(BASE_URL)
      .get(`/api/v1/businesses/${created.id}`)
      .expect(404);
  });

  test('POST /api/v1/businesses creates a business', async () => {
    const body: CreateBusinessInput = { name: 'Test Restaurant', type: 'restaurant' };

    const response = await request(BASE_URL)
      .post('/api/v1/businesses')
      .send(body)
      .set('Accept', 'application/json')
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({ name: 'Test Restaurant', type: 'restaurant' })
    );
  });

  test('POST /api/v1/businesses rejects invalid business type', async () => {
    const response = await request(BASE_URL)
      .post('/api/v1/businesses')
      .send({ name: 'Bad Business', type: 'travel' })
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('POST /api/v1/businesses rejects invalid payload', async () => {
    const response = await request(BASE_URL)
      .post('/api/v1/businesses')
      .send({})
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('PATCH /api/v1/businesses/:id updates business type', async () => {
    const { body: created } = await createBusiness();

    const response = await request(BASE_URL)
      .patch(`/api/v1/businesses/${created.id}`)
      .send({ type: 'retail' })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({ type: 'retail' })
    );
  });

  test('PATCH /api/v1/businesses/:id returns 400 for invalid business type', async () => {
    const { body: created } = await createBusiness();

    const response = await request(BASE_URL)
      .patch(`/api/v1/businesses/${created.id}`)
      .send({ type: 'travel' })
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('PATCH /api/v1/businesses/:id returns 400 for invalid ID format', async () => {
    await request(BASE_URL)
      .patch('/api/v1/businesses/999999')
      .send({ type: 'cafe' })
      .expect(400);
  });

  test('PATCH /api/v1/businesses/:id returns 404 for business not found', async () => {
    const response = await request(BASE_URL)
      .patch(`/api/v1/businesses/${TEST_IDS.businessNonExistent}`)
      .send({ type: 'cafe' })
      .expect(404);

    expect(response.body.error).toBeDefined();
  });

  test('DELETE /api/v1/businesses/:id deletes a business', async () => {
    const { body: created } = await createBusiness();

    await request(BASE_URL)
      .delete(`/api/v1/businesses/${created.id}`)
      .expect(204);
  });

  test('DELETE /api/v1/businesses/:id returns 404 for business not found', async () => {
    const response = await request(BASE_URL)
      .delete(`/api/v1/businesses/${TEST_IDS.businessNonExistent}`)
      .expect(404);

    expect(response.body.error).toBeDefined();
  });

  test('DELETE /api/v1/businesses/:id returns 400 for already deleted business', async () => {
    const { body: created } = await createBusiness();

    await request(BASE_URL)
      .delete(`/api/v1/businesses/${created.id}`)
      .expect(204);

    const response = await request(BASE_URL)
      .delete(`/api/v1/businesses/${created.id}`)
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
});