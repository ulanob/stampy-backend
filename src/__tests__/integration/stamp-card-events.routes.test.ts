import request from 'supertest';
import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import { CreateStampCardEventInput } from '../../models/stamp-card-event.model';
import pool from '../../lib/db';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3001';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

function createEvent(cardId: string, payload: Partial<CreateStampCardEventInput>) {
  return request(BASE_URL)
    .post(`/api/v1/stamp-cards/${cardId}/stamp-card-events`)
    .send(payload);
}

describe('stamp-card-events routes', () => {
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

    const cardCheck = await request(BASE_URL)
          .get(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}`)
          .expect(200);
        expect(cardCheck.body.stamps_acquired).toBe(3);
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
      .get(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}/stamp-card-events`)
      .expect(200);

    const matching = events.body.filter((e: any) => e.request_id === requestId);
    expect(matching.length).toBe(1);
  });

  test('POST rejects stamp_removed that would go below 0', async () => {
    // stampCard2 seeds with 1 stamp_added event, so its derived stamps_acquired is 2 —
    // removing 999 will fail
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
      .get(`/api/v1/stamp-cards/${TEST_IDS.stampCard1}/stamp-card-events`)
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
        `/api/v1/stamp-cards/${TEST_IDS.stampCard1}/stamp-card-events?request_id=${requestId}`
      )
      .expect(200);

    expect(response.body.id).toBe(created.body.id);
  });

  test('GET with unknown request_id returns 404', async () => {
    await request(BASE_URL)
      .get(
        `/api/v1/stamp-cards/${TEST_IDS.stampCard1}/stamp-card-events?request_id=${crypto.randomUUID()}`
      )
      .expect(404);
  });

  test('POST creates an overflow card when quantity exceeds capacity, deriving both totals correctly', async () => {
    const before = await pool.query(
      'SELECT COUNT(*) FROM stamp_cards WHERE user_id = $1',
      [TEST_IDS.user1]
    );

    // stampCard2: stamps_needed 8, starts at derived 2 (one stamp_added
    // event of quantity 2). Room remaining is 6, so quantity 10 fills 6
    // (reaching 8/completed) and overflows the remaining 4.
    await createEvent(TEST_IDS.stampCard2, {
      user_id: TEST_IDS.user1,
      location_id: null,
      request_id: crypto.randomUUID(),
      type: 'stamp_added',
      quantity: 10, // fills 6 (2 -> 8), overflows 4
    }).expect(201);

    const after = await pool.query(
      'SELECT COUNT(*) FROM stamp_cards WHERE user_id = $1',
      [TEST_IDS.user1]
    );

    expect(Number(after.rows[0].count)).toBe(Number(before.rows[0].count) + 1);

    // Original card: capped at stamps_needed, marked completed — derived
        // purely from its own event log.
        const originalCardCheck = await request(BASE_URL)
          .get(`/api/v1/stamp-cards/${TEST_IDS.stampCard2}`)
          .expect(200);
        expect(originalCardCheck.body.stamps_acquired).toBe(8);
        expect(originalCardCheck.body.status).toBe('completed');
    
        // Locate the overflow card via the list endpoint.
        const userCards = await request(BASE_URL)
          .get(`/api/v1/users/${TEST_IDS.user1}/stamp-cards`)
          .expect(200);
        const overflowCardSummary = userCards.body.find(
          (c: any) =>
            c.id !== TEST_IDS.stampCard2 &&
            c.business_id === TEST_IDS.business2 &&
            c.stamps_needed === 8
        );
        expect(overflowCardSummary).toBeDefined();
        expect(overflowCardSummary.stamps_acquired).toBe(4);
        expect(overflowCardSummary.status).toBe('active');
    
        // JOIN isolation: fetch the overflow card directly (single-row
        // getStampCardByID query, not the list query) and confirm its
        // derived total is still exactly 2 — it must never pick up events
        // from stampCard2 or any other card sharing the JOIN.
        const overflowCardDirect = await request(BASE_URL)
          .get(`/api/v1/stamp-cards/${overflowCardSummary.id}`)
          .expect(200);
        expect(overflowCardDirect.body.stamps_acquired).toBe(4);
  });
});
