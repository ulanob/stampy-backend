import { StampCardDAO, StampEventDAO } from "../dao";
import { Pool } from "pg";
import { Executor } from "../dao/types";
import { withTransaction } from "../lib/db";
import { StampCardStatus } from "../models/stamp-card.model";
import { CreateStampEventInput, StampEvent } from "../models/stamp-event.model";
import { NotFoundError, validateUUID, ValidationError } from "../utils/validators";

export type StampEventService = {
  createStampEvent(fields: CreateStampEventInput): Promise<StampEvent>;
  getStampEventsByStampCardID(stamp_card_id: string): Promise<StampEvent[]>
  getStampEventByRequestID(request_id: string): Promise<StampEvent | null>;
  getAllStampEventsByUserID(user_id: string): Promise<StampEvent[]>
};

export function createStampEventService(
  stampEventDAO: StampEventDAO,
  stampCardDAO: StampCardDAO,
  pool: Pool
): StampEventService {
  return {
    async createStampEvent(fields): Promise<StampEvent> {
      validateUUID(fields.stamp_card_id)

      return withTransaction(pool, async (client) => {
        // idempotency check
        if (fields.request_id) {
          const existing = await stampEventDAO.getStampEventByRequestID(fields.request_id, client);
          if (existing) return existing;
        }

        // check card
        const card = await stampCardDAO.getStampCardByID(fields.stamp_card_id, false, client);
        if (!card) throw new NotFoundError('Could not find stamp card');

        // handle stamp event types 

        const NO_ADD_STATUSES: StampCardStatus[] = ['completed', 'redeemed', 'expired', 'cancelled'];
        const NO_REMOVE_STATUSES: StampCardStatus[] = ['redeemed', 'expired', 'cancelled'];

        let newAcquired = card.stamps_acquired;
        let newStatus = card.status;

        switch (fields.type) {
          case 'stamp_added': {
            if (NO_ADD_STATUSES.includes(card.status)) {
              throw new ValidationError(`Cannot add stamps to a ${card.status} card`);
            }

            // fill, check for overflow. automatically create new card if overflow
            const fillAmount = Math.min(fields.quantity, card.stamps_needed - card.stamps_acquired);
            const overflowAmount = fields.quantity - fillAmount;

            newAcquired = card.stamps_acquired + fillAmount;
            if (newAcquired >= card.stamps_needed) newStatus = 'completed';

            if (overflowAmount > 0) {
              const newCard = await stampCardDAO.createStampCard(
                {
                  user_id: card.user_id,
                  business_id: card.business_id,
                  nickname: card.nickname,
                  notes: null,
                  stamps_needed: card.stamps_needed,
                  stamps_acquired: overflowAmount,
                  status: 'active',
                  notify_window_days: null,
                  notify_window_start_time: null,
                  notify_window_end_time: null,
                  notification_time_sent: null,
                  notification_cooldown_time: null,
                  expiration_date: null
                },
                client
              );
              await stampEventDAO.createStampEvent(
                {
                  user_id: card.user_id,
                  stamp_card_id: newCard.id,
                  location_id: fields.location_id,
                  request_id: crypto.randomUUID(),
                  type: 'stamp_added',
                  quantity: overflowAmount,
                },
                client
              );
            }
            break;
          }

          case 'stamp_removed': {
            if (NO_REMOVE_STATUSES.includes(card.status)) {
              throw new ValidationError(`Cannot remove stamps from a ${card.status} card`);
            }
            if (card.stamps_acquired - fields.quantity < 0) {
              throw new ValidationError('Cannot remove more stamps than the card has');
            }
            newAcquired = card.stamps_acquired - fields.quantity;
            if (card.status === 'completed' && newAcquired < card.stamps_needed) {
              newStatus = 'active';
            }
            break;
          }

          case 'reward_redeemed': {
            newAcquired = 0;
            newStatus = 'redeemed';
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
        const event = await stampEventDAO.createStampEvent(fields, client);
        await stampCardDAO.updateStampCardByID(
          card.id,
          { stamps_acquired: newAcquired, status: newStatus },
          client
        );
        return event;
      })


    },

    async getStampEventByRequestID(request_id: string): Promise<StampEvent | null> {
      validateUUID(request_id);

      const fetchedEvent = await stampEventDAO.getStampEventByRequestID(request_id);

      return fetchedEvent ? fetchedEvent : null
    },

    async getStampEventsByStampCardID(stamp_card_id: string): Promise<StampEvent[]> {
      validateUUID(stamp_card_id);

      const fetchedEvents = await stampEventDAO.getStampEventsByStampCardID(stamp_card_id);

      return fetchedEvents
    },

    async getAllStampEventsByUserID(user_id: string): Promise<StampEvent[]> {
      validateUUID(user_id);

      const fetchedEvents = await stampEventDAO.getAllStampEventsByUserID(user_id);

      return fetchedEvents;
    }

  };
}