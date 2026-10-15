import { describe, it, expect } from "vitest";
import { dailyCapCheck } from "../../../../src/services/notification-eligibility/checks/dailyCap.check";
import type { NotifiableCard, EligibilityContext } from "../../../../src/services/notification-eligibility/types";
import type { UserNotificationPreferences } from "../../../../src/models/user-notification-preferences.model";
import type { GiftCard } from "../../../../src/models/gift-card.model";

const baseGiftCard: GiftCard = {
  id: "gift-card-1",
  user_id: "user-1",
  business_id: "business-1",
  nickname: null,
  notes: null,
  current_balance: 50,
  currency: "CAD",
  status: "active",
  notify_window_days: null,
  notify_window_start_time: null,
  notify_window_end_time: null,
  notification_time_sent: null,
  notification_cooldown_seconds: null,
  expiration_date: null,
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z"),
  deleted: false,
  deleted_at: null,
};

const notifiable: NotifiableCard = { type: "gift_card", card: baseGiftCard };

const basePreferences: UserNotificationPreferences = {
  id: "prefs-1",
  user_id: "user-1",
  notifications_enabled: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
  notify_window_days: null,
  general_notification_window_start: null,
  general_notification_window_end: null,
  daily_notification_cap: 3,
  daily_notification_counter: 0,
  last_notified_date: null,
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z"),
};

// Monday, noon UTC
const context: EligibilityContext = {
  now: new Date("2026-06-15T12:00:00Z"),
  location_id: "location-1",
  timezone: "UTC",
};

describe("dailyCapCheck", () => {
  it("is eligible when last_notified_date is null (never notified)", () => {
    const preferences = { ...basePreferences, last_notified_date: null, daily_notification_counter: 99 };
    expect(dailyCapCheck.check(notifiable, preferences, context)).toEqual({ eligible: true });
  });

  it("is eligible when last_notified_date is a previous day, regardless of counter", () => {
    const preferences = {
      ...basePreferences,
      last_notified_date: new Date("2026-06-14T12:00:00Z"), // Sunday — different day
      daily_notification_counter: 99,
      daily_notification_cap: 3,
    };
    expect(dailyCapCheck.check(notifiable, preferences, context)).toEqual({ eligible: true });
  });

  it("is eligible when same day and counter is below the cap", () => {
    const preferences = {
      ...basePreferences,
      last_notified_date: new Date("2026-06-15T08:00:00Z"),
      daily_notification_counter: 1,
      daily_notification_cap: 3,
    };
    expect(dailyCapCheck.check(notifiable, preferences, context)).toEqual({ eligible: true });
  });

  it("is ineligible when same day and counter has reached the cap", () => {
    const preferences = {
      ...basePreferences,
      last_notified_date: new Date("2026-06-15T08:00:00Z"),
      daily_notification_counter: 3,
      daily_notification_cap: 3,
    };
    const result = dailyCapCheck.check(notifiable, preferences, context);
    expect(result).toEqual({
      eligible: false,
      reason: "notification_cap_reached",
      detail: "Daily Notification Cap (3) has been reached",
    });
  });

  it("is ineligible when same day and counter has exceeded the cap", () => {
    const preferences = {
      ...basePreferences,
      last_notified_date: new Date("2026-06-15T08:00:00Z"),
      daily_notification_counter: 5,
      daily_notification_cap: 3,
    };
    expect(dailyCapCheck.check(notifiable, preferences, context).eligible).toBe(false);
  });

  it("compares calendar days in the user's timezone, not UTC", () => {
    // now is Tuesday 05:00 UTC, but still Monday 22:00 in America/Vancouver (UTC-7 in June)
    const vancouverContext: EligibilityContext = {
      now: new Date("2026-06-16T05:00:00Z"),
      location_id: "location-1",
      timezone: "America/Vancouver",
    };
    const preferences = {
      ...basePreferences,
      last_notified_date: new Date("2026-06-15T20:00:00Z"), // Monday 13:00 Vancouver
      daily_notification_counter: 3,
      daily_notification_cap: 3,
    };
    // In UTC these are different calendar days (Jun 15 vs Jun 16), which would
    // incorrectly treat the cap as stale/reset if the comparison ignored timezone.
    // In Vancouver local time, both fall on June 15 — same day, cap still applies.
    expect(dailyCapCheck.check(notifiable, preferences, vancouverContext).eligible).toBe(false);
  });
});