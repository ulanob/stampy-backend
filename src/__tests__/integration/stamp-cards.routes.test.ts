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
        stamps_acquired: 0,
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
    test('PATCH ignores stamps_needed even if included in the body', async () => {
    const before = await request(BASE_URL)
      .get(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}`)
      .expect(200);
    const response = await request(BASE_URL)
      .patch(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}`)
      .send({ stamps_needed: 999, nickname: 'Still updating' })
      .expect(200);
    expect(response.body.stamps_needed).toBe(before.body.stamps_needed);
  });
  test('PATCH ignores status even if included in the body', async () => {
    const before = await request(BASE_URL)
      .get(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}`)
      .expect(200);

    const response = await request(BASE_URL)
      .patch(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}`)
      .send({ status: 'redeemed', nickname: 'Still updating' })
      .expect(200);

    expect(response.body.status).toBe(before.body.status);
  });
  test('PATCH ignores stamps_acquired even if included in the body', async () => {
    const before = await request(BASE_URL)
      .get(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}`)
      .expect(200);

    const response = await request(BASE_URL)
      .patch(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}`)
      .send({ stamps_acquired: 999, nickname: 'Still updating' })
      .expect(200);

    expect(response.body.stamps_acquired).toBe(before.body.stamps_acquired);
  });
  test('PATCH ignores business_id even if included in the body', async () => {
    const before = await request(BASE_URL)
      .get(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}`)
      .expect(200);

    const response = await request(BASE_URL)
      .patch(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}`)
      .send({ business_id: TEST_IDS.business2, nickname: 'Still updating' })
      .expect(200);

    expect(response.body.business_id).toBe(before.body.business_id);
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
  test('GET /users/:userId/stamp-cards returns cards for a user', async () => {
    const response = await request(BASE_URL)
      .get(`/api/v1/users/${TEST_IDS.user1}/stamp-cards`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
  test('GET /users/:userId/stamp-cards returns 404 for a non-existent user', async () => {
    await request(BASE_URL)
      .get(`/api/v1/users/${TEST_IDS.userNonExistent}/stamp-cards`)
      .expect(404);
  });
});