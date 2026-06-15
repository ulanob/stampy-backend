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

describe('gift-cards', () => {
  test('GET /api/v1/gift-cards returns a list of gift-cards', async () => {
      const response = await request(BASE_URL)
        .get('/api/v1/gift-cards')
        .expect(200);
  
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: TEST_IDS.giftCard1 }),
          expect.objectContaining({ id: TEST_IDS.giftCard2 }),
        ])
      );
    });
  
    test('GET /api/v1/gift-cards/:id returns a gift-card', async () => {
      const response = await request(BASE_URL)
        .get(`/api/v1/gift-cards/${TEST_IDS.giftCard1}`)
        .expect(200);
  
      expect(response.body).toEqual(
        expect.objectContaining({
          id: TEST_IDS.giftCard1,
        })
      );
    });
  
    test('GET /api/v1/gift-cards/:id returns 400 for Invalid ID format', async () => {
      await request(BASE_URL)
        .get('/api/v1/gift-cards/999999')
        .expect(400);
    });
  
    test('GET /api/v1/gift-cards/:id returns 404 for Gift Card not found', async () => {
      await request(BASE_URL)
        .get(`/api/v1/gift-cards/${TEST_IDS.giftCardNonExistent}`)
        .expect(404);
    });
  
    test('POST /api/v1/gift-cards posts a gift-card', async () => {
      const body: CreateGiftCardInput = {
        user_id: TEST_IDS.user1,
        business_id: TEST_IDS.business1,
        location_id: TEST_IDS.location1,
        current_balance: 1000,
        initial_balance: 1000,
        currency: 'CAD',
        nickname: null,
        notes: null,
        notify_window_days: null,
        notify_window_start_time: null,
        notify_window_end_time: null,
        notification_time_sent: null,
        notification_cooldown_time: null,
        expiration_date: null,
      };
      const response = await request(BASE_URL)
      .post('/api/v1/gift-cards')
      .send(body)
      .set('Accept', 'application/json')
      .expect(201);
  
      expect(response.body).toEqual(
        expect.objectContaining({
            user_id: TEST_IDS.user1,
            currency: 'CAD',
            current_balance: 1000,
        })
      )
    })
  
    test('POST /api/v1/gift-cards rejects invalid payload', async () => {
      const response = await request(BASE_URL)
        .post('/api/v1/gift-cards')
        .send({})
        .expect(400);
  
      expect(response.body.error).toBeDefined();
    });
  
    test('UPDATE /api/v1/gift-card/:id updates valid type of gift-card with matching id', async () => {
      const requestBody = { current_balance: 500 }

      const response = await request(BASE_URL)
      .patch(`/api/v1/gift-cards/${TEST_IDS.giftCard1}`)
      .send(requestBody)
      .expect(200);
  
      expect(response.body).toEqual(
        expect.objectContaining({ current_balance: 500 })
      )
    })
  
    test('DELETE /api/v1/gift-card/:id deletes a gift-card', async () => {
      await request(BASE_URL)
      .delete(`/api/v1/gift-cards/${TEST_IDS.giftCard1}`)
      .expect(204);
    })
  
    test('DELETE /api/v1/gift-cards/:id returns 404 for Gift Card not found', async () => {
      const response = await request(BASE_URL)
      .delete(`/api/v1/gift-cards/${TEST_IDS.giftCardNonExistent}`)
      .expect(404);
  
      expect(response.body.error).toBeDefined()
    })
  
    test('DELETE /api/v1/gift-cards/:id returns 400 for Gift Card already deleted', async () => {
      // delete it first
      await request(BASE_URL)
        .delete(`/api/v1/gift-cards/${TEST_IDS.giftCard2}`)
        .expect(204);
  
      // then try to delete again
      const response = await request(BASE_URL)
        .delete(`/api/v1/gift-cards/${TEST_IDS.giftCard2}`)
        .expect(400);
  
      expect(response.body.error).toBeDefined();
    });
});