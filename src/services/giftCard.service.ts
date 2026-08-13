import { BusinessDAO, GiftCardDAO, UserDAO } from '../dao';
import {
  GiftCard,
  CreateGiftCardInput,
  UpdateGiftCardInput,
} from '../models/gift-card.model';
import {
  NotFoundError,
  validateUUID,
  ValidationError,
} from '../utils/validators';
import { Pool } from 'pg';
import { assertExists } from './helpers.service';

export type GiftCardService = {
  createGiftCard(fields: CreateGiftCardInput): Promise<GiftCard>;
  getAllGiftCardsByUserId(
    user_id: string,
    includeDeleted?: boolean
  ): Promise<GiftCard[]>;
  getGiftCardByID(id: string, includeDeleted?: boolean): Promise<GiftCard>;
  updateGiftCardByID(
    id: string,
    updates: UpdateGiftCardInput
  ): Promise<GiftCard>;
  deleteGiftCardByID(id: string): Promise<void>;
};

export function createGiftCardService(
  giftCardDAO: GiftCardDAO,
  userDAO: UserDAO,
  businessDAO: BusinessDAO,
  pool: Pool
): GiftCardService {
  return {
    async createGiftCard(fields: CreateGiftCardInput): Promise<GiftCard> {
      // check required fields
      const requiredFields: (keyof CreateGiftCardInput)[] = [
        'user_id',
        'business_id',
        'initial_balance',
        'currency'
      ];
      for (const field of requiredFields) {
        if (fields[field] === undefined || fields[field] === null) {
          throw new ValidationError(`Missing required field: ${field}`);
        }
      }

      // validate user_id, business_id
      validateUUID(fields.user_id);
      validateUUID(fields.business_id);

      await assertExists(
        () => userDAO.getUserByID(fields.user_id),
        'User not found'
      );
      await assertExists(
        () => businessDAO.getBusinessByID(fields.business_id),
        'Business not found'
      );

      // set current_balance to be the initial_balance on card creation
      return await giftCardDAO.createGiftCard(
        { ...fields, current_balance: fields.initial_balance },
        pool
      );
    },

    async getAllGiftCardsByUserId(
      user_id: string,
      includeDeleted = false
    ): Promise<GiftCard[]> {
      validateUUID(user_id);
      await assertExists(() => userDAO.getUserByID(user_id), 'User not found');

      return giftCardDAO.getAllGiftCardsByUserID(user_id, includeDeleted);
    },

    async getGiftCardByID(id: string, includeDeleted: boolean = false): Promise<GiftCard> {
      validateUUID(id);

      const fetchedGiftCard = await giftCardDAO.getGiftCardByID(id, includeDeleted);

      if (!fetchedGiftCard) {
        throw new NotFoundError('Could not find gift card');
      }

      return fetchedGiftCard;
    },

    async updateGiftCardByID(
      id: string,
      updates: UpdateGiftCardInput
    ): Promise<GiftCard> {
      validateUUID(id);

      const safeUpdates: UpdateGiftCardInput = {
        nickname: updates.nickname,
        notes: updates.notes,
        notify_window_days: updates.notify_window_days,
        notify_window_start_time: updates.notify_window_start_time,
        notify_window_end_time: updates.notify_window_end_time,
        notification_time_sent: updates.notification_time_sent,
        notification_cooldown_time: updates.notification_cooldown_time,
        expiration_date: updates.expiration_date,
      };

      const updatedGiftCard = await giftCardDAO.updateGiftCardByID(id, safeUpdates);

      if (!updatedGiftCard) {
        throw new NotFoundError('Could not update GiftCard');
      }

      return updatedGiftCard;
    },

    async deleteGiftCardByID(id: string): Promise<void> {
      validateUUID(id);

      const fetchedGiftCard = await giftCardDAO.getGiftCardByID(id, true);
      if (!fetchedGiftCard) {
        throw new NotFoundError('Could not find gift card to delete');
      }

      if (fetchedGiftCard.deleted) {
        throw new ValidationError('Gift card already deleted');
      }

      await giftCardDAO.deleteGiftCardByID(id);
    },
  };
}
