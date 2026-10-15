import { describe, it, expect } from "vitest";
import { generalWindowCheck } from "../../../../src/services/notification-eligibility/checks/generalWindow.check";
import type { NotifiableCard, EligibilityContext } from "@/src/services/notification-eligibility/types";
import type { UserNotificationPreferences } from "@/src/models/user-notification-preferences.model";
import type { GiftCard } from "@/src/models/gift-card.model";
import { DAY_OF_WEEK } from "@/src/models/shared.types";

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

// Monday, 12:00 UTC (720 minutes into the day)
const context: EligibilityContext = {
  now: new Date("2026-06-15T12:00:00Z"),
  location_id: "location-1",
  timezone: "UTC",
};

describe("generalWindowCheck", () => {
  it("is eligible when no window restrictions are set", () => {
    expect(generalWindowCheck.check(notifiable, basePreferences, context)).toEqual({ eligible: true });
  });

  it("is eligible when today is included in notify_window_days", () => {
    const preferences = { ...basePreferences, notify_window_days: ["monday", "wednesday"] as DAY_OF_WEEK[] };
    expect(generalWindowCheck.check(notifiable, preferences, context)).toEqual({ eligible: true });
  });

  it("is ineligible when today is not in notify_window_days", () => {
    const preferences = { ...basePreferences, notify_window_days: ["tuesday", "wednesday"] as DAY_OF_WEEK[] };
    const result = generalWindowCheck.check(notifiable, preferences, context);
    expect(result).toEqual({
      eligible: false,
      reason: "general_window_invalid",
      detail: "Invalid: outside user's Day of Week preference window",
    });
  });

  it("is eligible when now is within the start/end time window", () => {
    const preferences = {
      ...basePreferences,
      general_notification_window_start: "09:00:00",
      general_notification_window_end: "17:00:00",
    };
    expect(generalWindowCheck.check(notifiable, preferences, context)).toEqual({ eligible: true });
  });

  it("is ineligible when now is before the start of the window", () => {
    const preferences = {
      ...basePreferences,
      general_notification_window_start: "13:00:00",
      general_notification_window_end: "17:00:00",
    };
    const result = generalWindowCheck.check(notifiable, preferences, context);
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.detail).toContain("before window");
  });

  it("is ineligible when now is after the end of the window", () => {
    const preferences = {
      ...basePreferences,
      general_notification_window_start: "06:00:00",
      general_notification_window_end: "10:00:00",
    };
    const result = generalWindowCheck.check(notifiable, preferences, context);
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.detail).toContain("after window");
  });

  it("treats a window starting at midnight correctly (does not mistake 00:00 for 'no restriction')", () => {
    const preferences = {
      ...basePreferences,
      general_notification_window_start: "00:00:00",
      general_notification_window_end: "01:00:00",
    };
    // now is 12:00 — well past this narrow early-morning window
    expect(generalWindowCheck.check(notifiable, preferences, context).eligible).toBe(false);
  });

  it("respects the user's timezone, not the server's", () => {
    // now is Tuesday 05:00 UTC — but Monday 22:00 in America/Vancouver (UTC-7 in June)
    const vancouverContext: EligibilityContext = {
      now: new Date("2026-06-16T05:00:00Z"),
      location_id: "location-1",
      timezone: "America/Vancouver",
    };
    const preferences = { ...basePreferences, notify_window_days: ["monday"] as DAY_OF_WEEK[] };
    // If day-of-week were computed in UTC, this would be Tuesday and fail.
    expect(generalWindowCheck.check(notifiable, preferences, vancouverContext)).toEqual({ eligible: true });
  });
});