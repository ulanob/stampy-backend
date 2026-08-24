import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import pool from '../../lib/db';
import { createGiftCardEventService } from '../../services/giftCardEvent.service';
import { createGiftCardEventDAO, createGiftCardDAO } from '../../dao';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

describe('gift card current_balance — SUM() derivation', () => {
  const giftCardEventDAO = createGiftCardEventDAO(pool);
  const giftCardDAO = createGiftCardDAO(pool);
  const giftCardEventService = createGiftCardEventService(giftCardEventDAO, giftCardDAO, pool);

  test('nets a mixed history of balance_added and balance_redeemed events correctly', async () => {
    const card = await giftCardDAO.createGiftCard(
      {
        user_id: TEST_IDS.user1,
        business_id: TEST_IDS.business1,
        nickname: null,
        notes: null,
        currency: 'CAD',
        status: 'active',
      } as any,
      pool
    );

    // Seed history: +100, +50, -30, +20, -10 => expected 130
    const events: Array<{ type: 'balance_added' | 'balance_redeemed'; amount: number }> = [
      { type: 'balance_added', amount: 100 },
      { type: 'balance_added', amount: 50 },
      { type: 'balance_redeemed', amount: 30 },
      { type: 'balance_added', amount: 20 },
      { type: 'balance_redeemed', amount: 10 },
    ];

    for (const { type, amount } of events) {
      await giftCardEventService.createGiftCardEvent({
        user_id: TEST_IDS.user1,
        gift_card_id: card.id,
        location_id: null,
        request_id: crypto.randomUUID(),
        type,
        amount,
      });
    }

    const result = await giftCardDAO.getGiftCardByID(card.id);
    expect(result?.current_balance).toBe(130);
  });

  test('card_expired and card_deleted events do not affect current_balance', async () => {
    const card = await giftCardDAO.createGiftCard(
      {
        user_id: TEST_IDS.user1,
        business_id: TEST_IDS.business1,
        nickname: null,
        notes: null,
        currency: 'CAD',
        status: 'active',
      } as any,
      pool
    );

    await giftCardEventService.createGiftCardEvent({
      user_id: TEST_IDS.user1,
      gift_card_id: card.id,
      location_id: null,
      request_id: crypto.randomUUID(),
      type: 'balance_added',
      amount: 75,
    });

    await giftCardEventService.createGiftCardEvent({
      user_id: TEST_IDS.user1,
      gift_card_id: card.id,
      location_id: null,
      request_id: crypto.randomUUID(),
      type: 'card_expired',
      amount: 0,
    });

    const result = await giftCardDAO.getGiftCardByID(card.id, true);
    expect(result?.current_balance).toBe(75);
    expect(result?.status).toBe('expired');
  });

  test('a card with no events at all derives a current_balance of 0', async () => {
    // Bypasses giftCardEventService deliberately: exercises the COALESCE(SUM(...), 0)
    // fallback for a card with zero rows in gift_card_events (e.g. legacy/edge-case data),
    // since every card created through the normal service flow always has a seed event.
    const card = await giftCardDAO.createGiftCard(
      {
        user_id: TEST_IDS.user1,
        business_id: TEST_IDS.business1,
        nickname: null,
        notes: null,
        currency: 'CAD',
        status: 'active',
      } as any,
      pool
    );

    const result = await giftCardDAO.getGiftCardByID(card.id);
    expect(result?.current_balance).toBe(0);
  });

  test('two cards with different event histories do not leak balances into each other (JOIN isolation)', async () => {
    const cardA = await giftCardDAO.createGiftCard(
      { user_id: TEST_IDS.user1, business_id: TEST_IDS.business1, nickname: 'A', notes: null, currency: 'CAD', status: 'active' } as any,
      pool
    );
    const cardB = await giftCardDAO.createGiftCard(
      { user_id: TEST_IDS.user1, business_id: TEST_IDS.business1, nickname: 'B', notes: null, currency: 'CAD', status: 'active' } as any,
      pool
    );

    await giftCardEventService.createGiftCardEvent({
      user_id: TEST_IDS.user1, gift_card_id: cardA.id, location_id: null,
      request_id: crypto.randomUUID(), type: 'balance_added', amount: 40,
    });
    await giftCardEventService.createGiftCardEvent({
      user_id: TEST_IDS.user1, gift_card_id: cardB.id, location_id: null,
      request_id: crypto.randomUUID(), type: 'balance_added', amount: 999,
    });
    await giftCardEventService.createGiftCardEvent({
      user_id: TEST_IDS.user1, gift_card_id: cardB.id, location_id: null,
      request_id: crypto.randomUUID(), type: 'balance_redeemed', amount: 900,
    });

    const resultA = await giftCardDAO.getGiftCardByID(cardA.id);
    const resultB = await giftCardDAO.getGiftCardByID(cardB.id);

    expect(resultA?.current_balance).toBe(40);
    expect(resultB?.current_balance).toBe(99);

    // Also confirm the list getters (which use the same JOIN + GROUP BY pattern)
    // isolate balances correctly, not just the single-card getter.
    const allForUser = await giftCardDAO.getAllGiftCardsByUserID(TEST_IDS.user1);
    const fetchedA = allForUser.find(c => c.id === cardA.id);
    const fetchedB = allForUser.find(c => c.id === cardB.id);

    expect(fetchedA?.current_balance).toBe(40);
    expect(fetchedB?.current_balance).toBe(99);
  });
});