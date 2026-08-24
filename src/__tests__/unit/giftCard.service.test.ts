import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGiftCardService } from "../../services/giftCard.service";
import type { GiftCardDAO, UserDAO, BusinessDAO } from "../../dao";
import type { GiftCardEventService } from "../../services/giftCardEvent.service";
import { NotFoundError, ValidationError } from "../../utils/validators";
import type { Pool, PoolClient } from "pg";

describe("giftCardService", () => {
  let giftCardDAO: GiftCardDAO;
  let userDAO: UserDAO;
  let businessDAO: BusinessDAO;
  let giftCardEventService: GiftCardEventService;
  let mockClient: Partial<PoolClient>;
  let mockPool: Partial<Pool>;

  const validUserId = "a1b2c3d4-0000-0000-0000-000000000005";
  const validBusinessId = "a1b2c3d4-0000-0000-0000-000000000001";
  const validGiftCardId = "a1b2c3d4-0000-0000-0000-000000000008";

  const daoCreatedCard = {
    id: validGiftCardId,
    user_id: validUserId,
    business_id: validBusinessId,
    nickname: null,
    notes: null,
    currency: "CAD",
    status: "active" as const,
    deleted: false,
  };

  const baseGiftCard = {
    ...daoCreatedCard,
    current_balance: 5000,
  };

  beforeEach(() => {
    mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    mockPool = { connect: vi.fn().mockResolvedValue(mockClient) };

    giftCardDAO = {
      createGiftCard: vi.fn().mockResolvedValue(daoCreatedCard),
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

    giftCardEventService = {
      createGiftCardEvent: vi.fn().mockResolvedValue({ id: "event-1", type: "balance_added" }),
      getGiftCardEventByRequestID: vi.fn(),
      getGiftCardEventsByGiftCardID: vi.fn(),
      getAllGiftCardEventsByUserID: vi.fn(),
    } as unknown as GiftCardEventService;
  });

  function service() {
    return createGiftCardService(giftCardDAO, userDAO, businessDAO, giftCardEventService, mockPool as Pool);
  }

  describe("createGiftCard", () => {
    const validPayload = {
      user_id: validUserId,
      business_id: validBusinessId,
      nickname: null,
      notes: null,
      amount: 5000,
      currency: "CAD",
      request_id: "req-create-1",
    };

        it("creates a gift card and a seed balance_added event, returning current_balance set to amount", async () => {
      const result = await service().createGiftCard(validPayload as any);

      expect(result).toEqual({ ...daoCreatedCard, current_balance: 5000 });

      expect(giftCardDAO.createGiftCard).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: validUserId, business_id: validBusinessId, status: "active" }),
        mockClient
      );
      expect(giftCardDAO.createGiftCard).toHaveBeenCalledWith(
        expect.not.objectContaining({ amount: expect.anything() }),
        mockClient
      );

      expect(giftCardEventService.createGiftCardEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          gift_card_id: validGiftCardId,
          user_id: validUserId,
          type: "balance_added",
          amount: 5000,
          location_id: null,
        }),
        mockClient
      );
    });

    it("normalizes a missing location_id to null on the seed event", async () => {
      const { location_id, ...withoutLocation } = validPayload as any;
      await service().createGiftCard(withoutLocation);

      expect(giftCardEventService.createGiftCardEvent).toHaveBeenCalledWith(
        expect.objectContaining({ location_id: null }),
        mockClient
      );
    });

    it("passes through a provided location_id on the seed event", async () => {
      const withLocation = { ...validPayload, location_id: "a1b2c3d4-0000-0000-0000-000000000099" };
      await service().createGiftCard(withLocation as any);

      expect(giftCardEventService.createGiftCardEvent).toHaveBeenCalledWith(
        expect.objectContaining({ location_id: "a1b2c3d4-0000-0000-0000-000000000099" }),
        mockClient
      );
    });

    it("throws ValidationError when a required field is missing", async () => {
      const { user_id, ...missingUser } = validPayload as any;

      await expect(service().createGiftCard(missingUser)).rejects.toThrow(ValidationError);
      expect(userDAO.getUserByID).not.toHaveBeenCalled();
    });

    it("throws ValidationError when amount is missing", async () => {
      const { amount, ...missingAmount } = validPayload as any;

      await expect(service().createGiftCard(missingAmount)).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when request_id is missing", async () => {
      const { request_id, ...missingRequestId } = validPayload as any;

      await expect(service().createGiftCard(missingRequestId)).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when currency is missing", async () => {
      const { currency, ...missingCurrency } = validPayload as any;

      await expect(service().createGiftCard(missingCurrency)).rejects.toThrow(ValidationError);
    });

    it("throws NotFoundError when the user does not exist", async () => {
      (userDAO.getUserByID as any).mockResolvedValue(null);

      await expect(service().createGiftCard(validPayload as any)).rejects.toThrow(NotFoundError);
      expect(giftCardDAO.createGiftCard).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the business does not exist", async () => {
      (businessDAO.getBusinessByID as any).mockResolvedValue(null);

      await expect(service().createGiftCard(validPayload as any)).rejects.toThrow(NotFoundError);
      expect(giftCardDAO.createGiftCard).not.toHaveBeenCalled();
    });

    it("throws for a malformed user_id", async () => {
      const malformed = { ...validPayload, user_id: "not-a-uuid" };

      await expect(service().createGiftCard(malformed as any)).rejects.toThrow();
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