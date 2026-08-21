import { GiftCardDAO, GiftCardEventDAO } from "../dao";
import { Pool } from "pg";
import { withTransaction } from "../lib/db";
import { GiftCardStatus } from "../models/gift-card.model";
import { CreateGiftCardEventInput, GiftCardEvent } from "../models/gift-card-event.model";
import { NotFoundError, validateUUID, ValidationError } from "../utils/validators";
import { requireFields } from "./helpers.service";

export type GiftCardEventService = {
  createGiftCardEvent(fields: CreateGiftCardEventInput): Promise<GiftCardEvent>;
  getGiftCardEventsByGiftCardID(gift_card_id: string): Promise<GiftCardEvent[]>;
  getGiftCardEventByRequestID(request_id: string): Promise<GiftCardEvent | null>;
  getAllGiftCardEventsByUserID(user_id: string): Promise<GiftCardEvent[]>;
};

export function createGiftCardEventService(
  giftCardEventDAO: GiftCardEventDAO,
  giftCardDAO: GiftCardDAO,
  pool: Pool
): GiftCardEventService {
  return {
    async createGiftCardEvent(fields): Promise<GiftCardEvent> {
      requireFields(fields, ['user_id', 'gift_card_id', 'request_id', 'type', 'amount']);
      validateUUID(fields.gift_card_id);

      return withTransaction(pool, async (client) => {
        // idempotency check
        if (fields.request_id) {
          const existing = await giftCardEventDAO.getGiftCardEventByRequestID(fields.request_id, client);
          if (existing) return existing;
        }

        // check card
        const card = await giftCardDAO.getGiftCardByID(fields.gift_card_id, false, client);
        if (!card) throw new NotFoundError('Could not find gift card');

        // handle gift card event types

        const NO_ADD_STATUSES: GiftCardStatus[] = ['expired', 'cancelled'];
        const NO_REDEEM_STATUSES: GiftCardStatus[] = ['expired', 'cancelled'];

        let newBalance = card.current_balance;
        let newStatus = card.status;

        switch (fields.type) {
          case 'balance_added': {
            if (NO_ADD_STATUSES.includes(card.status)) {
              throw new ValidationError(`Cannot add balance to a ${card.status} card`);
            }
            newBalance = card.current_balance + fields.amount;
            break;
          }

          case 'balance_redeemed': {
            if (NO_REDEEM_STATUSES.includes(card.status)) {
              throw new ValidationError(`Cannot redeem from a ${card.status} card`);
            }
            if (card.current_balance - fields.amount < 0) {
              throw new ValidationError('Cannot redeem more than the card balance');
            }
            newBalance = card.current_balance - fields.amount;
            break;
          }

          case 'card_expired': {
            newStatus = 'expired';
            break;
          }

          case 'card_deleted': {
            newStatus = 'cancelled';
            break;
          }
        }

        const event = await giftCardEventDAO.createGiftCardEvent(fields, client);
        await giftCardDAO.updateGiftCardByID(
          card.id,
          { current_balance: newBalance, status: newStatus },
          client
        );

        return event;
      });
    },

    async getGiftCardEventByRequestID(request_id: string): Promise<GiftCardEvent | null> {
      validateUUID(request_id);

      const fetchedEvent = await giftCardEventDAO.getGiftCardEventByRequestID(request_id);

      return fetchedEvent ? fetchedEvent : null;
    },

    async getGiftCardEventsByGiftCardID(gift_card_id: string): Promise<GiftCardEvent[]> {
      validateUUID(gift_card_id);

      const fetchedEvents = await giftCardEventDAO.getGiftCardEventsByGiftCardID(gift_card_id);

      return fetchedEvents;
    },

    async getAllGiftCardEventsByUserID(user_id: string): Promise<GiftCardEvent[]> {
      validateUUID(user_id);

      const fetchedEvents = await giftCardEventDAO.getAllGiftCardEventsByUserID(user_id);

      return fetchedEvents;
    }
  };
}