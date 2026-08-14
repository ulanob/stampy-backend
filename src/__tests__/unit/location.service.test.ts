import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLocationService } from "../../services/location.service";
import type { LocationDAO, BusinessDAO } from "../../dao";
import { NotFoundError, ValidationError } from "../../utils/validators";

describe("locationService", () => {
  let locationDAO: LocationDAO;
  let businessDAO: BusinessDAO;

  const validLocationId = "b1b2c3d4-0000-0000-0000-000000000001";
  const validBusinessId = "a1b2c3d4-0000-0000-0000-000000000001";

  const baseLocation = {
    id: validLocationId,
    business_id: validBusinessId,
    address: "123 Main St",
    lat: 49.2827,
    lng: -123.1207,
    geofence_radius: 100,
    deleted: false,
  };

  const baseBusiness = {
    id: validBusinessId,
    name: "Test Business 1",
    type: "cafe" as const,
    deleted: false,
  };

  beforeEach(() => {
    locationDAO = {
      createLocation: vi.fn().mockResolvedValue(baseLocation),
      getAllLocations: vi.fn().mockResolvedValue([baseLocation]),
      getLocationByID: vi.fn().mockResolvedValue(baseLocation),
      getLocationsByBusinessID: vi.fn().mockResolvedValue([baseLocation]),
      updateLocationByID: vi.fn().mockResolvedValue(baseLocation),
      deleteLocationByID: vi.fn().mockResolvedValue(undefined),
    } as unknown as LocationDAO;

    businessDAO = {
      getBusinessByID: vi.fn().mockResolvedValue(baseBusiness),
    } as unknown as BusinessDAO;
  });

  function service() {
    return createLocationService(locationDAO, businessDAO);
  }

  describe("createLocation", () => {
    const validFields = {
      business_id: validBusinessId,
      address: "123 Main St",
      lat: 49.2827,
      lng: -123.1207,
      geofence_radius: 100,
    };

    it("creates a location with valid fields", async () => {
      const result = await service().createLocation(validFields);
      expect(result).toEqual(baseLocation);
      expect(businessDAO.getBusinessByID).toHaveBeenCalledWith(validBusinessId);
      expect(locationDAO.createLocation).toHaveBeenCalled();
    });

    it("throws ValidationError when address is missing", async () => {
      const { address, ...rest } = validFields;
      await expect(service().createLocation(rest as any)).rejects.toThrow(ValidationError);
      expect(locationDAO.createLocation).not.toHaveBeenCalled();
    });

    it("throws ValidationError when business_id is missing", async () => {
      const { business_id, ...rest } = validFields;
      await expect(service().createLocation(rest as any)).rejects.toThrow(ValidationError);
      expect(locationDAO.createLocation).not.toHaveBeenCalled();
    });

    it("throws ValidationError when business_id is not a valid UUID", async () => {
      await expect(
        service().createLocation({ ...validFields, business_id: "not-a-uuid" })
      ).rejects.toThrow(ValidationError);
      expect(businessDAO.getBusinessByID).not.toHaveBeenCalled();
      expect(locationDAO.createLocation).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the business doesn't exist", async () => {
      (businessDAO.getBusinessByID as any).mockResolvedValue(null);
      await expect(service().createLocation(validFields)).rejects.toThrow(NotFoundError);
      expect(locationDAO.createLocation).not.toHaveBeenCalled();
    });

    it("throws ValidationError for an out-of-range lat", async () => {
      await expect(
        service().createLocation({ ...validFields, lat: 200 })
      ).rejects.toThrow(ValidationError);
      expect(locationDAO.createLocation).not.toHaveBeenCalled();
    });

    it("throws ValidationError for an out-of-range lng", async () => {
      await expect(
        service().createLocation({ ...validFields, lng: -200 })
      ).rejects.toThrow(ValidationError);
      expect(locationDAO.createLocation).not.toHaveBeenCalled();
    });

    it("throws ValidationError for a zero geofence_radius", async () => {
      await expect(
        service().createLocation({ ...validFields, geofence_radius: 0 })
      ).rejects.toThrow(ValidationError);
      expect(locationDAO.createLocation).not.toHaveBeenCalled();
    });

    it("throws ValidationError for a negative geofence_radius", async () => {
      await expect(
        service().createLocation({ ...validFields, geofence_radius: -5 })
      ).rejects.toThrow(ValidationError);
      expect(locationDAO.createLocation).not.toHaveBeenCalled();
    });

    it("accepts lat/lng of 0", async () => {
      await service().createLocation({ ...validFields, lat: 0, lng: 0 });
      expect(locationDAO.createLocation).toHaveBeenCalled();
    });
  });

  describe("getAllLocations", () => {
    it("returns all locations", async () => {
      const result = await service().getAllLocations();
      expect(result).toEqual([baseLocation]);
    });
  });

  describe("getLocationByID", () => {
    it("returns the location when found", async () => {
      const result = await service().getLocationByID(validLocationId);
      expect(result).toEqual(baseLocation);
    });

    it("throws ValidationError for an invalid UUID", async () => {
      await expect(service().getLocationByID("not-a-uuid")).rejects.toThrow(ValidationError);
      expect(locationDAO.getLocationByID).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the location doesn't exist", async () => {
      (locationDAO.getLocationByID as any).mockResolvedValue(null);
      await expect(service().getLocationByID(validLocationId)).rejects.toThrow(NotFoundError);
    });
  });

  describe("getLocationsByBusinessID", () => {
    it("returns locations for an existing business", async () => {
      const result = await service().getLocationsByBusinessID(validBusinessId);
      expect(result).toEqual([baseLocation]);
      expect(businessDAO.getBusinessByID).toHaveBeenCalledWith(validBusinessId);
    });

    it("throws ValidationError for an invalid UUID", async () => {
      await expect(service().getLocationsByBusinessID("not-a-uuid")).rejects.toThrow(ValidationError);
      expect(businessDAO.getBusinessByID).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the business doesn't exist", async () => {
      (businessDAO.getBusinessByID as any).mockResolvedValue(null);
      await expect(service().getLocationsByBusinessID(validBusinessId)).rejects.toThrow(NotFoundError);
      expect(locationDAO.getLocationsByBusinessID).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the business has no locations", async () => {
      (locationDAO.getLocationsByBusinessID as any).mockResolvedValue([]);
      await expect(service().getLocationsByBusinessID(validBusinessId)).rejects.toThrow(NotFoundError);
    });

    it("passes includeDeleted through to the DAO", async () => {
      await service().getLocationsByBusinessID(validBusinessId, true);
      expect(locationDAO.getLocationsByBusinessID).toHaveBeenCalledWith(validBusinessId, true);
    });
  });

  describe("updateLocationByID", () => {
    it("returns the updated location", async () => {
      const result = await service().updateLocationByID(validLocationId, { address: "New Address" });
      expect(result).toEqual(baseLocation);
    });

    it("throws ValidationError when there are no fields to update", async () => {
      await expect(service().updateLocationByID(validLocationId, {})).rejects.toThrow(ValidationError);
      expect(locationDAO.updateLocationByID).not.toHaveBeenCalled();
    });

    it("throws ValidationError when only lat is provided", async () => {
      await expect(
        service().updateLocationByID(validLocationId, { lat: 40.7128 })
      ).rejects.toThrow(ValidationError);
      expect(locationDAO.updateLocationByID).not.toHaveBeenCalled();
    });

    it("throws ValidationError when only lng is provided", async () => {
      await expect(
        service().updateLocationByID(validLocationId, { lng: -74.006 })
      ).rejects.toThrow(ValidationError);
      expect(locationDAO.updateLocationByID).not.toHaveBeenCalled();
    });

    it("accepts lat/lng of 0 provided together", async () => {
      await service().updateLocationByID(validLocationId, { lat: 0, lng: 0 });
      expect(locationDAO.updateLocationByID).toHaveBeenCalledWith(
        validLocationId,
        expect.objectContaining({ lat: 0, lng: 0 })
      );
    });

    it("throws ValidationError for an out-of-range lat/lng pair", async () => {
      await expect(
        service().updateLocationByID(validLocationId, { lat: 999, lng: 0 })
      ).rejects.toThrow(ValidationError);
      expect(locationDAO.updateLocationByID).not.toHaveBeenCalled();
    });

    it("throws ValidationError for a zero geofence_radius", async () => {
      await expect(
        service().updateLocationByID(validLocationId, { geofence_radius: 0 })
      ).rejects.toThrow(ValidationError);
      expect(locationDAO.updateLocationByID).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the update target doesn't exist", async () => {
      (locationDAO.updateLocationByID as any).mockResolvedValue(null);
      await expect(
        service().updateLocationByID(validLocationId, { address: "New Address" })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteLocationByID", () => {
    it("deletes an active location", async () => {
      await service().deleteLocationByID(validLocationId);
      expect(locationDAO.deleteLocationByID).toHaveBeenCalledWith(validLocationId);
    });

    it("throws NotFoundError when the location doesn't exist", async () => {
      (locationDAO.getLocationByID as any).mockResolvedValue(null);
      await expect(service().deleteLocationByID(validLocationId)).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError when already deleted", async () => {
      (locationDAO.getLocationByID as any).mockResolvedValue({ ...baseLocation, deleted: true });
      await expect(service().deleteLocationByID(validLocationId)).rejects.toThrow(ValidationError);
    });
  });
});