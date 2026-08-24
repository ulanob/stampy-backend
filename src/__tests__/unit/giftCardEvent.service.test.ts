import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGiftCardEventService } from "../../services/giftCardEvent.service";
import type { GiftCardDAO, GiftCardEventDAO } from "../../dao";
import type { Pool, PoolClient } from "pg";
import { ValidationError, NotFoundError } from "../../utils/validators";

describe("giftCardEventService.createGiftCardEvent", () => {
  let mockClient: Partial<PoolClient>;
  let mockPool: Partial<Pool>;
  let giftCardDAO: GiftCardDAO;
  let giftCardEventDAO: GiftCardEventDAO;

  const baseCard = {
    id: "a1b2c3d4-0000-0000-0000-000000000008",
    user_id: "a1b2c3d4-0000-0000-0000-000000000005",
    business_id: "a1b2c3d4-0000-0000-0000-000000000001",
    nickname: null,
    current_balance: 50.00,
    currency: "CAD",
    status: "active" as const,
  };

  const baseFields = {
    user_id: baseCard.user_id,
    gift_card_id: baseCard.id,
    location_id: null,
  };

  beforeEach(() => {
    mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    mockPool = { connect: vi.fn().mockResolvedValue(mockClient) };

    giftCardEventDAO = {
      createGiftCardEvent: vi.fn().mockResolvedValue({ id: "event-1", type: "balance_added" }),
      getGiftCardEventByRequestID: vi.fn().mockResolvedValue(null),
      getGiftCardEventsByGiftCardID: vi.fn(),
      getAllGiftCardEventsByUserID: vi.fn(),
      getAllGiftCardEvents: vi.fn(),
    } as unknown as GiftCardEventDAO;

    giftCardDAO = {
      getGiftCardByID: vi.fn().mockResolvedValue(baseCard),
      updateGiftCardByID: vi.fn().mockResolvedValue(baseCard),
      createGiftCard: vi.fn(),
      getAllGiftCards: vi.fn(),
      getAllGiftCardsByUserID: vi.fn(),
      deleteGiftCardByID: vi.fn(),
    } as unknown as GiftCardDAO;
  });

  function service() {
    return createGiftCardEventService(giftCardEventDAO, giftCardDAO, mockPool as Pool);
  }

  it("returns the existing event when request_id was already processed", async () => {
    const existing = { id: "existing-event" };
    (giftCardEventDAO.getGiftCardEventByRequestID as any).mockResolvedValue(existing);

    const result = await service().createGiftCardEvent({
      ...baseFields, request_id: "req-1", type: "balance_added", amount: 10.00,
    });

    expect(result).toBe(existing);
    expect(giftCardDAO.getGiftCardByID).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the card doesn't exist", async () => {
    (giftCardDAO.getGiftCardByID as any).mockResolvedValue(null);

    await expect(service().createGiftCardEvent({
      ...baseFields, request_id: "req-2", type: "balance_added", amount: 10.00,
    })).rejects.toThrow(NotFoundError);
  });

  describe("balance_added", () => {
    it("rejects on expired/cancelled cards", async () => {
      for (const status of ["expired", "cancelled"] as const) {
        (giftCardDAO.getGiftCardByID as any).mockResolvedValue({ ...baseCard, status });

        await expect(service().createGiftCardEvent({
          ...baseFields, request_id: `req-${status}`, type: "balance_added", amount: 10.00,
        })).rejects.toThrow(ValidationError);
      }
    });

    it("succeeds and updates only status when the card can accept the amount", async () => {
      await service().createGiftCardEvent({
        ...baseFields, request_id: "req-3", type: "balance_added", amount: 15.00,
      });

      expect(giftCardDAO.updateGiftCardByID).toHaveBeenCalledWith(
        baseCard.id,
        { status: "active" },
        mockClient
      );
    });
  });

  describe("balance_redeemed", () => {
    it("rejects on expired/cancelled cards", async () => {
      for (const status of ["expired", "cancelled"] as const) {
        (giftCardDAO.getGiftCardByID as any).mockResolvedValue({ ...baseCard, status });

        await expect(service().createGiftCardEvent({
          ...baseFields, request_id: `req-rd-${status}`, type: "balance_redeemed", amount: 10.00,
        })).rejects.toThrow(ValidationError);
      }
    });

    it("succeeds and updates only status when there is enough balance", async () => {
      await service().createGiftCardEvent({
        ...baseFields, request_id: "req-4", type: "balance_redeemed", amount: 20.00,
      });

      expect(giftCardDAO.updateGiftCardByID).toHaveBeenCalledWith(
        baseCard.id,
        { status: "active" },
        mockClient
      );
    });

    it("allows redeeming the full balance down to exactly 0", async () => {
      await service().createGiftCardEvent({
        ...baseFields, request_id: "req-5", type: "balance_redeemed", amount: 50.00,
      });

      expect(giftCardDAO.updateGiftCardByID).toHaveBeenCalledWith(
        baseCard.id,
        { status: "active" },
        mockClient
      );
    });

    it("rejects redemption that would go below 0", async () => {
      await expect(service().createGiftCardEvent({
        ...baseFields, request_id: "req-6", type: "balance_redeemed", amount: 999.00,
      })).rejects.toThrow(ValidationError);
    });
  });

  it("card_expired sets status expired", async () => {
    await service().createGiftCardEvent({
      ...baseFields, request_id: "req-7", type: "card_expired", amount: 0,
    });

    expect(giftCardDAO.updateGiftCardByID).toHaveBeenCalledWith(
      baseCard.id,
      { status: "expired" },
      mockClient
    );
  });

  it("card_deleted sets status cancelled", async () => {
    await service().createGiftCardEvent({
      ...baseFields, request_id: "req-8", type: "card_deleted", amount: 0,
    });

    expect(giftCardDAO.updateGiftCardByID).toHaveBeenCalledWith(
      baseCard.id,
      { status: "cancelled" },
      mockClient
    );
  });

  describe("executor passthrough", () => {
    it("uses a passed-in executor instead of opening its own transaction", async () => {
      const externalClient: Partial<PoolClient> = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };

      await service().createGiftCardEvent(
        { ...baseFields, request_id: "req-9", type: "balance_added", amount: 5.00 },
        externalClient as PoolClient
      );

      expect(mockPool.connect).not.toHaveBeenCalled();
      expect(giftCardDAO.updateGiftCardByID).toHaveBeenCalledWith(
        baseCard.id,
        { status: "active" },
        externalClient
      );
    });
  });
});