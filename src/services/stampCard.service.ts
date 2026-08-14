import { BusinessDAO, StampCardDAO, UserDAO } from "../dao";
import { StampCard, CreateStampCardInput, UpdateStampCardInput } from "../models/stamp-card.model";
import { NotFoundError, validateUUID, ValidationError } from "../utils/validators";
import { Pool } from "pg";
import { assertExists, requireFields } from "./helpers.service";

export type StampCardService = {
  createStampCard(fields: CreateStampCardInput): Promise<StampCard>;
  getAllStampCardsByUserId(user_id: string, includeDeleted?: boolean): Promise<StampCard[]>;
  getStampCardByID(id: string): Promise<StampCard>;
  updateStampCardByID(id: string, updates: UpdateStampCardInput): Promise<StampCard>;
  deleteStampCardByID(id: string): Promise<void>;
};

export function createStampCardService(
  stampCardDAO: StampCardDAO,
  userDAO: UserDAO,
  businessDAO: BusinessDAO,
  pool: Pool
): StampCardService {
  return {
    async createStampCard(fields: CreateStampCardInput): Promise<StampCard> {
      // check required fields
      requireFields(fields, ['user_id', 'business_id', 'stamps_needed'])
      
      // validate user_id, business_id
      validateUUID(fields.user_id)
      validateUUID(fields.business_id)

      await assertExists(() => userDAO.getUserByID(fields.user_id), 'User not found')
      await assertExists(() => businessDAO.getBusinessByID(fields.business_id), 'Business not found')

      return await stampCardDAO.createStampCard(fields, pool);
    },

    async getAllStampCardsByUserId(user_id: string, includeDeleted = false): Promise<StampCard[]> {
      validateUUID(user_id)
      await assertExists(() => userDAO.getUserByID(user_id), 'User not found')

      return stampCardDAO.getAllStampCardsByUserID(user_id, includeDeleted);
    },

    async getStampCardByID(id: string): Promise<StampCard> {
      validateUUID(id);

      const fetchedStampCard = await stampCardDAO.getStampCardByID(id);

      if (!fetchedStampCard) {
        throw new NotFoundError('Could not find stamp card')
      }

      return fetchedStampCard;
    },

    async updateStampCardByID(id: string, updates: UpdateStampCardInput): Promise<StampCard> {
      validateUUID(id);

      const updatedStampCard = await stampCardDAO.updateStampCardByID(id, updates);

      if (!updatedStampCard) {
        throw new NotFoundError('Could not update StampCard');
      }

      return updatedStampCard;
    },

    async deleteStampCardByID(id: string): Promise<void> {
      validateUUID(id);

      const fetchedStampCard = await stampCardDAO.getStampCardByID(id, true);
      if (!fetchedStampCard) {
        throw new NotFoundError('Could not find stamp card to delete')
      }

      if (fetchedStampCard.deleted) {
        throw new ValidationError('StampCard already deleted')
      }

      await stampCardDAO.deleteStampCardByID(id);
    }
  };
}