import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import pool from '../../lib/db';
import { createStampCardEventService } from '../../services/stampCardEvent.service';
import { createStampCardEventDAO, createStampCardDAO } from '../../dao';
import type { StampCardDAO } from '../../dao';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

describe('stamp card events — transaction rollback', () => {
  test('does not persist an event or update the card when the card update fails', async () => {
    const stampCardEventDAO = createStampCardEventDAO(pool);
    const stampCardDAO = createStampCardDAO(pool);

    const brokenStampCardDAO: StampCardDAO = {
      ...stampCardDAO,
      updateStampCardByID: async () => { throw new Error('forced failure'); },
    };

    const service = createStampCardEventService(stampCardEventDAO, brokenStampCardDAO, pool);

    const before = await pool.query(
      'SELECT stamps_acquired FROM stamp_cards WHERE id = $1',
      [TEST_IDS.stampCard1]
    );
    const eventsBefore = await pool.query(
      'SELECT COUNT(*) FROM stamp_card_events WHERE stamp_card_id = $1',
      [TEST_IDS.stampCard1]
    );

    await expect(service.createStampCardEvent({
      user_id: TEST_IDS.user1,
      stamp_card_id: TEST_IDS.stampCard1,
      location_id: null,
      request_id: crypto.randomUUID(),
      type: 'stamp_added',
      quantity: 1,
    })).rejects.toThrow('forced failure');

    const after = await pool.query(
      'SELECT stamps_acquired FROM stamp_cards WHERE id = $1',
      [TEST_IDS.stampCard1]
    );
    const eventsAfter = await pool.query(
      'SELECT COUNT(*) FROM stamp_card_events WHERE stamp_card_id = $1',
      [TEST_IDS.stampCard1]
    );

    expect(after.rows[0].stamps_acquired).toBe(before.rows[0].stamps_acquired);
    expect(eventsAfter.rows[0].count).toBe(eventsBefore.rows[0].count);
  });
});