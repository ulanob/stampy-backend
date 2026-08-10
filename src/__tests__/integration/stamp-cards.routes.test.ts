// __tests__/integration/stamp-cards.routes.test.ts
import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import { CreateStampCardInput } from '../../models/stamp-card.model';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

function createCard(payload: Partial<CreateStampCardInput>) {
  return request(BASE_URL).post('/api/v1/stamp-cards').send(payload);
}

describe('stamp-cards routes', () => {
  test('POST creates a stamp card', async () => {
    const response = await createCard({
      user_id: TEST_IDS.user1,
      business_id: TEST_IDS.business1,
      stamps_needed: 10,
    }).expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        user_id: TEST_IDS.user1,
        business_id: TEST_IDS.business1,
        stamps_needed: 10,
      })
    );
  });

  test('POST rejects missing required field', async () => {
    const response = await createCard({
      business_id: TEST_IDS.business1,
      stamps_needed: 10,
    }).expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('POST returns 404 for a non-existent user', async () => {
    await createCard({
      user_id: TEST_IDS.userNonExistent,
      business_id: TEST_IDS.business1,
      stamps_needed: 10,
    }).expect(404);
  });

  test('POST returns 404 for a non-existent business', async () => {
    await createCard({
      user_id: TEST_IDS.user1,
      business_id: TEST_IDS.businessNonExistent,
      stamps_needed: 10,
    }).expect(404);
  });

  test('GET /:id returns a stamp card', async () => {
    const response = await request(BASE_URL)
      .get(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}`)
      .expect(200);

    expect(response.body.id).toBe(TEST_IDS.stampCard1);
  });

  test('GET /:id returns 404 for a non-existent card', async () => {
    await request(BASE_URL)
      .get(`/api/v1/stamp-cards/${TEST_IDS.stampCardNonExistent}`)
      .expect(404);
  });

  test('PATCH /:id updates a stamp card', async () => {
    const response = await request(BASE_URL)
      .patch(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}`)
      .send({ nickname: 'Updated nickname' })
      .expect(200);

    expect(response.body.nickname).toBe('Updated nickname');
  });

  test('DELETE /:id deletes a stamp card', async () => {
    const created = await createCard({
      user_id: TEST_IDS.user1,
      business_id: TEST_IDS.business1,
      stamps_needed: 5,
    }).expect(201);

    await request(BASE_URL)
      .delete(`/api/v1/stamp-cards/${created.body.id}`)
      .expect(204);

    await request(BASE_URL)
      .get(`/api/v1/stamp-cards/${created.body.id}`)
      .expect(404);
  });

  test('DELETE /:id returns 400 for already-deleted card', async () => {
    const created = await createCard({
      user_id: TEST_IDS.user1,
      business_id: TEST_IDS.business1,
      stamps_needed: 5,
    }).expect(201);

    await request(BASE_URL).delete(`/api/v1/stamp-cards/${created.body.id}`).expect(204);

    const response = await request(BASE_URL)
      .delete(`/api/v1/stamp-cards/${created.body.id}`)
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
});