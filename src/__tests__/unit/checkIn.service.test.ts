import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckInService } from '../../services/checkIn.service';
import type { LocationDAO, UserDAO, StampCardDAO, GiftCardDAO } from '../../dao';
import { NotFoundError, ValidationError, InvalidUUIDError } from '../../utils/validators';

describe('checkInService.checkIn', () => {
  let locationDAO: LocationDAO;
  let userDAO: UserDAO;
  let stampCardDAO: StampCardDAO;
  let giftCardDAO: GiftCardDAO;

  const validLocationId = 'b1b2c3d4-0000-0000-0000-000000000001';
  const validUserId = 'a1b2c3d4-0000-0000-0000-000000000005';
  const businessId = 'a1b2c3d4-0000-0000-0000-000000000001';
  const otherBusinessId = 'a1b2c3d4-0000-0000-0000-000000000002';

  const baseLocation = { id: validLocationId, business_id: businessId };

  const relevantStampCard = {
    id: 'stamp-1',
    business_id: businessId,
    status: 'active' as const,
    stamps_acquired: 3,
  };

  const relevantGiftCard = {
    id: 'gift-1',
    business_id: businessId,
    status: 'active' as const,
    current_balance: 25,
  };

  beforeEach(() => {
    locationDAO = {
      getLocationByID: vi.fn().mockResolvedValue(baseLocation),
    } as unknown as LocationDAO;

    userDAO = {
      getUserByID: vi.fn().mockResolvedValue({ id: validUserId }),
    } as unknown as UserDAO;

    stampCardDAO = {
      getAllStampCardsByUserID: vi.fn().mockResolvedValue([]),
    } as unknown as StampCardDAO;

    giftCardDAO = {
      getAllGiftCardsByUserID: vi.fn().mockResolvedValue([]),
    } as unknown as GiftCardDAO;
  });

  function service() {
    return createCheckInService(locationDAO, userDAO, stampCardDAO, giftCardDAO);
  }

  function expectCardsNotLoaded() {
    expect(stampCardDAO.getAllStampCardsByUserID).not.toHaveBeenCalled();
    expect(giftCardDAO.getAllGiftCardsByUserID).not.toHaveBeenCalled();
  }

  describe('validation', () => {
    it('throws InvalidUUIDError for a malformed location_id', async () => {
      await expect(service().checkIn('not-a-uuid', validUserId)).rejects.toThrow(InvalidUUIDError);

      expect(userDAO.getUserByID).not.toHaveBeenCalled();
      expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
      expectCardsNotLoaded();
    });

    // Assumes requireFields({ location_id, user_id }, [...]) runs first.
    // Without requireFields this throws InvalidUUIDError instead.
    it('throws ValidationError when user_id is missing', async () => {
      await expect(service().checkIn(validLocationId, undefined as any)).rejects.toThrow(
        ValidationError,
      );

      expect(userDAO.getUserByID).not.toHaveBeenCalled();
      expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
      expectCardsNotLoaded();
    });

    it('throws InvalidUUIDError for a malformed user_id', async () => {
      await expect(service().checkIn(validLocationId, 'not-a-uuid')).rejects.toThrow(
        InvalidUUIDError,
      );

      expect(userDAO.getUserByID).not.toHaveBeenCalled();
      expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
      expectCardsNotLoaded();
    });
  });

  describe('existence checks', () => {
    it("throws NotFoundError when the user doesn't exist", async () => {
      (userDAO.getUserByID as any).mockResolvedValue(null);

      await expect(service().checkIn(validLocationId, validUserId)).rejects.toThrow(NotFoundError);

      expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
      expectCardsNotLoaded();
    });

    it("throws NotFoundError when the location doesn't exist", async () => {
      (locationDAO.getLocationByID as any).mockResolvedValue(null);

      await expect(service().checkIn(validLocationId, validUserId)).rejects.toThrow(NotFoundError);

      expectCardsNotLoaded();
    });
  });

  describe('card relevance', () => {
    it('returns null when the user and location exist but the user has no cards', async () => {
      const result = await service().checkIn(validLocationId, validUserId);

      expect(result).toBeNull();
      expect(userDAO.getUserByID).toHaveBeenCalledWith(validUserId);
      expect(locationDAO.getLocationByID).toHaveBeenCalledWith(validLocationId);
    });

    it('returns null when the user only has cards for other businesses', async () => {
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([
        { ...relevantStampCard, business_id: otherBusinessId },
      ]);
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([
        { ...relevantGiftCard, business_id: otherBusinessId },
      ]);

      expect(await service().checkIn(validLocationId, validUserId)).toBeNull();
    });

    it('returns null when matching cards exist but none are worth notifying', async () => {
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([
        { ...relevantStampCard, stamps_acquired: 0 },
      ]);
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([
        { ...relevantGiftCard, current_balance: 0 },
      ]);

      expect(await service().checkIn(validLocationId, validUserId)).toBeNull();
    });

    it("returns the relevant cards tagged by type for the location's business", async () => {
      (stampCardDAO.getAllStampCardsByUserID as any).mockResolvedValue([
        relevantStampCard,
        { ...relevantStampCard, id: 'stamp-other', business_id: otherBusinessId },
      ]);
      (giftCardDAO.getAllGiftCardsByUserID as any).mockResolvedValue([relevantGiftCard]);

      const result = await service().checkIn(validLocationId, validUserId);

      expect(result).toEqual([
        { type: 'stamp_card', card: relevantStampCard },
        { type: 'gift_card', card: relevantGiftCard },
      ]);
    });

    it('loads both card lists for the checking-in user', async () => {
      await service().checkIn(validLocationId, validUserId);

      expect(stampCardDAO.getAllStampCardsByUserID).toHaveBeenCalledWith(validUserId);
      expect(giftCardDAO.getAllGiftCardsByUserID).toHaveBeenCalledWith(validUserId);
    });

    it('propagates a failure from either card DAO', async () => {
      (giftCardDAO.getAllGiftCardsByUserID as any).mockRejectedValue(new Error('db down'));

      await expect(service().checkIn(validLocationId, validUserId)).rejects.toThrow('db down');
    });
  });
});
