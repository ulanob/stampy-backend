import { describe, it, expect } from 'vitest';
import {
  cooldownCheck,
  DEFAULT_COOLDOWN_SECONDS,
} from '../../../../src/services/notification-eligibility/checks/cooldown.check';
import type {
  NotifiableCard,
  EligibilityContext,
} from '../../../../src/services/notification-eligibility/types';
import type { UserNotificationPreferences } from '../../../../src/models/user-notification-preferences.model';
import type { GiftCard } from '../../../../src/models/gift-card.model';

const baseGiftCard: GiftCard = {
  id: 'gift-card-1',
  user_id: 'user-1',
  business_id: 'business-1',
  nickname: null,
  notes: null,
  current_balance: 50,
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
  user_id: 'user-1',
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
  now: new Date('2026-06-15T12:00:00Z'),
  location_id: 'location-1',
  timezone: 'UTC',
};

function giftNotifiable(overrides: Partial<GiftCard>): NotifiableCard {
  return { type: 'gift_card', card: { ...baseGiftCard, ...overrides } };
}

function secondsAgo(seconds: number): Date {
  return new Date(context.now.getTime() - seconds * 1000);
}

describe('cooldownCheck', () => {
  it('is eligible when the card has never been notified (notification_time_sent is null)', () => {
    const notifiable: NotifiableCard = {
      type: 'gift_card',
      card: { ...baseGiftCard, notification_time_sent: null, notification_cooldown_seconds: 3600 },
    };
    expect(cooldownCheck.check(notifiable, basePreferences, context)).toEqual({ eligible: true });
  });

  it('is ineligible when the cooldown has not yet elapsed', () => {
    const notifiable: NotifiableCard = {
      type: 'gift_card',
      card: {
        ...baseGiftCard,
        notification_cooldown_seconds: 3600, // 1 hour
        notification_time_sent: new Date('2026-06-15T11:30:00Z'), // 30 minutes ago
      },
    };
    const result = cooldownCheck.check(notifiable, basePreferences, context);
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe('still_in_cooldown');
      expect(result.detail).toContain('1800 seconds'); // 3600 - 1800 remaining
    }
  });

  it('is eligible once the cooldown has fully elapsed', () => {
    const notifiable: NotifiableCard = {
      type: 'gift_card',
      card: {
        ...baseGiftCard,
        notification_cooldown_seconds: 3600,
        notification_time_sent: new Date('2026-06-15T10:00:00Z'), // 2 hours ago
      },
    };
    expect(cooldownCheck.check(notifiable, basePreferences, context)).toEqual({ eligible: true });
  });

  it('is eligible exactly at the cooldown boundary', () => {
    const notifiable: NotifiableCard = {
      type: 'gift_card',
      card: {
        ...baseGiftCard,
        notification_cooldown_seconds: 3600,
        notification_time_sent: new Date('2026-06-15T11:00:00Z'), // exactly 1 hour ago
      },
    };
    // cooldownTime > elapsedSecs → 3600 > 3600 → false → eligible
    expect(cooldownCheck.check(notifiable, basePreferences, context)).toEqual({ eligible: true });
  });

  it('exposes a 3 hour default', () => {
    expect(DEFAULT_COOLDOWN_SECONDS).toBe(10800);
  });

  describe('null cooldown falls back to the default', () => {
    it('is ineligible 1 minute after the last notification', () => {
      const result = cooldownCheck.check(
        giftNotifiable({
          notification_cooldown_seconds: null,
          notification_time_sent: secondsAgo(60),
        }),
        basePreferences,
        context,
      );
      expect(result).toMatchObject({ eligible: false, reason: 'still_in_cooldown' });
    });

    it('is ineligible one second inside the default window', () => {
      const result = cooldownCheck.check(
        giftNotifiable({
          notification_cooldown_seconds: null,
          notification_time_sent: secondsAgo(DEFAULT_COOLDOWN_SECONDS - 1),
        }),
        basePreferences,
        context,
      );
      expect(result).toMatchObject({ eligible: false, reason: 'still_in_cooldown' });
    });

    it('is eligible exactly at the default boundary', () => {
      const result = cooldownCheck.check(
        giftNotifiable({
          notification_cooldown_seconds: null,
          notification_time_sent: secondsAgo(DEFAULT_COOLDOWN_SECONDS),
        }),
        basePreferences,
        context,
      );
      expect(result).toEqual({ eligible: true });
    });

    it('is eligible once past the default window', () => {
      const result = cooldownCheck.check(
        giftNotifiable({
          notification_cooldown_seconds: null,
          notification_time_sent: secondsAgo(DEFAULT_COOLDOWN_SECONDS + 1),
        }),
        basePreferences,
        context,
      );
      expect(result).toEqual({ eligible: true });
    });
  });

  describe('explicit cooldown overrides the default', () => {
    it('is eligible after a custom window shorter than the default', () => {
      const result = cooldownCheck.check(
        giftNotifiable({
          notification_cooldown_seconds: 60,
          notification_time_sent: secondsAgo(61),
        }),
        basePreferences,
        context,
      );
      expect(result).toEqual({ eligible: true });
    });

    it('is ineligible inside a custom window longer than the default', () => {
      const result = cooldownCheck.check(
        giftNotifiable({
          notification_cooldown_seconds: DEFAULT_COOLDOWN_SECONDS * 2,
          notification_time_sent: secondsAgo(DEFAULT_COOLDOWN_SECONDS + 60),
        }),
        basePreferences,
        context,
      );
      expect(result).toMatchObject({ eligible: false, reason: 'still_in_cooldown' });
    });

    it('treats an explicit 0 as no cooldown, not as the default', () => {
      const result = cooldownCheck.check(
        giftNotifiable({ notification_cooldown_seconds: 0, notification_time_sent: secondsAgo(1) }),
        basePreferences,
        context,
      );
      expect(result).toEqual({ eligible: true });
    });
  });
});
