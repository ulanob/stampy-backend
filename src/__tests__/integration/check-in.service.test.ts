import { seed, clearAll, TEST_IDS } from '../../scripts/testSeed';
import pool from '../../lib/db';
import { createCheckInService } from '../../services/checkIn.service';
import {
  createLocationDAO,
  createUserDAO,
  createStampCardDAO,
  createGiftCardDAO,
  createBusinessDAO,
  createUserNotificationPreferencesDAO,
} from '../../dao';

beforeAll(async () => {
  await clearAll();
  await seed();
});

afterAll(async () => {
  await clearAll();
});

describe('check-in service — real DAOs feeding selectRelevantCards and the eligibility pipeline', () => {
  const locationDAO = createLocationDAO(pool);
  const userDAO = createUserDAO(pool);
  const stampCardDAO = createStampCardDAO(pool);
  const giftCardDAO = createGiftCardDAO(pool);
  const businessDAO = createBusinessDAO(pool);
  const prefsDAO = createUserNotificationPreferencesDAO(pool);
  const service = createCheckInService(locationDAO, userDAO, stampCardDAO, giftCardDAO, prefsDAO);

  const emptyResult = { eligible: [], rejected: [] };

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

    expect(await service.checkIn(location.id, TEST_IDS.user1)).toEqual(emptyResult);
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

    expect(await service.checkIn(location.id, TEST_IDS.user1)).toEqual(emptyResult);
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
    } finally {
      // reset for isolation: later tests share TEST_IDS.user1
      await prefsDAO.updateUserNotificationPreferencesByUserID(TEST_IDS.user1, {
        notifications_enabled: true,
      });
    }
  });
});
