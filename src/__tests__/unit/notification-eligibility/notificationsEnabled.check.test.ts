import { describe, it, expect } from "vitest";
import { notificationsEnabledCheck } from "../../../../src/services/notification-eligibility/checks/notificationsEnabled.check";
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

const context: EligibilityContext = {
  now: new Date("2026-06-15T12:00:00Z"),
  location_id: "location-1",
  timezone: "UTC",
};

describe("notificationsEnabledCheck", () => {
  it("is eligible when notifications are enabled", () => {
    const result = notificationsEnabledCheck.check(notifiable, basePreferences, context);
    expect(result).toEqual({ eligible: true });
  });

  it("is ineligible when notifications are disabled", () => {
    const result = notificationsEnabledCheck.check(
      notifiable,
      { ...basePreferences, notifications_enabled: false },
      context
    );
    expect(result).toEqual({
      eligible: false,
      reason: "notifications_disabled",
      detail: "User has disabled notifications",
    });
  });
});