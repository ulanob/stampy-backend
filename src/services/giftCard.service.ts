import { BusinessDAO, GiftCardDAO, UserDAO } from '../dao';
import { GiftCard, UpdateGiftCardInput, CreateGiftCardRequestBody, } from '../models/gift-card.model';
import { NotFoundError, validateUUID, ValidationError, } from '../utils/validators';
import { Pool } from 'pg';
import { assertExists, requireFields } from './helpers.service';
import { withTransaction } from '../lib/db';
import { GiftCardEventService } from './giftCardEvent.service';

export type GiftCardService = {
  createGiftCard(fields: CreateGiftCardRequestBody): Promise<GiftCard>;
  getAllGiftCardsByUserId(user_id: string,includeDeleted?: boolean): Promise<GiftCard[]>;
  getGiftCardByID(id: string, includeDeleted?: boolean): Promise<GiftCard>;
  updateGiftCardByID(id: string,updates: UpdateGiftCardInput): Promise<GiftCard>;
  deleteGiftCardByID(id: string): Promise<void>;
};

export function createGiftCardService(
  giftCardDAO: GiftCardDAO,
  userDAO: UserDAO,
  businessDAO: BusinessDAO,
  giftCardEventService: GiftCardEventService,
  pool: Pool
): GiftCardService {
  return {
    async createGiftCard(
      fields: CreateGiftCardRequestBody ): Promise<GiftCard> {
      // check required card create fields
      // location_id optional: card create can happen away from a location (ie at home instead of a business)
      requireFields(fields, ['user_id', 'business_id', 'currency', 'amount', 'request_id'])

      // validate user_id, business_id
      validateUUID(fields.user_id);
      validateUUID(fields.business_id);

      const { amount, location_id, request_id, ...cardFields } = fields;

      await assertExists(
        () => userDAO.getUserByID(fields.user_id),
        'User not found'
      );
      await assertExists(
        () => businessDAO.getBusinessByID(fields.business_id),
        'Business not found'
      );

      return withTransaction(pool, async (client) => {
        const newCard = await giftCardDAO.createGiftCard(
          { ...cardFields, 
            status: 'active' },
          client
        );
  
        await giftCardEventService.createGiftCardEvent(
          { 
            gift_card_id: newCard.id, 
            user_id: fields.user_id,
            location_id: location_id ?? null,
            request_id,
            type: 'balance_added' ,
            amount,
          },
          client
        );  

        // current_balance set to amount as card creation only has one event: balance_added. Does not need to be derived from another request.
        return {... newCard, current_balance: amount};
      })
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
        notification_cooldown_seconds: updates.notification_cooldown_seconds,
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
