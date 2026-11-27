import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import pool from '../../lib/db';
import { createCheckInService } from '../../services/checkIn.service';
import { createTimezoneService } from '../../services/timezone.service';
import {
  createLocationDAO,
  createUserDAO,
  createStampCardDAO,
  createGiftCardDAO,
  createBusinessDAO,
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

// checkIn writes (claims, notification, counter), so reset what it touches
// to keep tests independent of order.
beforeEach(async () => {
  await pool.query(`DELETE FROM notifications WHERE type = 'check_in'`);
  await pool.query(`UPDATE stamp_cards SET notification_time_sent = NULL WHERE user_id = $1`, [
    TEST_IDS.user1,
  ]);
  await pool.query(`UPDATE gift_cards SET notification_time_sent = NULL WHERE user_id = $1`, [
    TEST_IDS.user1,
  ]);
  await pool.query(
    `UPDATE user_notification_preferences SET daily_notification_counter = 0, last_notified_date = NULL WHERE user_id = $1`,
    [TEST_IDS.user1],
  );
});

function emptyResultAt(location_id: string) {
  return {
    context: { now: expect.any(Date), location_id, timezone: 'UTC' },
    eligible: [],
    rejected: [],
    notification: null,
  };
}

describe('check-in service — real DAOs feeding selectRelevantCards and the eligibility pipeline', () => {
  const locationDAO = createLocationDAO(pool);
  const userDAO = createUserDAO(pool);
  const stampCardDAO = createStampCardDAO(pool);
  const giftCardDAO = createGiftCardDAO(pool);
  const businessDAO = createBusinessDAO(pool);
  const notificationDAO = createNotificationDAO(pool);
  const prefsDAO = createUserNotificationPreferencesDAO(pool);
  const timezoneService = createTimezoneService(userDAO, async () => []);
  const service = createCheckInService(
    locationDAO,
    userDAO,
    stampCardDAO,
    giftCardDAO,
    prefsDAO,
    notificationDAO,
    timezoneService,
    pool,
  );

  test('returns only the cards for the checked-in business, with derived values', async () => {
    // seed: user1 has stampCard1 (business1, 1 stamp) and giftCard1 (business1, $50),
    // plus stampCard2 / giftCard2 at business2 that must not appear
    const result = await service.checkIn(TEST_IDS.location1, TEST_IDS.user1);

    expect(result.eligible).toHaveLength(2);
    expect(result.rejected).toEqual([]);

    const stamp = result.eligible.find((n) => n.type === 'stamp_card');
    const gift = result.eligible.find((n) => n.type === 'gift_card');

    expect(stamp?.card.id).toBe(TEST_IDS.stampCard1);
    expect((stamp?.card as any).stamps_acquired).toBe(1);
    expect(gift?.card.id).toBe(TEST_IDS.giftCard1);
    expect((gift?.card as any).current_balance).toBe(50);

    expect(result.context).toEqual({
      now: expect.any(Date),
      location_id: TEST_IDS.location1,
      timezone: 'UTC',
    });

    expect(result.notification).not.toBeNull();
    expect(result.notification?.body).toContain('1 stamp card with 1/10 stamps');
    expect(result.notification?.body).toContain('1 gift card with $50.00');
  });

  test('persists the claims, one notification, and the counter', async () => {
    const result = await service.checkIn(TEST_IDS.location1, TEST_IDS.user1);
    const { now } = result.context;

    // both business1 cards were claimed with the check-in's own `now`
    const stamp = await pool.query('SELECT notification_time_sent FROM stamp_cards WHERE id = $1', [
      TEST_IDS.stampCard1,
    ]);
    const gift = await pool.query('SELECT notification_time_sent FROM gift_cards WHERE id = $1', [
      TEST_IDS.giftCard1,
    ]);
    expect(stamp.rows[0].notification_time_sent.getTime()).toBe(now.getTime());
    expect(gift.rows[0].notification_time_sent.getTime()).toBe(now.getTime());

    // business2 cards were not part of this check-in
    const otherStamp = await pool.query(
      'SELECT notification_time_sent FROM stamp_cards WHERE id = $1',
      [TEST_IDS.stampCard2],
    );
    expect(otherStamp.rows[0].notification_time_sent).toBeNull();

    // exactly one notification row, tied to the location
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE type = 'check_in' AND user_id = $1`,
      [TEST_IDS.user1],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(result.notification?.id);
    expect(rows[0].location_id).toBe(TEST_IDS.location1);
    expect(rows[0].status).toBe('pending');

    // counter bumped once for the whole check-in, not once per card
    const prefs = await prefsDAO.getUserNotificationPreferencesByUserID(TEST_IDS.user1);
    expect(prefs?.daily_notification_counter).toBe(1);
    expect(prefs?.last_notified_date?.getTime()).toBe(now.getTime());
  });

  test('returns an empty result at a business where the user has no cards', async () => {
    const business = await businessDAO.createBusiness({ name: 'No Cards Here', type: 'cafe' });
    const location = await locationDAO.createLocation({
      business_id: business.id,
      address: '1 Empty St',
      lat: 1,
      lng: 1,
      geofence_radius: 50,
    });

    expect(await service.checkIn(location.id, TEST_IDS.user1)).toEqual(emptyResultAt(location.id));
  });

  test('returns an empty result when the only matching gift card has no events (derived balance 0)', async () => {
    const business = await businessDAO.createBusiness({ name: 'Zero Balance Co', type: 'retail' });
    const location = await locationDAO.createLocation({
      business_id: business.id,
      address: '2 Empty St',
      lat: 1,
      lng: 1,
      geofence_radius: 50,
    });
    await giftCardDAO.createGiftCard(
      {
        user_id: TEST_IDS.user1,
        business_id: business.id,
        nickname: null,
        notes: null,
        currency: 'CAD',
        status: 'active',
      } as any,
      pool,
    );

    expect(await service.checkIn(location.id, TEST_IDS.user1)).toEqual(emptyResultAt(location.id));
  });

  test('rejects every relevant card with notifications_disabled when the real preferences row opts out', async () => {
    await prefsDAO.updateUserNotificationPreferencesByUserID(TEST_IDS.user1, {
      notifications_enabled: false,
    });

    try {
      const result = await service.checkIn(TEST_IDS.location1, TEST_IDS.user1);

      expect(result.eligible).toEqual([]);
      expect(result.rejected).toHaveLength(2);
      expect(result.rejected.every((r) => r.reason === 'notifications_disabled')).toBe(true);
      expect(result.notification).toBeNull();

      // a fully rejected check-in must not touch the counter
      const prefs = await prefsDAO.getUserNotificationPreferencesByUserID(TEST_IDS.user1);
      expect(prefs?.daily_notification_counter).toBe(0);
    } finally {
      // reset for isolation: later tests share TEST_IDS.user1
      await prefsDAO.updateUserNotificationPreferencesByUserID(TEST_IDS.user1, {
        notifications_enabled: true,
      });
    }
  });
});
