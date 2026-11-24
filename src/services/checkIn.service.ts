import {
  GiftCardDAO,
  LocationDAO,
  StampCardDAO,
  UserDAO,
  UserNotificationPreferencesDAO,
} from '../dao';
import { NotFoundError, validateUUID } from '../utils/validators';
import { requireFields } from './helpers.service';
import {
  ELIGIBILITY_CHECKS,
  EligibilityContext,
  evaluateEligibility,
  NotifiableCard,
  selectRelevantCards,
} from './notification-eligibility';

export type RejectedCard = {
  notifiable: NotifiableCard;
  reason: string;
  detail?: string;
};

export type CheckInResult = {
  eligible: NotifiableCard[];
  rejected: RejectedCard[];
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
): CheckInService {
  return {
    async checkIn(location_id, user_id, now = new Date()) {
      requireFields({ location_id, user_id }, ['location_id', 'user_id']);
      validateUUID(location_id);
      validateUUID(user_id);

      const user = await userDAO.getUserByID(user_id);
      if (!user) throw new NotFoundError('User not found');

      const location = await locationDAO.getLocationByID(location_id);
      if (!location) throw new NotFoundError('Location not found');

      const [stampCards, giftCards] = await Promise.all([
        stampCardDAO.getAllStampCardsByUserID(user_id),
        giftCardDAO.getAllGiftCardsByUserID(user_id),
      ]);

      const relevant = selectRelevantCards(location.business_id, stampCards, giftCards);
      if (relevant.length === 0) return { eligible: [], rejected: [] };

      const preferences =
        await userNotificationPreferencesDAO.getUserNotificationPreferencesByUserID(user_id);
      if (!preferences) throw new NotFoundError('User notification preferences not found');

      const context: EligibilityContext = {
        now,
        location_id,
        timezone: user.timezone,
      };

      const result: CheckInResult = { eligible: [], rejected: [] };

      for (const notifiable of relevant) {
        const evaluation = evaluateEligibility(
          notifiable,
          preferences,
          context,
          ELIGIBILITY_CHECKS,
        );

        if (evaluation.eligible) {
          result.eligible.push(notifiable);
        } else {
          result.rejected.push({
            notifiable,
            reason: evaluation.reason,
            detail: evaluation.detail,
          });
        }
      }

      return result;
    },
  };
}
