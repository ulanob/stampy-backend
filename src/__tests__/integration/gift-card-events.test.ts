import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import pool from '../../lib/db';
import { createGiftCardEventService } from '../../services/giftCardEvent.service';
import { createGiftCardEventDAO, createGiftCardDAO } from '../../dao';
import type { GiftCardDAO } from '../../dao';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

describe('gift card events — transaction rollback', () => {
  test('does not persist an event or update the card when the card update fails', async () => {
    const giftCardEventDAO = createGiftCardEventDAO(pool);
    const giftCardDAO = createGiftCardDAO(pool);

    const brokenGiftCardDAO: GiftCardDAO = {
      ...giftCardDAO,
      updateGiftCardByID: async () => {
        throw new Error('forced failure');
      },
    };

    const service = createGiftCardEventService(giftCardEventDAO, brokenGiftCardDAO, pool);

    const before = await giftCardDAO.getGiftCardByID(TEST_IDS.giftCard1);
    const eventsBefore = await pool.query(
      'SELECT COUNT(*) FROM gift_card_events WHERE gift_card_id = $1',
      [TEST_IDS.giftCard1]
    );

    await expect(
      service.createGiftCardEvent({
        user_id: TEST_IDS.user1,
        gift_card_id: TEST_IDS.giftCard1,
        location_id: null,
        request_id: crypto.randomUUID(),
        type: 'balance_added',
        amount: 10.00,
      })
    ).rejects.toThrow('forced failure');

    const after = await giftCardDAO.getGiftCardByID(TEST_IDS.giftCard1);
    const eventsAfter = await pool.query(
      'SELECT COUNT(*) FROM gift_card_events WHERE gift_card_id = $1',
      [TEST_IDS.giftCard1]
    );

    expect(after?.current_balance).toBe(before?.current_balance);
    expect(eventsAfter.rows[0].count).toBe(eventsBefore.rows[0].count);
  });
});