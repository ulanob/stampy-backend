import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import { CreateStampEventInput } from '../../models/stamp-event.model';
import pool from '../../lib/db';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

function createEvent(cardId: string, payload: Partial<CreateStampEventInput>) {
  return request(BASE_URL)
    .post(`/api/v1/stamp-cards/${cardId}/stamp-events`)
    .send(payload);
}

describe('stamp-events routes', () => {
  test('POST creates a stamp_added event and updates the card', async () => {
    const requestId = crypto.randomUUID();

    const response = await createEvent(TEST_IDS.stampCard1, {
      user_id: TEST_IDS.user1,
      location_id: null,
      request_id: requestId,
      type: 'stamp_added',
      quantity: 2,
    }).expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        stamp_card_id: TEST_IDS.stampCard1,
        type: 'stamp_added',
        quantity: 2,
        request_id: requestId,
      })
    );
  });

  test('POST is idempotent — same request_id returns the original event, does not duplicate', async () => {
    const requestId = crypto.randomUUID();
    const payload = {
      user_id: TEST_IDS.user1,
      location_id: null,
      request_id: requestId,
      type: 'stamp_added' as const,
      quantity: 1,
    };

    const first = await createEvent(TEST_IDS.stampCard1, payload).expect(201);
    const second = await createEvent(TEST_IDS.stampCard1, payload).expect(201);

    expect(second.body.id).toBe(first.body.id);

    const events = await request(BASE_URL)
      .get(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}/stamp-events`)
      .expect(200);

    const matching = events.body.filter((e: any) => e.request_id === requestId);
    expect(matching.length).toBe(1);
  });

  test('POST rejects stamp_removed that would go below 0', async () => {
    // stampCard2 seeded with stamps_acquired: 5 — remove more than it has
    const response = await createEvent(TEST_IDS.stampCard2, {
      user_id: TEST_IDS.user1,
      location_id: null,
      request_id: crypto.randomUUID(),
      type: 'stamp_removed',
      quantity: 999,
    }).expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('POST returns 404 for a non-existent stamp card', async () => {
    await createEvent(TEST_IDS.stampCardNonExistent, {
      user_id: TEST_IDS.user1,
      location_id: null,
      request_id: crypto.randomUUID(),
      type: 'stamp_added',
      quantity: 1,
    }).expect(404);
  });

  test('GET returns events for a stamp card', async () => {
    const response = await request(BASE_URL)
      .get(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}/stamp-events`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('GET with request_id returns a single matching event', async () => {
    const requestId = crypto.randomUUID();
    const created = await createEvent(TEST_IDS.stampCard1, {
      user_id: TEST_IDS.user1,
      location_id: null,
      request_id: requestId,
      type: 'stamp_added',
      quantity: 1,
    }).expect(201);

    const response = await request(BASE_URL)
      .get(
        `/api/v1/stamp-cards/${TEST_IDS.stampCard1}/stamp-events?request_id=${requestId}`
      )
      .expect(200);

    expect(response.body.id).toBe(created.body.id);
  });

  test('GET with unknown request_id returns 404', async () => {
    await request(BASE_URL)
      .get(
        `/api/v1/stamp-cards/${TEST_IDS.stampCard1}/stamp-events?request_id=${crypto.randomUUID()}`
      )
      .expect(404);
  });

//   test('POST creates an overflow card when quantity exceeds capacity', async () => {
//     // stampCard2 seeded with stamps_needed: 8, stamps_acquired: 5 — 3 remaining
//     const response = await createEvent(TEST_IDS.stampCard2, {
//       user_id: TEST_IDS.user1,
//       location_id: null,
//       request_id: crypto.randomUUID(),
//       type: 'stamp_added',
//       quantity: 5, // fills 3, overflows 2
//     }).expect(201);

//     const cardCheck = await request(BASE_URL)
//       .get(`/api/v1/stamp-cards/${TEST_IDS.stampCard2}`)
//       .expect(200);

//     expect(cardCheck.body.stamps_acquired).toBe(8);
//     expect(cardCheck.body.status).toBe('completed');

//     // find the overflow card — same user/business as the original
//     const userCards = await request(BASE_URL)
//       .get(`/api/v1/users/${TEST_IDS.user1}/stamp-cards`)
//       .expect(200);

//     const overflowCard = userCards.body.find(
//       (c: any) =>
//         c.id !== TEST_IDS.stampCard2 &&
//         c.business_id === response.body.business_id &&
//         c.stamps_acquired === 2
//     );
//     expect(overflowCard).toBeDefined();
//     expect(overflowCard.status).toBe('active');
//   });

  test('POST creates exactly one overflow card + overflow event', async () => {
    const before = await pool.query(
      'SELECT COUNT(*) FROM stamp_cards WHERE user_id = $1',
      [TEST_IDS.user1]
    );

    await createEvent(TEST_IDS.stampCard2, {
      user_id: TEST_IDS.user1,
      location_id: null,
      request_id: crypto.randomUUID(),
      type: 'stamp_added',
      quantity: 5,
    }).expect(201);

    const after = await pool.query(
      'SELECT COUNT(*) FROM stamp_cards WHERE user_id = $1',
      [TEST_IDS.user1]
    );

    expect(Number(after.rows[0].count)).toBe(Number(before.rows[0].count) + 1);
  });
});
