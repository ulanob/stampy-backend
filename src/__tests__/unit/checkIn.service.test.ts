import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCheckInService } from "../../services/checkIn.service";
import type { LocationDAO, UserDAO } from "../../dao";
import { NotFoundError, ValidationError, InvalidUUIDError } from "../../utils/validators";

describe("checkInService.checkIn", () => {
  let locationDAO: LocationDAO;
  let userDAO: UserDAO;

  const validLocationId = "b1b2c3d4-0000-0000-0000-000000000001";
  const validUserId = "a1b2c3d4-0000-0000-0000-000000000005";

  beforeEach(() => {
    locationDAO = {
      getLocationByID: vi.fn().mockResolvedValue({ id: validLocationId }),
    } as unknown as LocationDAO;

    userDAO = {
      getUserByID: vi.fn().mockResolvedValue({ id: validUserId }),
    } as unknown as UserDAO;
  });

  function service() {
    return createCheckInService(locationDAO, userDAO);
  }

  it("returns null when the user and location both exist", async () => {
    const result = await service().checkIn(validLocationId, validUserId);

    expect(result).toBeNull();
    expect(userDAO.getUserByID).toHaveBeenCalledWith(validUserId);
    expect(locationDAO.getLocationByID).toHaveBeenCalledWith(validLocationId);
  });

  it("throws InvalidUUIDError for a malformed location_id", async () => {
    await expect(
      service().checkIn("not-a-uuid", validUserId)
    ).rejects.toThrow(InvalidUUIDError);

    expect(userDAO.getUserByID).not.toHaveBeenCalled();
    expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
  });

  // Assumes requireFields({ location_id, user_id }, [...]) runs first.
  // Without requireFields this throws InvalidUUIDError instead.
  it("throws ValidationError when user_id is missing", async () => {
    await expect(
      service().checkIn(validLocationId, undefined as any)
    ).rejects.toThrow(ValidationError);

    expect(userDAO.getUserByID).not.toHaveBeenCalled();
    expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
  });

  it("throws InvalidUUIDError for a malformed user_id", async () => {
    await expect(
      service().checkIn(validLocationId, "not-a-uuid")
    ).rejects.toThrow(InvalidUUIDError);

    expect(userDAO.getUserByID).not.toHaveBeenCalled();
    expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the user doesn't exist", async () => {
    (userDAO.getUserByID as any).mockResolvedValue(null);

    await expect(
      service().checkIn(validLocationId, validUserId)
    ).rejects.toThrow(NotFoundError);

    expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the location doesn't exist", async () => {
    (locationDAO.getLocationByID as any).mockResolvedValue(null);

    await expect(
      service().checkIn(validLocationId, validUserId)
    ).rejects.toThrow(NotFoundError);
  });
});