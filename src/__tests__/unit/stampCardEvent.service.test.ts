import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStampCardEventService } from "../../services/stampCardEvent.service";
import type { StampCardDAO, StampCardEventDAO } from "../../dao";
import type { Pool, PoolClient } from "pg";
import { ValidationError, NotFoundError } from "../../utils/validators";

describe("stampCardEventService.createStampCardEvent", () => {
  let mockClient: Partial<PoolClient>;
  let mockPool: Partial<Pool>;
  let stampCardDAO: StampCardDAO;
  let stampCardEventDAO: StampCardEventDAO;

  const baseCard = {
    id: "a1b2c3d4-0000-0000-0000-000000000006",
    user_id: "a1b2c3d4-0000-0000-0000-000000000005",
    business_id: "a1b2c3d4-0000-0000-0000-000000000001",
    nickname: null,
    stamps_needed: 10,
    stamps_acquired: 5,
    status: "active" as const,
  };

  const baseFields = {
    user_id: baseCard.user_id,
    stamp_card_id: baseCard.id,
    location_id: null,
  };

  beforeEach(() => {
    mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    mockPool = { connect: vi.fn().mockResolvedValue(mockClient) };

    stampCardEventDAO = {
      createStampCardEvent: vi.fn().mockResolvedValue({ id: "event-1", type: "stamp_added" }),
      getStampCardEventByRequestID: vi.fn().mockResolvedValue(null),
      getStampCardEventsByStampCardID: vi.fn(),
      getAllStampCardEventsByUserID: vi.fn(),
      getAllStampCardEvents: vi.fn(),
    } as unknown as StampCardEventDAO;

    stampCardDAO = {
      getStampCardByID: vi.fn().mockResolvedValue(baseCard),
      updateStampCardByID: vi.fn().mockResolvedValue(baseCard),
      createStampCard: vi.fn(),
      getAllStampCards: vi.fn(),
      getAllStampCardsByUserID: vi.fn(),
      deleteStampCardByID: vi.fn(),
    } as unknown as StampCardDAO;
  });

  function service() {
    return createStampCardEventService(stampCardEventDAO, stampCardDAO, mockPool as Pool);
  }

  it("returns the existing event when request_id was already processed", async () => {
    const existing = { id: "existing-event" };
    (stampCardEventDAO.getStampCardEventByRequestID as any).mockResolvedValue(existing);

    const result = await service().createStampCardEvent({
      ...baseFields, request_id: "req-1", type: "stamp_added", quantity: 1,
    });

    expect(result).toBe(existing);
    expect(stampCardDAO.getStampCardByID).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the card doesn't exist", async () => {
    (stampCardDAO.getStampCardByID as any).mockResolvedValue(null);

    await expect(service().createStampCardEvent({
      ...baseFields, request_id: "req-2", type: "stamp_added", quantity: 1,
    })).rejects.toThrow(NotFoundError);
  });

  describe("stamp_added", () => {
    it("rejects on completed/redeemed/expired/cancelled cards", async () => {
      for (const status of ["completed", "redeemed", "expired", "cancelled"] as const) {
        (stampCardDAO.getStampCardByID as any).mockResolvedValue({ ...baseCard, status });
        await expect(service().createStampCardEvent({
          ...baseFields, request_id: `req-${status}`, type: "stamp_added", quantity: 1,
        })).rejects.toThrow(ValidationError);
      }
    });

    it("marks the card completed when it reaches stamps_needed exactly", async () => {
      (stampCardDAO.getStampCardByID as any).mockResolvedValue({ ...baseCard, stamps_acquired: 9 });

      await service().createStampCardEvent({
        ...baseFields, request_id: "req-3", type: "stamp_added", quantity: 1,
      });

      expect(stampCardDAO.updateStampCardByID).toHaveBeenCalledWith(
        baseCard.id,
        expect.objectContaining({ stamps_acquired: 10, status: "completed" }),
        mockClient
      );
    });

    it("creates an overflow card and event when quantity exceeds capacity", async () => {
      (stampCardDAO.getStampCardByID as any).mockResolvedValue({ ...baseCard, stamps_acquired: 9 });
      (stampCardDAO.createStampCard as any).mockResolvedValue({ id: "overflow-card" });

      await service().createStampCardEvent({
        ...baseFields, request_id: "req-4", type: "stamp_added", quantity: 4,
      });

      expect(stampCardDAO.createStampCard).toHaveBeenCalledWith(
        expect.objectContaining({ stamps_acquired: 3, status: "active" }),
        mockClient
      );
      expect(stampCardEventDAO.createStampCardEvent).toHaveBeenCalledTimes(2);
    });

    it("does not create an overflow card when quantity exactly fills the card", async () => {
      (stampCardDAO.getStampCardByID as any).mockResolvedValue({ ...baseCard, stamps_acquired: 9 });

      await service().createStampCardEvent({
        ...baseFields, request_id: "req-5", type: "stamp_added", quantity: 1,
      });

      expect(stampCardDAO.createStampCard).not.toHaveBeenCalled();
      expect(stampCardEventDAO.createStampCardEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe("stamp_removed", () => {
    it("rejects on redeemed/expired/cancelled cards", async () => {
      for (const status of ["redeemed", "expired", "cancelled"] as const) {
        (stampCardDAO.getStampCardByID as any).mockResolvedValue({ ...baseCard, status });
        await expect(service().createStampCardEvent({
          ...baseFields, request_id: `req-rm-${status}`, type: "stamp_removed", quantity: 1,
        })).rejects.toThrow(ValidationError);
      }
    });

    it("allows removal on a completed card (correction)", async () => {
      (stampCardDAO.getStampCardByID as any).mockResolvedValue({ ...baseCard, status: "completed", stamps_acquired: 10 });

      await service().createStampCardEvent({
        ...baseFields, request_id: "req-6", type: "stamp_removed", quantity: 2,
      });

      expect(stampCardDAO.updateStampCardByID).toHaveBeenCalledWith(
        baseCard.id,
        expect.objectContaining({ stamps_acquired: 8, status: "active" }),
        mockClient
      );
    });

    it("rejects removal that would go below 0", async () => {
      (stampCardDAO.getStampCardByID as any).mockResolvedValue({ ...baseCard, stamps_acquired: 2 });

      await expect(service().createStampCardEvent({
        ...baseFields, request_id: "req-7", type: "stamp_removed", quantity: 5,
      })).rejects.toThrow(ValidationError);
    });
  });

  it("reward_redeemed resets stamps_acquired to 0 and sets status redeemed", async () => {
    await service().createStampCardEvent({
      ...baseFields, request_id: "req-8", type: "reward_redeemed", quantity: 0,
    });

    expect(stampCardDAO.updateStampCardByID).toHaveBeenCalledWith(
      baseCard.id,
      expect.objectContaining({ stamps_acquired: 0, status: "redeemed" }),
      mockClient
    );
  });

  it("card_expired sets status expired without changing stamps_acquired", async () => {
    await service().createStampCardEvent({
      ...baseFields, request_id: "req-9", type: "card_expired", quantity: 0,
    });

    expect(stampCardDAO.updateStampCardByID).toHaveBeenCalledWith(
      baseCard.id,
      expect.objectContaining({ stamps_acquired: baseCard.stamps_acquired, status: "expired" }),
      mockClient
    );
  });

  it("card_deleted sets status cancelled", async () => {
    await service().createStampCardEvent({
      ...baseFields, request_id: "req-10", type: "card_deleted", quantity: 0,
    });

    expect(stampCardDAO.updateStampCardByID).toHaveBeenCalledWith(
      baseCard.id,
      expect.objectContaining({ status: "cancelled" }),
      mockClient
    );
  });
});