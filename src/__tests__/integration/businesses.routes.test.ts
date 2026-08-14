import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import { CreateBusinessInput } from '../../models/business.model';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

function createBusiness(payload: Partial<CreateBusinessInput>) {
  return request(BASE_URL).post('/api/v1/businesses').send(payload);
}

describe('businesses routes', () => {
  test('POST creates a business', async () => {
    const response = await createBusiness({ name: 'New Cafe', type: 'cafe' }).expect(201);
    expect(response.body).toEqual(expect.objectContaining({ name: 'New Cafe', type: 'cafe' }));
  });

  test('POST rejects missing name', async () => {
    const response = await createBusiness({ type: 'cafe' }).expect(400);
    expect(response.body.error).toBeDefined();
  });

  test('POST rejects invalid type', async () => {
    const response = await createBusiness({ name: 'Bad Type', type: 'not-a-type' as any }).expect(400);
    expect(response.body.error).toBeDefined();
  });

  test('GET returns a list of businesses', async () => {
    const response = await request(BASE_URL).get('/api/v1/businesses').expect(200);
    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: TEST_IDS.business1 })])
    );
  });

  test('GET /:id returns a business', async () => {
    const response = await request(BASE_URL)
      .get(`/api/v1/businesses/${TEST_IDS.business1}`)
      .expect(200);
    expect(response.body.id).toBe(TEST_IDS.business1);
  });

  test('GET /:id returns 404 for a non-existent business', async () => {
    await request(BASE_URL)
      .get(`/api/v1/businesses/${TEST_IDS.businessNonExistent}`)
      .expect(404);
  });

  test('PATCH /:id updates a business', async () => {
    const response = await request(BASE_URL)
      .patch(`/api/v1/businesses/${TEST_IDS.business1}`)
      .send({ name: 'Renamed Business' })
      .expect(200);
    expect(response.body.name).toBe('Renamed Business');
  });

  test('PATCH /:id rejects invalid type', async () => {
    const response = await request(BASE_URL)
      .patch(`/api/v1/businesses/${TEST_IDS.business1}`)
      .send({ type: 'not-a-type' })
      .expect(400);
    expect(response.body.error).toBeDefined();
  });

  test('DELETE /:id deletes a business', async () => {
    const created = await createBusiness({ name: 'To Delete', type: 'retail' }).expect(201);

    await request(BASE_URL).delete(`/api/v1/businesses/${created.body.id}`).expect(204);
    await request(BASE_URL).get(`/api/v1/businesses/${created.body.id}`).expect(404);
  });

  test('DELETE /:id returns 400 for already-deleted business', async () => {
    const created = await createBusiness({ name: 'To Delete Twice', type: 'retail' }).expect(201);

    await request(BASE_URL).delete(`/api/v1/businesses/${created.body.id}`).expect(204);
    const response = await request(BASE_URL)
      .delete(`/api/v1/businesses/${created.body.id}`)
      .expect(400);
    expect(response.body.error).toBeDefined();
  });
});