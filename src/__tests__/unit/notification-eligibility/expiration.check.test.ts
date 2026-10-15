import { describe, it, expect } from "vitest";
import { expirationCheck } from "../../../../src/services/notification-eligibility/checks/expiration.check";
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

describe("expirationCheck", () => {
  it("is eligible when the card has no expiration_date", () => {
    const notifiable: NotifiableCard = { type: "gift_card", card: { ...baseGiftCard, expiration_date: null } };
    expect(expirationCheck.check(notifiable, basePreferences, context)).toEqual({ eligible: true });
  });

  it("is eligible when the card expires in the future", () => {
    const notifiable: NotifiableCard = {
      type: "gift_card",
      card: { ...baseGiftCard, expiration_date: new Date("2026-07-01T00:00:00Z") },
    };
    expect(expirationCheck.check(notifiable, basePreferences, context)).toEqual({ eligible: true });
  });

  it("is eligible on the card's expiration day itself (expires through end of day, not start)", () => {
    const notifiable: NotifiableCard = {
      type: "gift_card",
      card: { ...baseGiftCard, expiration_date: new Date("2026-06-15T00:00:00Z") }, // today
    };
    expect(expirationCheck.check(notifiable, basePreferences, context)).toEqual({ eligible: true });
  });

  it("is ineligible the day after the card expires", () => {
    const notifiable: NotifiableCard = {
      type: "gift_card",
      card: { ...baseGiftCard, expiration_date: new Date("2026-06-14T23:00:00Z") }, // yesterday
    };
    const result = expirationCheck.check(notifiable, basePreferences, context);
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("expired_card");
      expect(result.detail).toBe("Card Expired on 2026-06-14");
    }
  });

  it("respects the user's timezone when determining the local calendar day", () => {
    // expiration_date is June 15 23:00 UTC — already June 16 in a UTC+2 zone
    const berlinContext: EligibilityContext = {
      now: new Date("2026-06-16T10:00:00Z"), // June 16, noon in Berlin
      location_id: "location-1",
      timezone: "Europe/Berlin",
    };
    const notifiable: NotifiableCard = {
      type: "gift_card",
      card: { ...baseGiftCard, expiration_date: new Date("2026-06-15T23:00:00Z") }, // June 16, 01:00 Berlin
    };
    // In Berlin local time, expiration_date and now both fall on June 16 — still eligible.
    expect(expirationCheck.check(notifiable, basePreferences, berlinContext)).toEqual({ eligible: true });
  });
});