import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCheckInService } from '../../services/checkIn.service';
import type {
  LocationDAO,
  UserDAO,
  StampCardDAO,
  GiftCardDAO,
  UserNotificationPreferencesDAO,
} from '../../dao';
import type { StampCard } from '../../models/stamp-card.model';
import type { GiftCard } from '../../models/gift-card.model';
import type { UserNotificationPreferences } from '../../models/user-notification-preferences.model';
import { NotFoundError, ValidationError, InvalidUUIDError } from '../../utils/validators';
import { EligibilityContext } from '@/src/services/notification-eligibility/types';

describe('checkInService.checkIn', () => {
  let locationDAO: LocationDAO;
  let userDAO: UserDAO;
  let stampCardDAO: StampCardDAO;
  let giftCardDAO: GiftCardDAO;
  let prefsDAO: UserNotificationPreferencesDAO;

  const validLocationId = 'b1b2c3d4-0000-0000-0000-000000000001';
  const validUserId = 'a1b2c3d4-0000-0000-0000-000000000005';
  const businessId = 'a1b2c3d4-0000-0000-0000-000000000001';
  const otherBusinessId = 'a1b2c3d4-0000-0000-0000-000000000002';

  // Monday, 12:00 UTC
  const now = new Date('2026-06-15T12:00:00Z');

  const baseLocation = { id: validLocationId, business_id: businessId };
  const baseUser = { id: validUserId, timezone: 'UTC' };

  // Full cards: the real eligibility checks read every notify_* / expiration field.
  const relevantStampCard: StampCard = {
    id: 'stamp-1',
    user_id: validUserId,
    business_id: businessId,
    nickname: null,
    notes: null,
    stamps_needed: 10,
    stamps_acquired: 3,
    status: 'active',
    notify_window_days: null,
    notify_window_start_time: null,
    notify_window_end_time: null,
    notification_time_sent: null,
    notification_cooldown_seconds: null,
    expiration_date: null,
    deleted: false,
    deleted_at: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  };

  const relevantGiftCard: GiftCard = {
    id: 'gift-1',
    user_id: validUserId,
    business_id: businessId,
    nickname: null,
    notes: null,
    current_balance: 25,
    currency: 'CAD',
    status: 'active',
    notify_window_days: null,
    notify_window_start_time: null,
    notify_window_end_time: null,
    notification_time_sent: null,
    notification_cooldown_seconds: null,
    expiration_date: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    deleted: false,
    deleted_at: null,
  };

  const basePreferences: UserNotificationPreferences = {
    id: 'prefs-1',
    user_id: validUserId,
    notifications_enabled: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
    notify_window_days: null,
    general_notification_window_start: null,
    general_notification_window_end: null,
    daily_notification_cap: 3,
    daily_notification_counter: 0,
    last_notified_date: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  };

  const context: EligibilityContext = {
    now,
    location_id: baseLocation.id,
    timezone: baseUser.timezone,
  };

  const emptyResult = { context, eligible: [], rejected: [] };

  beforeEach(() => {
    locationDAO = {
      getLocationByID: vi.fn().mockResolvedValue(baseLocation),
    } as unknown as LocationDAO;

    userDAO = {
      getUserByID: vi.fn().mockResolvedValue(baseUser),
    } as unknown as UserDAO;

    stampCardDAO = {
      getAllStampCardsByUserID: vi.fn().mockResolvedValue([]),
    } as unknown as StampCardDAO;

    giftCardDAO = {
      getAllGiftCardsByUserID: vi.fn().mockResolvedValue([]),
    } as unknown as GiftCardDAO;

    prefsDAO = {
      getUserNotificationPreferencesByUserID: vi.fn().mockResolvedValue(basePreferences),
    } as unknown as UserNotificationPreferencesDAO;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function service() {
    return createCheckInService(locationDAO, userDAO, stampCardDAO, giftCardDAO, prefsDAO);
  }

  function expectCardsNotLoaded() {
    expect(stampCardDAO.getAllStampCardsByUserID).not.toHaveBeenCalled();
    expect(giftCardDAO.getAllGiftCardsByUserID).not.toHaveBeenCalled();
  }

  function expectPreferencesNotLoaded() {
    expect(prefsDAO.getUserNotificationPreferencesByUserID).not.toHaveBeenCalled();
  }

  describe('validation', () => {
    it('throws InvalidUUIDError for a malformed location_id', async () => {
      await expect(service().checkIn('not-a-uuid', validUserId)).rejects.toThrow(InvalidUUIDError);

      expect(userDAO.getUserByID).not.toHaveBeenCalled();
      expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
      expectCardsNotLoaded();
      expectPreferencesNotLoaded();
    });

    // Assumes requireFields({ location_id, user_id }, [...]) runs first.
    // Without requireFields this throws InvalidUUIDError instead.
    it('throws ValidationError when user_id is missing', async () => {
      await expect(service().checkIn(validLocationId, undefined as any)).rejects.toThrow(
        ValidationError,
      );

      expect(userDAO.getUserByID).not.toHaveBeenCalled();
      expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
      expectCardsNotLoaded();
      expectPreferencesNotLoaded();
    });

    it('throws InvalidUUIDError for a malformed user_id', async () => {
      await expect(service().checkIn(validLocationId, 'not-a-uuid')).rejects.toThrow(
        InvalidUUIDError,
      );

      expect(userDAO.getUserByID).not.toHaveBeenCalled();
      expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
      expectCardsNotLoaded();
      expectPreferencesNotLoaded();
    });
  });

  describe('existence checks', () => {
    it("throws NotFoundError when the user doesn't exist", async () => {
      (userDAO.getUserByID as any).mockResolvedValue(null);

      await expect(service().checkIn(validLocationId, validUserId)).rejects.toThrow(NotFoundError);

      expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
      expectCardsNotLoaded();
      expectPreferencesNotLoaded();
    });

    it("throws NotFoundError when the location doesn't exist", async () => {
      (locationDAO.getLocationByID as any).mockResolvedValue(null);

      await expect(service().checkIn(validLocationId, validUserId)).rejects.toThrow(NotFoundError);

      expectCardsNotLoaded();
      expectPreferencesNotLoaded();
    });
  });

  describe('result context', () => {
    it('returns the now, location_id and user timezone used for evaluation', async () => {
      (userDAO.getUserByID as any).mockResolvedValue({
        ...baseUser,
        timezone: 'America/Vancouver',
      });
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([relevantStampCard]);

      const result = await service().checkIn(validLocationId, validUserId, now);

      expect(result.context).toEqual({
        now,
        location_id: validLocationId,
        timezone: 'America/Vancouver',
      });
    });
  });

  describe('card relevance', () => {
    it('returns an empty result when the user has no cards', async () => {
      const result = await service().checkIn(validLocationId, validUserId, now);

      expect(result).toEqual(emptyResult);
      expect(userDAO.getUserByID).toHaveBeenCalledWith(validUserId);
      expect(locationDAO.getLocationByID).toHaveBeenCalledWith(validLocationId);
    });

    it('returns an empty result when the user only has cards for other businesses', async () => {
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([
        { ...relevantStampCard, business_id: otherBusinessId },
      ]);
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([
        { ...relevantGiftCard, business_id: otherBusinessId },
      ]);

      expect(await service().checkIn(validLocationId, validUserId, now)).toEqual(emptyResult);
    });

    it('returns an empty result when matching cards exist but none are worth notifying', async () => {
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([
        { ...relevantStampCard, stamps_acquired: 0 },
      ]);
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([
        { ...relevantGiftCard, current_balance: 0 },
      ]);

      expect(await service().checkIn(validLocationId, validUserId, now)).toEqual(emptyResult);
    });

    it('does not load preferences when no cards are relevant', async () => {
      await service().checkIn(validLocationId, validUserId, now);

      expectPreferencesNotLoaded();
    });

    it("returns the relevant cards tagged by type for the location's business", async () => {
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([
        relevantStampCard,
        { ...relevantStampCard, id: 'stamp-other', business_id: otherBusinessId },
      ]);
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([relevantGiftCard]);

      const result = await service().checkIn(validLocationId, validUserId, now);

      expect(result.eligible).toEqual([
        { type: 'stamp_card', card: relevantStampCard },
        { type: 'gift_card', card: relevantGiftCard },
      ]);
      expect(result.rejected).toEqual([]);
    });

    it('loads both card lists for the checking-in user', async () => {
      await service().checkIn(validLocationId, validUserId, now);

      expect(stampCardDAO.getAllStampCardsByUserID).toHaveBeenCalledWith(validUserId);
      expect(giftCardDAO.getAllGiftCardsByUserID).toHaveBeenCalledWith(validUserId);
    });

    it('propagates a failure from either card DAO', async () => {
      (giftCardDAO.getAllGiftCardsByUserID as any).mockRejectedValue(new Error('db down'));

      await expect(service().checkIn(validLocationId, validUserId, now)).rejects.toThrow('db down');
    });
  });

  describe('preferences', () => {
    beforeEach(() => {
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([relevantStampCard]);
    });

    it("loads the checking-in user's preferences when cards are relevant", async () => {
      await service().checkIn(validLocationId, validUserId, now);

      expect(prefsDAO.getUserNotificationPreferencesByUserID).toHaveBeenCalledWith(validUserId);
    });

    it('throws NotFoundError when preferences are missing and cards are relevant', async () => {
      (prefsDAO.getUserNotificationPreferencesByUserID as any).mockResolvedValue(null);

      await expect(service().checkIn(validLocationId, validUserId, now)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('propagates a failure from the preferences DAO', async () => {
      (prefsDAO.getUserNotificationPreferencesByUserID as any).mockRejectedValue(
        new Error('prefs down'),
      );

      await expect(service().checkIn(validLocationId, validUserId, now)).rejects.toThrow(
        'prefs down',
      );
    });
  });

  describe('eligibility evaluation', () => {
    it('marks relevant cards eligible when every check passes', async () => {
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([relevantStampCard]);
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([relevantGiftCard]);

      const result = await service().checkIn(validLocationId, validUserId, now);

      expect(result.eligible).toHaveLength(2);
      expect(result.rejected).toEqual([]);
    });

    it('partitions cards into eligible and rejected, keeping reason and detail', async () => {
      const expiredGift: GiftCard = {
        ...relevantGiftCard,
        id: 'gift-expired',
        expiration_date: new Date('2026-06-14T00:00:00Z'), // yesterday
      };
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([relevantStampCard]);
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([expiredGift]);

      const result = await service().checkIn(validLocationId, validUserId, now);

      expect(result.eligible).toEqual([{ type: 'stamp_card', card: relevantStampCard }]);
      expect(result.rejected).toEqual([
        {
          notifiable: { type: 'gift_card', card: expiredGift },
          reason: 'expired_card',
          detail: 'Card Expired on 2026-06-14',
        },
      ]);
    });

    it('rejects every relevant card with notifications_disabled when the user opted out', async () => {
      (prefsDAO.getUserNotificationPreferencesByUserID as any).mockResolvedValue({
        ...basePreferences,
        notifications_enabled: false,
      });
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([relevantStampCard]);
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([relevantGiftCard]);

      const result = await service().checkIn(validLocationId, validUserId, now);

      expect(result.eligible).toEqual([]);
      expect(result.rejected).toHaveLength(2);
      expect(result.rejected.every((r) => r.reason === 'notifications_disabled')).toBe(true);
    });

    it('evaluates each card independently (one failing card does not reject the others)', async () => {
      const cooldownStamp: StampCard = {
        ...relevantStampCard,
        id: 'stamp-cooling',
        notification_cooldown_seconds: 3600,
        notification_time_sent: new Date('2026-06-15T11:30:00Z'), // 30 min ago
      };
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([
        relevantStampCard,
        cooldownStamp,
      ]);

      const result = await service().checkIn(validLocationId, validUserId, now);

      expect(result.eligible).toEqual([{ type: 'stamp_card', card: relevantStampCard }]);
      expect(result.rejected).toEqual([
        expect.objectContaining({
          notifiable: { type: 'stamp_card', card: cooldownStamp },
          reason: 'still_in_cooldown',
        }),
      ]);
    });
  });

  describe('timezone and now', () => {
    // Tuesday 05:00 UTC = Monday 22:00 in Vancouver (UTC-7 in June)
    const tuesdayUtcMondayVancouver = new Date('2026-06-16T05:00:00Z');
    const mondayOnlyCard: StampCard = { ...relevantStampCard, notify_window_days: ['monday'] };

    beforeEach(() => {
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([mondayOnlyCard]);
    });

    it("evaluates in the user's timezone, not UTC", async () => {
      (userDAO.getUserByID as any).mockResolvedValue({
        ...baseUser,
        timezone: 'America/Vancouver',
      });

      const result = await service().checkIn(
        validLocationId,
        validUserId,
        tuesdayUtcMondayVancouver,
      );

      expect(result.eligible).toHaveLength(1);
      expect(result.rejected).toEqual([]);
    });

    it('rejects the same instant when the user is in UTC (contrast case)', async () => {
      const result = await service().checkIn(
        validLocationId,
        validUserId,
        tuesdayUtcMondayVancouver,
      );

      expect(result.eligible).toEqual([]);
      expect(result.rejected).toEqual([expect.objectContaining({ reason: 'card_window_invalid' })]);
    });

    it('defaults now to the current time when none is passed', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(now); // Monday 12:00 UTC

      const result = await service().checkIn(validLocationId, validUserId);

      expect(result.eligible).toHaveLength(1);
    });
  });
});
