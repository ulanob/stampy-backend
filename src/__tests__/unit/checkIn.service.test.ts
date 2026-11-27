import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { createCheckInService } from '../../services/checkIn.service';
import type { TimezoneService } from '../../services/timezone.service';
import type {
  LocationDAO,
  UserDAO,
  StampCardDAO,
  GiftCardDAO,
  NotificationDAO,
  UserNotificationPreferencesDAO,
} from '../../dao';
import type { StampCard } from '../../models/stamp-card.model';
import type { GiftCard } from '../../models/gift-card.model';
import type { UserNotificationPreferences } from '../../models/user-notification-preferences.model';
import { NotFoundError, ValidationError, InvalidUUIDError } from '../../utils/validators';
import { EligibilityContext } from '@/src/services/notification-eligibility/types';

describe('checkInService.checkIn', () => {
  let mockClient: Partial<PoolClient>;
  let mockPool: Partial<Pool>;
  let locationDAO: LocationDAO;
  let userDAO: UserDAO;
  let stampCardDAO: StampCardDAO;
  let giftCardDAO: GiftCardDAO;
  let notificationDAO: NotificationDAO;
  let prefsDAO: UserNotificationPreferencesDAO;
  let timezoneService: TimezoneService;

  const validLocationId = 'b1b2c3d4-0000-0000-0000-000000000001';
  const validUserId = 'a1b2c3d4-0000-0000-0000-000000000005';
  const businessId = 'a1b2c3d4-0000-0000-0000-000000000001';
  const otherBusinessId = 'a1b2c3d4-0000-0000-0000-000000000002';

  // Monday, 12:00 UTC
  const now = new Date('2026-06-15T12:00:00Z');

  const baseLocation = {
    id: validLocationId,
    business_id: businessId,
    lat: 49.2827,
    lng: -123.1207,
  };
  const baseUser = { id: validUserId, timezone: 'UTC' };
  const createdNotification = { id: 'notification-1' };

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

  const emptyResult = { context, eligible: [], rejected: [], notification: null };

  beforeEach(() => {
    mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    mockPool = { connect: vi.fn().mockResolvedValue(mockClient) };

    locationDAO = {
      getLocationByID: vi.fn().mockResolvedValue(baseLocation),
    } as unknown as LocationDAO;

    userDAO = {
      getUserByID: vi.fn().mockResolvedValue(baseUser),
    } as unknown as UserDAO;

    stampCardDAO = {
      getAllStampCardsByUserID: vi.fn().mockResolvedValue([]),
      claimNotification: vi.fn().mockResolvedValue(true),
    } as unknown as StampCardDAO;

    giftCardDAO = {
      getAllGiftCardsByUserID: vi.fn().mockResolvedValue([]),
      claimNotification: vi.fn().mockResolvedValue(true),
    } as unknown as GiftCardDAO;

    notificationDAO = {
      createNotification: vi.fn().mockResolvedValue(createdNotification),
    } as unknown as NotificationDAO;

    prefsDAO = {
      getUserNotificationPreferencesForUpdate: vi.fn().mockResolvedValue(basePreferences),
      recordNotificationsSent: vi.fn().mockResolvedValue(basePreferences),
    } as unknown as UserNotificationPreferencesDAO;

    timezoneService = {
      correctUserTimezone: vi.fn().mockResolvedValue(baseUser.timezone), // 'UTC'
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function service() {
    return createCheckInService(
      locationDAO,
      userDAO,
      stampCardDAO,
      giftCardDAO,
      prefsDAO,
      notificationDAO,
      timezoneService,
      mockPool as Pool,
    );
  }

  function expectCardsNotLoaded() {
    expect(stampCardDAO.getAllStampCardsByUserID).not.toHaveBeenCalled();
    expect(giftCardDAO.getAllGiftCardsByUserID).not.toHaveBeenCalled();
  }

  // Validation and existence failures happen before the transaction opens.
  function expectNoTransactionOpened() {
    expect(mockPool.connect).not.toHaveBeenCalled();
    expect(prefsDAO.getUserNotificationPreferencesForUpdate).not.toHaveBeenCalled();
  }

  function expectNothingWritten() {
    expect(stampCardDAO.claimNotification).not.toHaveBeenCalled();
    expect(giftCardDAO.claimNotification).not.toHaveBeenCalled();
    expect(notificationDAO.createNotification).not.toHaveBeenCalled();
    expect(prefsDAO.recordNotificationsSent).not.toHaveBeenCalled();
  }

  describe('validation', () => {
    it('throws InvalidUUIDError for a malformed location_id', async () => {
      await expect(service().checkIn('not-a-uuid', validUserId)).rejects.toThrow(InvalidUUIDError);

      expect(userDAO.getUserByID).not.toHaveBeenCalled();
      expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
      expectCardsNotLoaded();
      expectNoTransactionOpened();
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
      expectNoTransactionOpened();
    });

    it('throws InvalidUUIDError for a malformed user_id', async () => {
      await expect(service().checkIn(validLocationId, 'not-a-uuid')).rejects.toThrow(
        InvalidUUIDError,
      );

      expect(userDAO.getUserByID).not.toHaveBeenCalled();
      expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
      expectCardsNotLoaded();
      expectNoTransactionOpened();
    });
  });

  describe('existence checks', () => {
    it("throws NotFoundError when the user doesn't exist", async () => {
      (userDAO.getUserByID as any).mockResolvedValue(null);

      await expect(service().checkIn(validLocationId, validUserId)).rejects.toThrow(NotFoundError);

      expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
      expectCardsNotLoaded();
      expectNoTransactionOpened();
    });

    it("throws NotFoundError when the location doesn't exist", async () => {
      (locationDAO.getLocationByID as any).mockResolvedValue(null);

      await expect(service().checkIn(validLocationId, validUserId)).rejects.toThrow(NotFoundError);

      expectCardsNotLoaded();
      expectNoTransactionOpened();
    });
  });

  describe('result context', () => {
    it('returns the now, location_id and user timezone used for evaluation', async () => {
      (timezoneService.correctUserTimezone as any).mockResolvedValue('America/Vancouver');
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

    it('writes nothing when no cards are relevant', async () => {
      await service().checkIn(validLocationId, validUserId, now);

      expectNothingWritten();
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

    it('loads both card lists for the checking-in user on the transaction client', async () => {
      await service().checkIn(validLocationId, validUserId, now);

      expect(stampCardDAO.getAllStampCardsByUserID).toHaveBeenCalledWith(
        validUserId,
        false,
        mockClient,
      );
      expect(giftCardDAO.getAllGiftCardsByUserID).toHaveBeenCalledWith(
        validUserId,
        false,
        mockClient,
      );
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

    it('locks the preferences row on the transaction client', async () => {
      await service().checkIn(validLocationId, validUserId, now);

      expect(prefsDAO.getUserNotificationPreferencesForUpdate).toHaveBeenCalledWith(
        validUserId,
        mockClient,
      );
    });

    it('takes the lock before loading any cards', async () => {
      await service().checkIn(validLocationId, validUserId, now);

      const lockOrder = (prefsDAO.getUserNotificationPreferencesForUpdate as any).mock
        .invocationCallOrder[0];
      const stampsOrder = (stampCardDAO.getAllStampCardsByUserID as any).mock
        .invocationCallOrder[0];
      const giftsOrder = (giftCardDAO.getAllGiftCardsByUserID as any).mock.invocationCallOrder[0];

      expect(lockOrder).toBeLessThan(stampsOrder);
      expect(lockOrder).toBeLessThan(giftsOrder);
    });

    it('throws NotFoundError when preferences are missing, before loading cards', async () => {
      (prefsDAO.getUserNotificationPreferencesForUpdate as any).mockResolvedValue(null);

      await expect(service().checkIn(validLocationId, validUserId, now)).rejects.toThrow(
        NotFoundError,
      );

      expectCardsNotLoaded();
      expectNothingWritten();
    });

    it('propagates a failure from the preferences DAO', async () => {
      (prefsDAO.getUserNotificationPreferencesForUpdate as any).mockRejectedValue(
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
      (prefsDAO.getUserNotificationPreferencesForUpdate as any).mockResolvedValue({
        ...basePreferences,
        notifications_enabled: false,
      });
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([relevantStampCard]);
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([relevantGiftCard]);

      const result = await service().checkIn(validLocationId, validUserId, now);

      expect(result.eligible).toEqual([]);
      expect(result.rejected).toHaveLength(2);
      expect(result.rejected.every((r) => r.reason === 'notifications_disabled')).toBe(true);
      expectNothingWritten();
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

  describe('claiming and writes', () => {
    beforeEach(() => {
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([relevantStampCard]);
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([relevantGiftCard]);
    });

    it('claims each eligible card through its own DAO with the observed value, now, and the client', async () => {
      const lastSent = new Date('2026-06-14T10:00:00Z'); // no cooldown configured, so still eligible
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([
        { ...relevantStampCard, notification_time_sent: lastSent },
      ]);

      await service().checkIn(validLocationId, validUserId, now);

      expect(stampCardDAO.claimNotification).toHaveBeenCalledWith(
        relevantStampCard.id,
        lastSent,
        now,
        mockClient,
      );
      expect(giftCardDAO.claimNotification).toHaveBeenCalledWith(
        relevantGiftCard.id,
        null,
        now,
        mockClient,
      );
    });

    it('does not claim cards that were rejected by the pipeline', async () => {
      const expiredGift: GiftCard = {
        ...relevantGiftCard,
        expiration_date: new Date('2026-06-14T00:00:00Z'),
      };
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([expiredGift]);

      await service().checkIn(validLocationId, validUserId, now);

      expect(stampCardDAO.claimNotification).toHaveBeenCalledTimes(1);
      expect(giftCardDAO.claimNotification).not.toHaveBeenCalled();
    });

    it('creates one notification for all claimed cards, with no card ids when more than one', async () => {
      const result = await service().checkIn(validLocationId, validUserId, now);

      expect(notificationDAO.createNotification).toHaveBeenCalledTimes(1);
      expect(notificationDAO.createNotification).toHaveBeenCalledWith(
        {
          user_id: validUserId,
          stamp_card_id: null,
          gift_card_id: null,
          location_id: validLocationId,
          type: 'check_in',
          subject: 'You have cards nearby',
          body: '1 stamp card with 3/10 stamps / 1 gift card with $25.00',
        },
        mockClient,
      );
      expect(result.notification).toBe(createdNotification);
    });

    it('sets stamp_card_id when exactly one stamp card is included', async () => {
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([]);

      await service().checkIn(validLocationId, validUserId, now);

      expect(notificationDAO.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ stamp_card_id: relevantStampCard.id, gift_card_id: null }),
        mockClient,
      );
    });

    it('sets gift_card_id when exactly one gift card is included', async () => {
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([]);

      await service().checkIn(validLocationId, validUserId, now);

      expect(notificationDAO.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ stamp_card_id: null, gift_card_id: relevantGiftCard.id }),
        mockClient,
      );
    });

    it('treats a lost claim as a rejection and leaves that card out of the notification', async () => {
      (giftCardDAO.claimNotification as any).mockResolvedValue(false);

      const result = await service().checkIn(validLocationId, validUserId, now);

      expect(result.eligible).toEqual([{ type: 'stamp_card', card: relevantStampCard }]);
      expect(result.rejected).toEqual([
        expect.objectContaining({
          notifiable: { type: 'gift_card', card: relevantGiftCard },
          reason: 'claim_lost',
        }),
      ]);
      expect(notificationDAO.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ body: '1 stamp card with 3/10 stamps' }),
        mockClient,
      );
    });

    it('writes no notification and no counter when every claim is lost', async () => {
      (stampCardDAO.claimNotification as any).mockResolvedValue(false);
      (giftCardDAO.claimNotification as any).mockResolvedValue(false);

      const result = await service().checkIn(validLocationId, validUserId, now);

      expect(result.eligible).toEqual([]);
      expect(result.rejected.every((r) => r.reason === 'claim_lost')).toBe(true);
      expect(result.notification).toBeNull();
      expect(notificationDAO.createNotification).not.toHaveBeenCalled();
      expect(prefsDAO.recordNotificationsSent).not.toHaveBeenCalled();
    });

    it('records the counter once per check-in, not once per card', async () => {
      await service().checkIn(validLocationId, validUserId, now);

      expect(prefsDAO.recordNotificationsSent).toHaveBeenCalledTimes(1);
      expect(prefsDAO.recordNotificationsSent).toHaveBeenCalledWith(
        validUserId,
        { counter: 1, last_notified_date: now },
        mockClient,
      );
    });

    it('increments the existing counter when the last notification was the same local day', async () => {
      (prefsDAO.getUserNotificationPreferencesForUpdate as any).mockResolvedValue({
        ...basePreferences,
        daily_notification_counter: 2,
        last_notified_date: new Date('2026-06-15T08:00:00Z'),
      });

      await service().checkIn(validLocationId, validUserId, now);

      expect(prefsDAO.recordNotificationsSent).toHaveBeenCalledWith(
        validUserId,
        { counter: 3, last_notified_date: now },
        mockClient,
      );
    });

    it('resets the counter to 1 when the last notification was a previous local day', async () => {
      (prefsDAO.getUserNotificationPreferencesForUpdate as any).mockResolvedValue({
        ...basePreferences,
        daily_notification_counter: 3,
        last_notified_date: new Date('2026-06-14T12:00:00Z'),
      });

      await service().checkIn(validLocationId, validUserId, now);

      expect(prefsDAO.recordNotificationsSent).toHaveBeenCalledWith(
        validUserId,
        { counter: 1, last_notified_date: now },
        mockClient,
      );
    });

    it("compares the last notification day in the user's timezone, not UTC", async () => {
      // Tuesday 05:00 UTC = Monday 22:00 Vancouver; last sent Monday 13:00 Vancouver
      const vancouverNow = new Date('2026-06-16T05:00:00Z');
      (timezoneService.correctUserTimezone as any).mockResolvedValue('America/Vancouver');
      (prefsDAO.getUserNotificationPreferencesForUpdate as any).mockResolvedValue({
        ...basePreferences,
        daily_notification_counter: 2,
        last_notified_date: new Date('2026-06-15T20:00:00Z'),
      });

      await service().checkIn(validLocationId, validUserId, vancouverNow);

      // Same local day: increments. Compared in UTC (Jun 15 vs Jun 16) it would reset to 1.
      expect(prefsDAO.recordNotificationsSent).toHaveBeenCalledWith(
        validUserId,
        { counter: 3, last_notified_date: vancouverNow },
        mockClient,
      );
    });
  });

  describe('transaction', () => {
    beforeEach(() => {
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([relevantStampCard]);
    });

    it('commits and releases the client on success', async () => {
      await service().checkIn(validLocationId, validUserId, now);

      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('rolls back and releases when creating the notification fails, without recording the counter', async () => {
      (notificationDAO.createNotification as any).mockRejectedValue(new Error('insert failed'));

      await expect(service().checkIn(validLocationId, validUserId, now)).rejects.toThrow(
        'insert failed',
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
      expect(prefsDAO.recordNotificationsSent).not.toHaveBeenCalled();
    });

    it('rolls back when recording the counter fails', async () => {
      (prefsDAO.recordNotificationsSent as any).mockRejectedValue(new Error('update failed'));

      await expect(service().checkIn(validLocationId, validUserId, now)).rejects.toThrow(
        'update failed',
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
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
      (timezoneService.correctUserTimezone as any).mockResolvedValue('America/Vancouver');

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
