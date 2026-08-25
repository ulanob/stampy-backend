import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStampCardService } from "../../services/stampCard.service";
import type { StampCardDAO, UserDAO, BusinessDAO } from "../../dao";
import { NotFoundError, ValidationError } from "../../utils/validators";
import type { Pool } from "pg";

describe("stampCardService", () => {
  let stampCardDAO: StampCardDAO;
  let userDAO: UserDAO;
  let businessDAO: BusinessDAO;
  let mockPool: Partial<Pool>;

  const validUserId = "a1b2c3d4-0000-0000-0000-000000000005";
  const validBusinessId = "a1b2c3d4-0000-0000-0000-000000000001";
  const validCardId = "a1b2c3d4-0000-0000-0000-000000000006";

  const baseCard = {
    id: validCardId,
    user_id: validUserId,
    business_id: validBusinessId,
    nickname: null,
    notes: null,
    stamps_needed: 10,
    stamps_acquired: 0,
    status: "active" as const,
    deleted: false,
  };

  beforeEach(() => {
    mockPool = {};

    stampCardDAO = {
      createStampCard: vi.fn().mockResolvedValue(baseCard),
      getAllStampCards: vi.fn(),
      getStampCardByID: vi.fn().mockResolvedValue(baseCard),
      getAllStampCardsByUserID: vi.fn().mockResolvedValue([baseCard]),
      updateStampCardByID: vi.fn().mockResolvedValue(baseCard),
      deleteStampCardByID: vi.fn().mockResolvedValue(undefined),
    } as unknown as StampCardDAO;

    userDAO = {
      getUserByID: vi.fn().mockResolvedValue({ id: validUserId }),
    } as unknown as UserDAO;

    businessDAO = {
      getBusinessByID: vi.fn().mockResolvedValue({ id: validBusinessId }),
    } as unknown as BusinessDAO;
  });

  describe("createStampCard", () => {
    it("creates a card when the user and business both exist", async () => {
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);

      const result = await service.createStampCard({
        user_id: validUserId,
        business_id: validBusinessId,
        nickname: null,
        notes: null,
        stamps_needed: 10,
      } as any);

      expect(result).toEqual(baseCard);
      expect(stampCardDAO.createStampCard).toHaveBeenCalled();
    });

    it("throws NotFoundError when the user does not exist", async () => {
      (userDAO.getUserByID as any).mockResolvedValue(null);
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);

      await expect(service.createStampCard({
        user_id: validUserId,
        business_id: validBusinessId,
        nickname: null,
        notes: null,
        stamps_needed: 10,
      } as any)).rejects.toThrow(NotFoundError);

      expect(stampCardDAO.createStampCard).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the business does not exist", async () => {
      (businessDAO.getBusinessByID as any).mockResolvedValue(null);
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);

      await expect(service.createStampCard({
        user_id: validUserId,
        business_id: validBusinessId,
        nickname: null,
        notes: null,
        stamps_needed: 10,
      } as any)).rejects.toThrow(NotFoundError);

      expect(stampCardDAO.createStampCard).not.toHaveBeenCalled();
    });

    it("throws InvalidUUIDError for a malformed user_id", async () => {
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);

      await expect(service.createStampCard({
        user_id: "not-a-uuid",
        business_id: validBusinessId,
        nickname: null,
        notes: null,
        stamps_needed: 10,
      } as any)).rejects.toThrow();

      expect(userDAO.getUserByID).not.toHaveBeenCalled();
    });

    it("throws ValidationError when user_id is missing", async () => {
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);

      await expect(service.createStampCard({
        business_id: baseCard.business_id,
        stamps_needed: 10,
      } as any)).rejects.toThrow(ValidationError);

      expect(userDAO.getUserByID).not.toHaveBeenCalled();
    });

    it("throws ValidationError when business_id is missing", async () => {
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);

      await expect(service.createStampCard({
        user_id: baseCard.user_id,
        stamps_needed: 10,
      } as any)).rejects.toThrow(ValidationError);

      expect(businessDAO.getBusinessByID).not.toHaveBeenCalled();
    });

    it("throws ValidationError when stamps_needed is missing", async () => {
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);

      await expect(service.createStampCard({
        user_id: baseCard.user_id,
        business_id: baseCard.business_id,
      } as any)).rejects.toThrow(ValidationError);
    });
  });

  describe("getAllStampCardsByUserId", () => {
    it("returns cards when the user exists", async () => {
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);
      const result = await service.getAllStampCardsByUserId(validUserId);
      expect(result).toEqual([baseCard]);
    });

    it("throws NotFoundError when the user does not exist", async () => {
      (userDAO.getUserByID as any).mockResolvedValue(null);
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);

      await expect(service.getAllStampCardsByUserId(validUserId)).rejects.toThrow(NotFoundError);
    });
  });

  describe("getStampCardByID", () => {
    it("returns the card when found", async () => {
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);
      const result = await service.getStampCardByID(validCardId);
      expect(result).toEqual(baseCard);
    });

    it("throws NotFoundError when the card doesn't exist", async () => {
      (stampCardDAO.getStampCardByID as any).mockResolvedValue(null);
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);

      await expect(service.getStampCardByID(validCardId)).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateStampCardByID", () => {
    it("returns the updated card", async () => {
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);
      const result = await service.updateStampCardByID(validCardId, { nickname: "New name" } as any);
      expect(result).toEqual(baseCard);
    });

    it("throws NotFoundError when the update target doesn't exist", async () => {
      (stampCardDAO.updateStampCardByID as any).mockResolvedValue(null);
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);

      await expect(
        service.updateStampCardByID(validCardId, { nickname: "New name" } as any)
      ).rejects.toThrow(NotFoundError);
    });
    it("strips stamps_needed and status from the update even if provided — safeUpdates only forwards a fixed allowlist", async () => {
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);
      await service.updateStampCardByID(validCardId, {
        nickname: "New name",
        stamps_needed: 999,
        status: "cancelled",
      } as any);

      const passedUpdates = (stampCardDAO.updateStampCardByID as any).mock.calls[0][1];
      expect(passedUpdates).not.toHaveProperty("stamps_needed");
      expect(passedUpdates).not.toHaveProperty("status");
    });
  });

  describe("deleteStampCardByID", () => {
    it("deletes an active card", async () => {
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);
      await service.deleteStampCardByID(validCardId);
      expect(stampCardDAO.deleteStampCardByID).toHaveBeenCalledWith(validCardId);
    });

    it("throws NotFoundError when the card doesn't exist", async () => {
      (stampCardDAO.getStampCardByID as any).mockResolvedValue(null);
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);

      await expect(service.deleteStampCardByID(validCardId)).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError when the card is already deleted", async () => {
      (stampCardDAO.getStampCardByID as any).mockResolvedValue({ ...baseCard, deleted: true });
      const service = createStampCardService(stampCardDAO, userDAO, businessDAO, mockPool as Pool);

      await expect(service.deleteStampCardByID(validCardId)).rejects.toThrow(ValidationError);
    });
  });
});