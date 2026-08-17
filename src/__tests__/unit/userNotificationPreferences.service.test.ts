import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUserNotificationPreferencesService } from "../../services/userNotificationPreferences.service";
import type { UserNotificationPreferencesDAO } from "../../dao";
import { NotFoundError, ValidationError, InvalidUUIDError } from "../../utils/validators";

describe("userNotificationPreferencesService", () => {
  let userNotificationPreferencesDAO: UserNotificationPreferencesDAO;

  const validUserId = "a1b2c3d4-0000-0000-0000-000000000001";

  const basePreferences = {
    id: "b1b2c3d4-0000-0000-0000-000000000001",
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
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    userNotificationPreferencesDAO = {
      createUserNotificationPreferences: vi.fn().mockResolvedValue(basePreferences),
      getUserNotificationPreferencesByUserID: vi.fn().mockResolvedValue(basePreferences),
      updateUserNotificationPreferencesByUserID: vi.fn().mockResolvedValue(basePreferences),
    } as unknown as UserNotificationPreferencesDAO;
  });

  function service() {
    return createUserNotificationPreferencesService(userNotificationPreferencesDAO, {} as any);
  }

  describe("createUserNotificationPreferences", () => {
    it("creates preferences with valid fields", async () => {
      const result = await service().createUserNotificationPreferences({
        user_id: validUserId,
        notifications_enabled: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
        notify_window_days: null,
        general_notification_window_start: null,
        general_notification_window_end: null,
      });

      expect(result).toEqual(basePreferences);
      expect(userNotificationPreferencesDAO.createUserNotificationPreferences).toHaveBeenCalled();
    });

    it("throws ValidationError when user_id is missing", async () => {
      await expect(
        service().createUserNotificationPreferences({} as any)
      ).rejects.toThrow(ValidationError);
      expect(userNotificationPreferencesDAO.createUserNotificationPreferences).not.toHaveBeenCalled();
    });

    it("throws InvalidUUIDError when user_id is malformed", async () => {
      await expect(
        service().createUserNotificationPreferences({ user_id: "not-a-uuid" } as any)
      ).rejects.toThrow(InvalidUUIDError);
      expect(userNotificationPreferencesDAO.createUserNotificationPreferences).not.toHaveBeenCalled();
    });
  });

  describe("getUserNotificationPreferencesByUserID", () => {
    it("returns preferences when found", async () => {
      const result = await service().getUserNotificationPreferencesByUserID(validUserId);
      expect(result).toEqual(basePreferences);
    });

    it("throws InvalidUUIDError for a malformed user_id", async () => {
      await expect(
        service().getUserNotificationPreferencesByUserID("not-a-uuid")
      ).rejects.toThrow(InvalidUUIDError);
    });

    it("throws NotFoundError when no preferences exist for the user", async () => {
      (userNotificationPreferencesDAO.getUserNotificationPreferencesByUserID as any).mockResolvedValue(null);
      await expect(
        service().getUserNotificationPreferencesByUserID(validUserId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateUserNotificationPreferencesByUserID", () => {
    it("returns the updated preferences", async () => {
      const result = await service().updateUserNotificationPreferencesByUserID(validUserId, {
        notifications_enabled: false,
      });
      expect(result).toEqual(basePreferences);
    });

    it("throws InvalidUUIDError for a malformed user_id", async () => {
      await expect(
        service().updateUserNotificationPreferencesByUserID("not-a-uuid", { notifications_enabled: false })
      ).rejects.toThrow(InvalidUUIDError);
      expect(userNotificationPreferencesDAO.updateUserNotificationPreferencesByUserID).not.toHaveBeenCalled();
    });

    it("throws ValidationError when the update object is empty", async () => {
      await expect(
        service().updateUserNotificationPreferencesByUserID(validUserId, {})
      ).rejects.toThrow(ValidationError);
      expect(userNotificationPreferencesDAO.updateUserNotificationPreferencesByUserID).not.toHaveBeenCalled();
    });

    it("throws ValidationError when every update value is undefined", async () => {
      await expect(
        service().updateUserNotificationPreferencesByUserID(validUserId, {
          notifications_enabled: undefined,
        })
      ).rejects.toThrow(ValidationError);
      expect(userNotificationPreferencesDAO.updateUserNotificationPreferencesByUserID).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the update target doesn't exist", async () => {
      (userNotificationPreferencesDAO.updateUserNotificationPreferencesByUserID as any).mockResolvedValue(null);
      await expect(
        service().updateUserNotificationPreferencesByUserID(validUserId, { notifications_enabled: false })
      ).rejects.toThrow(NotFoundError);
    });
  });
});