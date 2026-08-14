import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBusinessService } from "../../services/business.service";
import type { BusinessDAO } from "../../dao";
import { NotFoundError, ValidationError, InvalidBusinessType } from "../../utils/validators";

describe("businessService", () => {
  let businessDAO: BusinessDAO;

  const validBusinessId = "a1b2c3d4-0000-0000-0000-000000000001";

  const baseBusiness = {
    id: validBusinessId,
    name: "Test Business 1",
    type: "cafe" as const,
    deleted: false,
  };

  beforeEach(() => {
    businessDAO = {
      createBusiness: vi.fn().mockResolvedValue(baseBusiness),
      getAllBusinesses: vi.fn().mockResolvedValue([baseBusiness]),
      getBusinessByID: vi.fn().mockResolvedValue(baseBusiness),
      updateBusinessByID: vi.fn().mockResolvedValue(baseBusiness),
      deleteBusinessByID: vi.fn().mockResolvedValue(undefined),
    } as unknown as BusinessDAO;
  });

  function service() {
    return createBusinessService(businessDAO);
  }

  describe("createBusiness", () => {
    it("creates a business with valid fields", async () => {
      const result = await service().createBusiness({ name: "Test Business 1", type: "cafe" });
      expect(result).toEqual(baseBusiness);
      expect(businessDAO.createBusiness).toHaveBeenCalled();
    });

    it("throws ValidationError when name is missing", async () => {
      await expect(service().createBusiness({ type: "cafe" } as any)).rejects.toThrow(ValidationError);
      expect(businessDAO.createBusiness).not.toHaveBeenCalled();
    });

    it("throws ValidationError when type is missing", async () => {
      await expect(service().createBusiness({ name: "Test" } as any)).rejects.toThrow(ValidationError);
      expect(businessDAO.createBusiness).not.toHaveBeenCalled();
    });

    it("throws InvalidBusinessType for an invalid type", async () => {
      await expect(
        service().createBusiness({ name: "Test", type: "not-a-type" } as any)
      ).rejects.toThrow(InvalidBusinessType);
      expect(businessDAO.createBusiness).not.toHaveBeenCalled();
    });
  });

  describe("getAllBusinesses", () => {
    it("returns all businesses", async () => {
      const result = await service().getAllBusinesses();
      expect(result).toEqual([baseBusiness]);
    });
  });

  describe("getBusinessByID", () => {
    it("returns the business when found", async () => {
      const result = await service().getBusinessByID(validBusinessId);
      expect(result).toEqual(baseBusiness);
    });

    it("throws NotFoundError when the business doesn't exist", async () => {
      (businessDAO.getBusinessByID as any).mockResolvedValue(null);
      await expect(service().getBusinessByID(validBusinessId)).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateBusinessByID", () => {
    it("returns the updated business", async () => {
      const result = await service().updateBusinessByID(validBusinessId, { name: "New name" });
      expect(result).toEqual(baseBusiness);
    });

    it("validates type when included in the update", async () => {
      await expect(
        service().updateBusinessByID(validBusinessId, { type: "invalid" } as any)
      ).rejects.toThrow(InvalidBusinessType);
      expect(businessDAO.updateBusinessByID).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when the update target doesn't exist", async () => {
      (businessDAO.updateBusinessByID as any).mockResolvedValue(null);
      await expect(
        service().updateBusinessByID(validBusinessId, { name: "New name" })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteBusinessByID", () => {
    it("deletes an active business", async () => {
      await service().deleteBusinessByID(validBusinessId);
      expect(businessDAO.deleteBusinessByID).toHaveBeenCalledWith(validBusinessId);
    });

    it("throws NotFoundError when the business doesn't exist", async () => {
      (businessDAO.getBusinessByID as any).mockResolvedValue(null);
      await expect(service().deleteBusinessByID(validBusinessId)).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError when already deleted", async () => {
      (businessDAO.getBusinessByID as any).mockResolvedValue({ ...baseBusiness, deleted: true });
      await expect(service().deleteBusinessByID(validBusinessId)).rejects.toThrow(ValidationError);
    });
  });
});