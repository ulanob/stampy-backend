import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNotificationService } from "../../services/notification.service";
import type { NotificationDAO, UserDAO } from "../../dao";
import { NotFoundError, InvalidUUIDError } from "../../utils/validators";

describe("notificationService", () => {
  let notificationDAO: NotificationDAO;
  let userDAO: UserDAO;

  const validUserId = "a1b2c3d4-0000-0000-0000-000000000005";
  const validNotificationId = "a1b2c3d4-0000-0000-0000-000000000011";

  const baseNotification = {
    id: validNotificationId,
    user_id: validUserId,
    stamp_card_id: null,
    gift_card_id: null,
    location_id: null,
    type: "stamp_reminder",
    status: "pending" as const,
    sent_at: null,
    subject: "You have stamps!",
    body: "Come back and earn more stamps.",
  };

  beforeEach(() => {
    notificationDAO = {
      createNotification: vi.fn(),
      getNotificationByID: vi.fn().mockResolvedValue(baseNotification),
      getAllNotificationsByUserID: vi.fn().mockResolvedValue([baseNotification]),
      updateNotificationByID: vi.fn().mockResolvedValue({ ...baseNotification, status: "read" }),
    } as unknown as NotificationDAO;

    userDAO = {
      getUserByID: vi.fn().mockResolvedValue({ id: validUserId }),
    } as unknown as UserDAO;
  });

  function service() {
    return createNotificationService(notificationDAO, userDAO);
  }

  describe("getNotificationByID", () => {
    it("returns the notification when found", async () => {
      const result = await service().getNotificationByID(validNotificationId);
      expect(result).toEqual(baseNotification);
    });

    it("throws InvalidUUIDError for a malformed id", async () => {
      await expect(service().getNotificationByID("not-a-uuid")).rejects.toThrow(InvalidUUIDError);
      expect(notificationDAO.getNotificationByID).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the notification doesn't exist", async () => {
      (notificationDAO.getNotificationByID as any).mockResolvedValue(null);
      await expect(service().getNotificationByID(validNotificationId)).rejects.toThrow(NotFoundError);
    });
  });

  describe("getAllNotificationsByUserID", () => {
    it("returns notifications when the user exists", async () => {
      const result = await service().getAllNotificationsByUserID(validUserId);
      expect(result).toEqual([baseNotification]);
    });

    it("returns an empty array for an existing user with no notifications", async () => {
      (notificationDAO.getAllNotificationsByUserID as any).mockResolvedValue([]);
      const result = await service().getAllNotificationsByUserID(validUserId);
      expect(result).toEqual([]);
    });

    it("throws InvalidUUIDError for a malformed user_id", async () => {
      await expect(service().getAllNotificationsByUserID("not-a-uuid")).rejects.toThrow(InvalidUUIDError);
      expect(userDAO.getUserByID).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the user doesn't exist, without querying notifications", async () => {
      (userDAO.getUserByID as any).mockResolvedValue(null);
      await expect(service().getAllNotificationsByUserID(validUserId)).rejects.toThrow(NotFoundError);
      expect(notificationDAO.getAllNotificationsByUserID).not.toHaveBeenCalled();
    });
  });

  describe("markNotificationAsRead", () => {
    it("sets status to read and returns the updated notification", async () => {
      const result = await service().markNotificationAsRead(validNotificationId);

      expect(result.status).toBe("read");
      // the status is hardcoded in the service, never taken from the caller
      expect(notificationDAO.updateNotificationByID).toHaveBeenCalledWith(
        validNotificationId,
        { status: "read" }
      );
    });

    it("throws InvalidUUIDError for a malformed id", async () => {
      await expect(service().markNotificationAsRead("not-a-uuid")).rejects.toThrow(InvalidUUIDError);
      expect(notificationDAO.updateNotificationByID).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the notification doesn't exist", async () => {
      (notificationDAO.updateNotificationByID as any).mockResolvedValue(null);
      await expect(service().markNotificationAsRead(validNotificationId)).rejects.toThrow(NotFoundError);
    });
  });
});