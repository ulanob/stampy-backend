import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import pool from '../../lib/db';
import { createCheckInService } from '../../services/checkIn.service';
import { createTimezoneService } from '../../services/timezone.service';
import type { TimezoneResolver } from '../../lib/timezone';
import {
  createLocationDAO,
  createUserDAO,
  createStampCardDAO,
  createGiftCardDAO,
  createNotificationDAO,
  createUserNotificationPreferencesDAO,
} from '../../dao';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

// Real DAOs and a real DB; only the geo-tz lookup is swapped for a plain function.
function buildService(resolver: TimezoneResolver) {
  const userDAO = createUserDAO(pool);
  const timezoneService = createTimezoneService(userDAO, resolver);

  return createCheckInService(
    createLocationDAO(pool),
    userDAO,
    createStampCardDAO(pool),
    createGiftCardDAO(pool),
    createUserNotificationPreferencesDAO(pool),
    createNotificationDAO(pool),
    timezoneService,
    pool,
  );
}

// Back to the seeded baseline so tests in this file don't leak into each other.
async function resetState() {
  await pool.query("UPDATE users SET timezone = 'UTC' WHERE id = $1", [TEST_IDS.user1]);
  await pool.query(
    `UPDATE user_notification_preferences
     SET daily_notification_counter = 0, last_notified_date = NULL
     WHERE user_id = $1`,
    [TEST_IDS.user1],
  );
  await pool.query("DELETE FROM notifications WHERE type = 'check_in'");
  await pool.query(
    `UPDATE stamp_cards
     SET notification_time_sent = NULL, notification_cooldown_seconds = 3600
     WHERE id = $1`,
    [TEST_IDS.stampCard1],
  );
  await pool.query(
    `UPDATE gift_cards
     SET notification_time_sent = NULL, notification_cooldown_seconds = 3600
     WHERE id = $1`,
    [TEST_IDS.giftCard1],
  );
}

beforeEach(resetState);

describe('check-in: parallel requests', () => {
  test('N simultaneous check-ins produce one notification and one counter increment', async () => {
    const service = buildService(async () => []);

    // Both seeded cards for business1 have a 1h cooldown (see resetState), so the
    // first committed check-in blocks the rest through notification_time_sent.
    const results = await Promise.all(
      Array.from({ length: 5 }, () => service.checkIn(TEST_IDS.location1, TEST_IDS.user1)),
    );

    // Exactly one check-in won and produced a notification covering both cards
    const winners = results.filter((r) => r.notification !== null);
    expect(winners).toHaveLength(1);
    expect(winners[0].eligible).toHaveLength(2);

    // Every other check-in was rejected by the cooldown, never by a lost claim
    const losers = results.filter((r) => r.notification === null);
    expect(losers).toHaveLength(4);
    for (const loser of losers) {
      expect(loser.eligible).toEqual([]);
      expect(loser.rejected.map((r) => r.reason)).toEqual([
        'still_in_cooldown',
        'still_in_cooldown',
      ]);
    }

    // The database agrees: one notification row, counter moved once
    const notifications = await pool.query(
      "SELECT COUNT(*)::int AS count FROM notifications WHERE type = 'check_in' AND user_id = $1",
      [TEST_IDS.user1],
    );
    expect(notifications.rows[0].count).toBe(1);

    const prefs = await pool.query(
      'SELECT daily_notification_counter, last_notified_date FROM user_notification_preferences WHERE user_id = $1',
      [TEST_IDS.user1],
    );
    expect(prefs.rows[0].daily_notification_counter).toBe(1);
    expect(prefs.rows[0].last_notified_date).not.toBeNull();

    // Both cards were stamped by the single winning check-in
    const cards = await pool.query(
      `SELECT notification_time_sent FROM stamp_cards WHERE id = $1
       UNION ALL
       SELECT notification_time_sent FROM gift_cards WHERE id = $2`,
      [TEST_IDS.stampCard1, TEST_IDS.giftCard1],
    );
    expect(cards.rows.every((r) => r.notification_time_sent !== null)).toBe(true);
  });
});

describe('check-in: timezone drift correction', () => {
  async function getUserTimezone(): Promise<string> {
    const { rows } = await pool.query('SELECT timezone FROM users WHERE id = $1', [TEST_IDS.user1]);
    return rows[0].timezone;
  }

  test("persists the corrected timezone to the user's row", async () => {
    expect(await getUserTimezone()).toBe('UTC');

    const service = buildService(async () => ['America/Toronto']);
    const result = await service.checkIn(TEST_IDS.location1, TEST_IDS.user1);

    // Eligibility ran in the corrected zone...
    expect(result.context.timezone).toBe('America/Toronto');
    // ...and the correction was written, not just used for this one request
    expect(await getUserTimezone()).toBe('America/Toronto');
  });

  test('leaves the stored timezone alone when the resolver finds nothing', async () => {
    const service = buildService(async () => []);
    const result = await service.checkIn(TEST_IDS.location1, TEST_IDS.user1);

    expect(result.context.timezone).toBe('UTC');
    expect(await getUserTimezone()).toBe('UTC');
  });
});
