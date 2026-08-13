import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGiftCardService } from "../../services/giftCard.service";
import type { GiftCardDAO, UserDAO, BusinessDAO } from "../../dao";
import { NotFoundError, ValidationError } from "../../utils/validators";
import type { Pool } from "pg";

describe("giftCardService", () => {
  let giftCardDAO: GiftCardDAO;
  let userDAO: UserDAO;
  let businessDAO: BusinessDAO;
  let mockPool: Partial<Pool>;

  const validUserId = "a1b2c3d4-0000-0000-0000-000000000005";
  const validBusinessId = "a1b2c3d4-0000-0000-0000-000000000001";
  const validGiftCardId = "a1b2c3d4-0000-0000-0000-000000000008";

  const baseGiftCard = {
    id: validGiftCardId,
    user_id: validUserId,
    business_id: validBusinessId,
    nickname: null,
    notes: null,
    initial_balance: 5000,
    current_balance: 5000,
    currency: "CAD",
    deleted: false,
  };

  beforeEach(() => {
    mockPool = {};

    giftCardDAO = {
      createGiftCard: vi.fn().mockResolvedValue(baseGiftCard),
      getAllGiftCards: vi.fn(),
      getGiftCardByID: vi.fn().mockResolvedValue(baseGiftCard),
      getAllGiftCardsByUserID: vi.fn().mockResolvedValue([baseGiftCard]),
      updateGiftCardByID: vi.fn().mockResolvedValue(baseGiftCard),
      deleteGiftCardByID: vi.fn().mockResolvedValue(undefined),
    } as unknown as GiftCardDAO;

    userDAO = {
      getUserByID: vi.fn().mockResolvedValue({ id: validUserId }),
    } as unknown as UserDAO;

    businessDAO = {
      getBusinessByID: vi.fn().mockResolvedValue({ id: validBusinessId }),
    } as unknown as BusinessDAO;
  });

  function service() {
    return createGiftCardService(giftCardDAO, userDAO, businessDAO, mockPool as Pool);
  }

  describe("createGiftCard", () => {
    it("creates a gift card with current_balance set to initial_balance", async () => {
      const result = await service().createGiftCard({
        user_id: validUserId,
        business_id: validBusinessId,
        nickname: null,
        notes: null,
        initial_balance: 5000,
        currency: "CAD",
      } as any);

      expect(result).toEqual(baseGiftCard);
      expect(giftCardDAO.createGiftCard).toHaveBeenCalledWith(
        expect.objectContaining({ initial_balance: 5000, current_balance: 5000 }),
        mockPool
      );
    });

    it("throws ValidationError when a required field is missing", async () => {
      await expect(service().createGiftCard({
        business_id: validBusinessId,
        initial_balance: 5000,
        currency: "CAD",
      } as any)).rejects.toThrow(ValidationError);

      expect(userDAO.getUserByID).not.toHaveBeenCalled();
    });

    it("throws ValidationError when currency is missing", async () => {
      await expect(service().createGiftCard({
        user_id: validUserId,
        business_id: validBusinessId,
        initial_balance: 5000,
      } as any)).rejects.toThrow(ValidationError);
    });

    it("throws NotFoundError when the user does not exist", async () => {
      (userDAO.getUserByID as any).mockResolvedValue(null);

      await expect(service().createGiftCard({
        user_id: validUserId,
        business_id: validBusinessId,
        initial_balance: 5000,
        currency: "CAD",
      } as any)).rejects.toThrow(NotFoundError);

      expect(giftCardDAO.createGiftCard).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the business does not exist", async () => {
      (businessDAO.getBusinessByID as any).mockResolvedValue(null);

      await expect(service().createGiftCard({
        user_id: validUserId,
        business_id: validBusinessId,
        initial_balance: 5000,
        currency: "CAD",
      } as any)).rejects.toThrow(NotFoundError);

      expect(giftCardDAO.createGiftCard).not.toHaveBeenCalled();
    });

    it("throws for a malformed user_id", async () => {
      await expect(service().createGiftCard({
        user_id: "not-a-uuid",
        business_id: validBusinessId,
        initial_balance: 5000,
        currency: "CAD",
      } as any)).rejects.toThrow();

      expect(userDAO.getUserByID).not.toHaveBeenCalled();
    });
  });

  describe("getAllGiftCardsByUserId", () => {
    it("returns gift cards when the user exists", async () => {
      const result = await service().getAllGiftCardsByUserId(validUserId);
      expect(result).toEqual([baseGiftCard]);
    });

    it("throws NotFoundError when the user does not exist", async () => {
      (userDAO.getUserByID as any).mockResolvedValue(null);
      await expect(service().getAllGiftCardsByUserId(validUserId)).rejects.toThrow(NotFoundError);
    });
  });

  describe("getGiftCardByID", () => {
    it("returns the gift card when found", async () => {
      const result = await service().getGiftCardByID(validGiftCardId);
      expect(result).toEqual(baseGiftCard);
    });

    it("throws NotFoundError when the gift card doesn't exist", async () => {
      (giftCardDAO.getGiftCardByID as any).mockResolvedValue(null);
      await expect(service().getGiftCardByID(validGiftCardId)).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateGiftCardByID", () => {
    it("returns the updated gift card", async () => {
      const result = await service().updateGiftCardByID(validGiftCardId, { nickname: "New name" });
      expect(result).toEqual(baseGiftCard);
    });

    it("throws NotFoundError when the update target doesn't exist", async () => {
      (giftCardDAO.updateGiftCardByID as any).mockResolvedValue(null);
      await expect(
        service().updateGiftCardByID(validGiftCardId, { nickname: "New name" })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteGiftCardByID", () => {
    it("deletes an active gift card", async () => {
      await service().deleteGiftCardByID(validGiftCardId);
      expect(giftCardDAO.deleteGiftCardByID).toHaveBeenCalledWith(validGiftCardId);
    });

    it("throws NotFoundError when the gift card doesn't exist", async () => {
      (giftCardDAO.getGiftCardByID as any).mockResolvedValue(null);
      await expect(service().deleteGiftCardByID(validGiftCardId)).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError when the gift card is already deleted", async () => {
      (giftCardDAO.getGiftCardByID as any).mockResolvedValue({ ...baseGiftCard, deleted: true });
      await expect(service().deleteGiftCardByID(validGiftCardId)).rejects.toThrow(ValidationError);
    });
  });
});