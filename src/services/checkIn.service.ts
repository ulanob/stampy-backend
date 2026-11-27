import { Pool, PoolClient } from 'pg';
import {
  GiftCardDAO,
  LocationDAO,
  NotificationDAO,
  StampCardDAO,
  UserDAO,
  UserNotificationPreferencesDAO,
} from '../dao';
import { withTransaction } from '../lib/db';
import { Notification } from '../models/notification.model';
import { NotFoundError, validateUUID } from '../utils/validators';
import { buildCheckInMessage } from './buildCheckInMessage';
import { requireFields } from './helpers.service';
import {
  ELIGIBILITY_CHECKS,
  EligibilityContext,
  evaluateEligibility,
  NotifiableCard,
  selectRelevantCards,
} from './notification-eligibility';
import { isSameLocalDay } from './notification-eligibility/checks/utils';
import type { TimezoneService } from './timezone.service';

export type RejectedCard = {
  notifiable: NotifiableCard;
  reason: string;
  detail?: string;
};

export type CheckInResult = {
  context: EligibilityContext;
  eligible: NotifiableCard[]; // passed the pipeline AND won the claim; these are in the notification
  rejected: RejectedCard[];
  notification: Notification | null;
};

export type CheckInService = {
  checkIn(location_id: string, user_id: string, now?: Date): Promise<CheckInResult>;
};

export function createCheckInService(
  locationDAO: LocationDAO,
  userDAO: UserDAO,
  stampCardDAO: StampCardDAO,
  giftCardDAO: GiftCardDAO,
  userNotificationPreferencesDAO: UserNotificationPreferencesDAO,
  notificationDAO: NotificationDAO,
  timezoneService: TimezoneService,
  pool: Pool,
): CheckInService {
  function claimCard(notifiable: NotifiableCard, now: Date, client: PoolClient): Promise<boolean> {
    const { id, notification_time_sent } = notifiable.card;
    return notifiable.type === 'stamp_card'
      ? stampCardDAO.claimNotification(id, notification_time_sent, now, client)
      : giftCardDAO.claimNotification(id, notification_time_sent, now, client);
  }

  return {
    async checkIn(location_id, user_id, now = new Date()) {
      requireFields({ location_id, user_id }, ['location_id', 'user_id']);
      validateUUID(location_id);
      validateUUID(user_id);

      const user = await userDAO.getUserByID(user_id);
      if (!user) throw new NotFoundError('User not found');

      const location = await locationDAO.getLocationByID(location_id);
      if (!location) throw new NotFoundError('Location not found');

      const timezone = await timezoneService.correctUserTimezone(
        user_id,
        location.lat,
        location.lng,
      );

      const context: EligibilityContext = { now, location_id: location.id, timezone };

      return withTransaction(pool, async (client) => {
        // Lock first: concurrent check-ins for this user queue here, and every
        // read below sees the state the previous check-in committed.
        const preferences =
          await userNotificationPreferencesDAO.getUserNotificationPreferencesForUpdate(
            user_id,
            client,
          );
        if (!preferences) throw new NotFoundError('User notification preferences not found');

        // Sequential on purpose: a single client runs one query at a time.
        const stampCards = await stampCardDAO.getAllStampCardsByUserID(user_id, false, client);
        const giftCards = await giftCardDAO.getAllGiftCardsByUserID(user_id, false, client);
        const relevant = selectRelevantCards(location.business_id, stampCards, giftCards);

        const result: CheckInResult = { context, eligible: [], rejected: [], notification: null };

        for (const notifiable of relevant) {
          const evaluation = evaluateEligibility(
            notifiable,
            preferences,
            context,
            ELIGIBILITY_CHECKS,
          );

          if (!evaluation.eligible) {
            result.rejected.push({
              notifiable,
              reason: evaluation.reason,
              detail: evaluation.detail,
            });
            continue;
          }

          // Defense in depth: the lock should make a lost claim impossible here,
          // but the card's own cooldown invariant shouldn't depend on that.
          if (await claimCard(notifiable, now, client)) {
            result.eligible.push(notifiable);
          } else {
            result.rejected.push({
              notifiable,
              reason: 'claim_lost',
              detail: 'Card was notified by another check-in first',
            });
          }
        }

        if (result.eligible.length === 0) return result;

        const { subject, body } = buildCheckInMessage(result.eligible);

        // One notification per business per check-in. Card ids are set only when
        // exactly one card is included, since the row holds a single id of each type.
        const single = result.eligible.length === 1 ? result.eligible[0] : null;

        result.notification = await notificationDAO.createNotification(
          {
            user_id,
            stamp_card_id: single?.type === 'stamp_card' ? single.card.id : null,
            gift_card_id: single?.type === 'gift_card' ? single.card.id : null,
            location_id,
            type: 'check_in',
            subject,
            body,
          },
          client,
        );

        const sameLocalDay =
          preferences.last_notified_date !== null &&
          isSameLocalDay(preferences.last_notified_date, now, timezone);

        await userNotificationPreferencesDAO.recordNotificationsSent(
          user_id,
          {
            counter: (sameLocalDay ? preferences.daily_notification_counter : 0) + 1,
            last_notified_date: now,
          },
          client,
        );

        return result;
      });
    },
  };
}
