import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import { CreateGiftCardInput } from '../../models/gift-card.model';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

function createGiftCard(payload: Partial<CreateGiftCardInput>) {
  return request(BASE_URL).post('/api/v1/gift-cards').send(payload);
}

describe('gift-cards routes', () => {
  test('POST creates a gift card with current_balance set to initial_balance', async () => {
    const response = await createGiftCard({
      user_id: TEST_IDS.user1,
      business_id: TEST_IDS.business1,
      initial_balance: 30.00,
      currency: 'CAD',
    }).expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        user_id: TEST_IDS.user1,
        business_id: TEST_IDS.business1,
        initial_balance: 30.00,
        current_balance: 30.00,
      })
    );
  });

  test('POST rejects missing required field', async () => {
    const response = await createGiftCard({
      business_id: TEST_IDS.business1,
      initial_balance: 30.00,
    }).expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('POST returns 404 for a non-existent user', async () => {
    await createGiftCard({
      user_id: TEST_IDS.userNonExistent,
      business_id: TEST_IDS.business1,
      initial_balance: 30.00,
      currency: 'CAD',
    }).expect(404);
  });

  test('POST returns 404 for a non-existent business', async () => {
    await createGiftCard({
      user_id: TEST_IDS.user1,
      business_id: TEST_IDS.businessNonExistent,
      initial_balance: 30.00,
      currency: 'CAD',
    }).expect(404);
  });

  test('GET /:id returns a gift card', async () => {
    const response = await request(BASE_URL)
      .get(`/api/v1/gift-cards/${TEST_IDS.giftCard1}`)
      .expect(200);

    expect(response.body.id).toBe(TEST_IDS.giftCard1);
  });

  test('GET /:id returns 404 for a non-existent gift card', async () => {
    await request(BASE_URL)
      .get(`/api/v1/gift-cards/${TEST_IDS.giftCardNonExistent}`)
      .expect(404);
  });

  test('PATCH /:id updates a gift card', async () => {
    const response = await request(BASE_URL)
      .patch(`/api/v1/gift-cards/${TEST_IDS.giftCard1}`)
      .send({ nickname: 'Updated nickname' })
      .expect(200);

    expect(response.body.nickname).toBe('Updated nickname');
  });

  test('PATCH ignores current_balance even if included in the body', async () => {
    const response = await request(BASE_URL)
      .patch(`/api/v1/gift-cards/${TEST_IDS.giftCard1}`)
      .send({ current_balance: 999999, nickname: 'Still updating' })
      .expect(200);

    expect(response.body.current_balance).not.toBe(999999);
  });

  test('PATCH ignores status even if included in the body', async () => {
    const before = await request(BASE_URL)
      .get(`/api/v1/gift-cards/${TEST_IDS.giftCard1}`)
      .expect(200);

    const response = await request(BASE_URL)
      .patch(`/api/v1/gift-cards/${TEST_IDS.giftCard1}`)
      .send({ status: 'cancelled', nickname: 'Still updating' })
      .expect(200);

    expect(response.body.status).toBe(before.body.status);
  });

  test('DELETE /:id deletes a gift card', async () => {
    const created = await createGiftCard({
      user_id: TEST_IDS.user1,
      business_id: TEST_IDS.business1,
      initial_balance: 10.00,
      currency: 'CAD',
    }).expect(201);

    await request(BASE_URL)
      .delete(`/api/v1/gift-cards/${created.body.id}`)
      .expect(204);

    await request(BASE_URL)
      .get(`/api/v1/gift-cards/${created.body.id}`)
      .expect(404);
  });

  test('DELETE /:id returns 400 for already-deleted card', async () => {
    const created = await createGiftCard({
      user_id: TEST_IDS.user1,
      business_id: TEST_IDS.business1,
      initial_balance: 10.00,
      currency: 'CAD',
    }).expect(201);

    await request(BASE_URL).delete(`/api/v1/gift-cards/${created.body.id}`).expect(204);

    const response = await request(BASE_URL)
      .delete(`/api/v1/gift-cards/${created.body.id}`)
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('GET /users/:userId/gift-cards returns cards for a user', async () => {
    const response = await request(BASE_URL)
      .get(`/api/v1/users/${TEST_IDS.user1}/gift-cards`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  test('GET /users/:userId/gift-cards returns 404 for a non-existent user', async () => {
    await request(BASE_URL)
      .get(`/api/v1/users/${TEST_IDS.userNonExistent}/gift-cards`)
      .expect(404);
  });
});