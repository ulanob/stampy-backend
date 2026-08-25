import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import pool from '../../lib/db';
import { createStampCardEventService } from '../../services/stampCardEvent.service';
import { createStampCardEventDAO, createStampCardDAO } from '../../dao';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

describe('stamp card stamps_acquired — SUM() derivation', () => {
  const stampCardEventDAO = createStampCardEventDAO(pool);
  const stampCardDAO = createStampCardDAO(pool);
  const stampCardEventService = createStampCardEventService(stampCardEventDAO, stampCardDAO, pool);

  test('nets a mixed history of stamp_added and stamp_removed events correctly', async () => {
    const card = await stampCardDAO.createStampCard(
      {
        user_id: TEST_IDS.user1,
        business_id: TEST_IDS.business1,
        nickname: null,
        notes: null,
        // kept high so no partial sum here reaches 'completed', which
        // would otherwise block a later stamp_added via NO_ADD_STATUSES
        stamps_needed: 20,
        status: 'active',
      } as any,
      pool
    );

    // Seed history: +5, +3, -2, +4, -1 => expected 9
    const events: Array<{ type: 'stamp_added' | 'stamp_removed'; quantity: number }> = [
      { type: 'stamp_added', quantity: 5 },
      { type: 'stamp_added', quantity: 3 },
      { type: 'stamp_removed', quantity: 2 },
      { type: 'stamp_added', quantity: 4 },
      { type: 'stamp_removed', quantity: 1 },
    ];

    for (const { type, quantity } of events) {
      await stampCardEventService.createStampCardEvent({
        user_id: TEST_IDS.user1,
        stamp_card_id: card.id,
        location_id: null,
        request_id: crypto.randomUUID(),
        type,
        quantity,
      });
    }

    const result = await stampCardDAO.getStampCardByID(card.id);
    expect(result?.stamps_acquired).toBe(9);
  });

  test('reward_redeemed changes status but does NOT change stamps_acquired', async () => {
    const card = await stampCardDAO.createStampCard(
      {
        user_id: TEST_IDS.user1,
        business_id: TEST_IDS.business1,
        nickname: null,
        notes: null,
        stamps_needed: 5,
        status: 'active',
      } as any,
      pool
    );

    // Fill exactly to completion first — reward_redeemed requires the card
    // to already be 'completed'.
    await stampCardEventService.createStampCardEvent({
      user_id: TEST_IDS.user1,
      stamp_card_id: card.id,
      location_id: null,
      request_id: crypto.randomUUID(),
      type: 'stamp_added',
      quantity: 5,
    });

    await stampCardEventService.createStampCardEvent({
      user_id: TEST_IDS.user1,
      stamp_card_id: card.id,
      location_id: null,
      request_id: crypto.randomUUID(),
      type: 'reward_redeemed',
      quantity: 0,
    });

    const result = await stampCardDAO.getStampCardByID(card.id);
    // Unchanged — unlike a gift card redemption, real stamp cards don't
    // lose their stamps when the reward is claimed, only their eligibility.
    expect(result?.stamps_acquired).toBe(5);
    expect(result?.status).toBe('redeemed');
  });

  test('card_expired events do not affect stamps_acquired', async () => {
    const card = await stampCardDAO.createStampCard(
      {
        user_id: TEST_IDS.user1,
        business_id: TEST_IDS.business1,
        nickname: null,
        notes: null,
        stamps_needed: 20,
        status: 'active',
      } as any,
      pool
    );

    await stampCardEventService.createStampCardEvent({
      user_id: TEST_IDS.user1,
      stamp_card_id: card.id,
      location_id: null,
      request_id: crypto.randomUUID(),
      type: 'stamp_added',
      quantity: 7,
    });

    await stampCardEventService.createStampCardEvent({
      user_id: TEST_IDS.user1,
      stamp_card_id: card.id,
      location_id: null,
      request_id: crypto.randomUUID(),
      type: 'card_expired',
      quantity: 0,
    });

    const result = await stampCardDAO.getStampCardByID(card.id, true);
    expect(result?.stamps_acquired).toBe(7);
    expect(result?.status).toBe('expired');
  });

  test('a card with no events at all derives a stamps_acquired of 0', async () => {
    // Unlike gift cards, this ISN'T exercising a bypass/edge case — a
    // stamp card created through the normal service flow always starts
    // with zero events (no seed event needed; see architecture notes on
    // why stamp cards diverge from gift cards here). This just confirms
    // the COALESCE(SUM(...), 0) fallback explicitly.
    const card = await stampCardDAO.createStampCard(
      {
        user_id: TEST_IDS.user1,
        business_id: TEST_IDS.business1,
        nickname: null,
        notes: null,
        stamps_needed: 10,
        status: 'active',
      } as any,
      pool
    );

    const result = await stampCardDAO.getStampCardByID(card.id);
    expect(result?.stamps_acquired).toBe(0);
  });

  test('two cards with different event histories do not leak stamps into each other (JOIN isolation)', async () => {
    const cardA = await stampCardDAO.createStampCard(
      { user_id: TEST_IDS.user1, business_id: TEST_IDS.business1, nickname: 'A', notes: null, stamps_needed: 50, status: 'active' } as any,
      pool
    );
    const cardB = await stampCardDAO.createStampCard(
      { user_id: TEST_IDS.user1, business_id: TEST_IDS.business1, nickname: 'B', notes: null, stamps_needed: 50, status: 'active' } as any,
      pool
    );

    await stampCardEventService.createStampCardEvent({
      user_id: TEST_IDS.user1, stamp_card_id: cardA.id, location_id: null,
      request_id: crypto.randomUUID(), type: 'stamp_added', quantity: 7,
    });
    await stampCardEventService.createStampCardEvent({
      user_id: TEST_IDS.user1, stamp_card_id: cardB.id, location_id: null,
      request_id: crypto.randomUUID(), type: 'stamp_added', quantity: 30,
    });
    await stampCardEventService.createStampCardEvent({
      user_id: TEST_IDS.user1, stamp_card_id: cardB.id, location_id: null,
      request_id: crypto.randomUUID(), type: 'stamp_removed', quantity: 5,
    });

    const resultA = await stampCardDAO.getStampCardByID(cardA.id);
    const resultB = await stampCardDAO.getStampCardByID(cardB.id);
    expect(resultA?.stamps_acquired).toBe(7);
    expect(resultB?.stamps_acquired).toBe(25);

    // Also confirm the list getter (same JOIN + GROUP BY pattern) isolates
    // correctly, not just the single-card getter.
    const allForUser = await stampCardDAO.getAllStampCardsByUserID(TEST_IDS.user1);
    const fetchedA = allForUser.find(c => c.id === cardA.id);
    const fetchedB = allForUser.find(c => c.id === cardB.id);
    expect(fetchedA?.stamps_acquired).toBe(7);
    expect(fetchedB?.stamps_acquired).toBe(25);
  });
});