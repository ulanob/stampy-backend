import { BusinessDAO } from '../dao';
import { Business, CreateBusinessInput, UpdateBusinessInput, } from '../models/business.model';
import { NotFoundError, validateBusinessType, validateUUID, ValidationError, } from '../utils/validators';
import { requireFields } from './helpers.service';

export type BusinessService = {
  createBusiness(fields: CreateBusinessInput): Promise<Business>;
  getAllBusinesses(includeDeleted?: boolean): Promise<Business[]>;
  getBusinessByID(id: string, includeDeleted?: boolean): Promise<Business>;
  updateBusinessByID(id: string, updates: UpdateBusinessInput): Promise<Business>;
  deleteBusinessByID(id: string): Promise<void>;
};

export function createBusinessService(businessDAO: BusinessDAO): BusinessService {
  return {
    async createBusiness(fields: CreateBusinessInput): Promise<Business> {
      // check required fields
      requireFields(fields, ["name", "type"])
      validateBusinessType(fields.type);

      return await businessDAO.createBusiness(fields);
    },

    async getBusinessByID(id: string, includeDeleted: boolean = false): Promise<Business> {
      validateUUID(id);

      const fetchedBusiness = await businessDAO.getBusinessByID(id, includeDeleted);

      if (!fetchedBusiness) {
        throw new NotFoundError('Could not find business');
      }

      return fetchedBusiness;
    },

    async getAllBusinesses(includeDeleted: boolean = false): Promise<Business[]>{
      return businessDAO.getAllBusinesses(includeDeleted)
    },

    async updateBusinessByID(
      id: string,
      updates: UpdateBusinessInput
    ): Promise<Business> {
      validateUUID(id);

      if (updates.type !== undefined) {
        validateBusinessType(updates.type)
      }

      const updatedBusiness = await businessDAO.updateBusinessByID(id, updates);

      if (!updatedBusiness) {
        throw new NotFoundError('Could not update business');
      }

      return updatedBusiness;
    },

    async deleteBusinessByID(id: string): Promise<void> {
      validateUUID(id);

      const fetchedBusiness = await businessDAO.getBusinessByID(id, true);
      if (!fetchedBusiness) {
        throw new NotFoundError('Could not find business to delete');
      }

      if (fetchedBusiness.deleted) {
        throw new ValidationError('Business already deleted');
      }

      await businessDAO.deleteBusinessByID(id);
    },
  };
}
