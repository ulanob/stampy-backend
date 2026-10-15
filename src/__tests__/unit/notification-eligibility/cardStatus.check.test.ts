import { describe, it, expect } from "vitest";
import { cardStatusCheck } from "../../../../src/services/notification-eligibility/checks/cardStatus.check";
import type { NotifiableCard, EligibilityContext } from "../../../../src/services/notification-eligibility/types";
import type { UserNotificationPreferences } from "../../../../src/models/user-notification-preferences.model";
import type { GiftCard, GiftCardStatus } from "../../../../src/models/gift-card.model";
import type { StampCard, StampCardStatus } from "../../../../src/models/stamp-card.model";

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

const context: EligibilityContext = {
  now: new Date("2026-06-15T12:00:00Z"),
  location_id: "location-1",
  timezone: "UTC",
};

describe("cardStatusCheck", () => {
  describe("gift cards", () => {
    it("is eligible when status is active", () => {
      const notifiable: NotifiableCard = { type: "gift_card", card: { ...baseGiftCard, status: "active" } };
      expect(cardStatusCheck.check(notifiable, basePreferences, context)).toEqual({ eligible: true });
    });

    it.each<GiftCardStatus>(["cancelled", "expired"])("is ineligible when status is %s", (status) => {
      const notifiable: NotifiableCard = { type: "gift_card", card: { ...baseGiftCard, status } };
      const result = cardStatusCheck.check(notifiable, basePreferences, context);
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe("invalid_status");
        expect(result.detail).toContain(status);
      }
    });
  });

  describe("stamp cards", () => {
    it.each<StampCardStatus>(["active", "completed"])("is eligible when status is %s", (status) => {
      const notifiable: NotifiableCard = { type: "stamp_card", card: { ...baseStampCard, status } };
      expect(cardStatusCheck.check(notifiable, basePreferences, context)).toEqual({ eligible: true });
    });

    it.each<StampCardStatus>(["redeemed", "expired", "cancelled"])("is ineligible when status is %s", (status) => {
      const notifiable: NotifiableCard = { type: "stamp_card", card: { ...baseStampCard, status } };
      const result = cardStatusCheck.check(notifiable, basePreferences, context);
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe("invalid_status");
        expect(result.detail).toContain(status);
      }
    });
  });
});