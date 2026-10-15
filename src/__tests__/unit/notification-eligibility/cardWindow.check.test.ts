import { describe, it, expect } from "vitest";
import { cardWindowCheck } from "../../../../src/services/notification-eligibility/checks/cardWindow.check";
import type { NotifiableCard, EligibilityContext } from "../../../../src/services/notification-eligibility/types";
import type { UserNotificationPreferences } from "../../../../src/models/user-notification-preferences.model";
import type { GiftCard } from "../../../../src/models/gift-card.model";
import type { StampCard } from "../../../../src/models/stamp-card.model";

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

const baseStampCard: StampCard = {
  id: "stamp-card-1",
  user_id: "user-1",
  business_id: "business-1",
  nickname: null,
  notes: null,
  stamps_needed: 10,
  stamps_acquired: 5,
  status: "active",
  notify_window_days: null,
  notify_window_start_time: null,
  notify_window_end_time: null,
  notification_time_sent: null,
  notification_cooldown_seconds: null,
  expiration_date: null,
  deleted: false,
  deleted_at: null,
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z"),
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

// Monday, 12:00 UTC (720 minutes into the day)
const context: EligibilityContext = {
  now: new Date("2026-06-15T12:00:00Z"),
  location_id: "location-1",
  timezone: "UTC",
};

describe("cardWindowCheck", () => {
  it("is eligible when the card has no window restrictions", () => {
    const notifiable: NotifiableCard = { type: "gift_card", card: baseGiftCard };
    expect(cardWindowCheck.check(notifiable, basePreferences, context)).toEqual({ eligible: true });
  });

  it("is eligible when today is included in the card's notify_window_days", () => {
    const notifiable: NotifiableCard = {
      type: "gift_card",
      card: { ...baseGiftCard, notify_window_days: ["monday"] },
    };
    expect(cardWindowCheck.check(notifiable, basePreferences, context)).toEqual({ eligible: true });
  });

  it("is ineligible when today is not in the card's notify_window_days", () => {
    const notifiable: NotifiableCard = {
      type: "gift_card",
      card: { ...baseGiftCard, notify_window_days: ["tuesday"] },
    };
    const result = cardWindowCheck.check(notifiable, basePreferences, context);
    expect(result).toEqual({
      eligible: false,
      reason: "card_window_invalid",
      detail: "Invalid: outside Day of Week window",
    });
  });

  it("is eligible when now is within the card's start/end time window", () => {
    const notifiable: NotifiableCard = {
      type: "gift_card",
      card: { ...baseGiftCard, notify_window_start_time: "09:00:00", notify_window_end_time: "17:00:00" },
    };
    expect(cardWindowCheck.check(notifiable, basePreferences, context)).toEqual({ eligible: true });
  });

  it("is ineligible when now is before the card's window starts", () => {
    const notifiable: NotifiableCard = {
      type: "gift_card",
      card: { ...baseGiftCard, notify_window_start_time: "13:00:00", notify_window_end_time: "17:00:00" },
    };
    const result = cardWindowCheck.check(notifiable, basePreferences, context);
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.detail).toContain("before window");
  });

  it("is ineligible when now is after the card's window ends", () => {
    const notifiable: NotifiableCard = {
      type: "gift_card",
      card: { ...baseGiftCard, notify_window_start_time: "06:00:00", notify_window_end_time: "10:00:00" },
    };
    const result = cardWindowCheck.check(notifiable, basePreferences, context);
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.detail).toContain("after window");
  });

  it("treats a window starting at midnight correctly (does not mistake 00:00 for 'no restriction')", () => {
    const notifiable: NotifiableCard = {
      type: "gift_card",
      card: { ...baseGiftCard, notify_window_start_time: "00:00:00", notify_window_end_time: "01:00:00" },
    };
    expect(cardWindowCheck.check(notifiable, basePreferences, context).eligible).toBe(false);
  });

  it("applies the same window logic to stamp cards", () => {
    const notifiable: NotifiableCard = {
      type: "stamp_card",
      card: { ...baseStampCard, notify_window_days: ["tuesday"] },
    };
    expect(cardWindowCheck.check(notifiable, basePreferences, context).eligible).toBe(false);
  });

  it("respects the user's timezone, not the server's", () => {
    const vancouverContext: EligibilityContext = {
      now: new Date("2026-06-16T05:00:00Z"), // Tuesday UTC, Monday 22:00 Vancouver
      location_id: "location-1",
      timezone: "America/Vancouver",
    };
    const notifiable: NotifiableCard = {
      type: "gift_card",
      card: { ...baseGiftCard, notify_window_days: ["monday"] },
    };
    expect(cardWindowCheck.check(notifiable, basePreferences, vancouverContext)).toEqual({ eligible: true });
  });
});