import { describe, it, expect } from "vitest";
import { quietHoursCheck } from "../../../../src/services/notification-eligibility/checks/quietHours.check";
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

// Monday 2026-06-15 at the given UTC wall-clock time, evaluated in UTC
function contextAt(hhmm: string): EligibilityContext {
  return {
    now: new Date(`2026-06-15T${hhmm}:00Z`),
    location_id: "location-1",
    timezone: "UTC",
  };
}

function withQuietHours(start: string | null, end: string | null): UserNotificationPreferences {
  return { ...basePreferences, quiet_hours_start: start, quiet_hours_end: end };
}

describe("quietHoursCheck", () => {
  describe("no usable window configured", () => {
    it("is eligible when no quiet hours are configured", () => {
      expect(quietHoursCheck.check(notifiable, basePreferences, contextAt("23:00"))).toEqual({ eligible: true });
    });

    it("is eligible when only the start is set (incomplete config treated as no restriction)", () => {
      expect(quietHoursCheck.check(notifiable, withQuietHours("22:00:00", null), contextAt("23:00"))).toEqual({ eligible: true });
    });

    it("is eligible when only the end is set", () => {
      expect(quietHoursCheck.check(notifiable, withQuietHours(null, "07:00:00"), contextAt("03:00"))).toEqual({ eligible: true });
    });

    it("is eligible when start equals end (treated as no window)", () => {
      expect(quietHoursCheck.check(notifiable, withQuietHours("22:00:00", "22:00:00"), contextAt("22:00"))).toEqual({ eligible: true });
    });
  });

  describe("same-day window (21:00–23:30)", () => {
    const preferences = withQuietHours("21:00:00", "23:30:00");

    it("is ineligible when now is inside the window", () => {
      expect(quietHoursCheck.check(notifiable, preferences, contextAt("23:00"))).toEqual({
        eligible: false,
        reason: "within_user_quiet_window",
        detail: "Within user's quiet window of 21:00:00 and 23:30:00",
      });
    });

    it("is eligible when now is before the window", () => {
      expect(quietHoursCheck.check(notifiable, preferences, contextAt("12:00"))).toEqual({ eligible: true });
    });

    it("is eligible when now is after the window", () => {
      expect(quietHoursCheck.check(notifiable, preferences, contextAt("23:45"))).toEqual({ eligible: true });
    });

    it("treats the start minute as inside (start inclusive)", () => {
      expect(quietHoursCheck.check(notifiable, preferences, contextAt("21:00")).eligible).toBe(false);
    });

    it("treats the end minute as outside (end exclusive)", () => {
      expect(quietHoursCheck.check(notifiable, preferences, contextAt("23:30"))).toEqual({ eligible: true });
    });
  });

  describe("overnight window (22:00–07:00)", () => {
    const preferences = withQuietHours("22:00:00", "07:00:00");

    it.each(["23:00", "02:00"])("is ineligible at %s (inside the window)", (time) => {
      const result = quietHoursCheck.check(notifiable, preferences, contextAt(time));
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe("within_user_quiet_window");
        expect(result.detail).toBe("Within user's quiet window of 22:00:00 and 07:00:00");
      }
    });

    it("is eligible during the daytime gap", () => {
      expect(quietHoursCheck.check(notifiable, preferences, contextAt("12:00"))).toEqual({ eligible: true });
    });

    it("treats the start minute as inside (start inclusive)", () => {
      expect(quietHoursCheck.check(notifiable, preferences, contextAt("22:00")).eligible).toBe(false);
    });

    it("treats the end minute as outside (end exclusive)", () => {
      expect(quietHoursCheck.check(notifiable, preferences, contextAt("07:00"))).toEqual({ eligible: true });
    });
  });

  it("evaluates the window in the user's timezone, not UTC", () => {
    // 06:00 UTC on June 16 is 23:00 on June 15 in America/Vancouver (UTC-7 in June)
    const vancouverContext: EligibilityContext = {
      now: new Date("2026-06-16T06:00:00Z"),
      location_id: "location-1",
      timezone: "America/Vancouver",
    };
    // Inside 21:00–23:30 in Vancouver local time; read as UTC (06:00) it would be outside.
    const result = quietHoursCheck.check(notifiable, withQuietHours("21:00:00", "23:30:00"), vancouverContext);
    expect(result.eligible).toBe(false);
  });
});