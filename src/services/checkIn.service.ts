import { GiftCardDAO, LocationDAO, StampCardDAO, UserDAO } from "../dao";
import { NotFoundError, validateUUID } from "../utils/validators";
import { assertExists, requireFields } from "./helpers.service";
import { NotifiableCard, selectRelevantCards } from "./notification-eligibility";

export type CheckInService = {
  checkIn(location_id: string, user_id: string): Promise<NotifiableCard[] | null>;
};

export function createCheckInService(
  locationDAO: LocationDAO,
  userDAO: UserDAO,
  stampCardDAO: StampCardDAO,
  giftCardDAO: GiftCardDAO
): CheckInService {
  return {
    async checkIn(location_id, user_id) {
      requireFields({ location_id, user_id }, ["location_id", "user_id"]);
      validateUUID(location_id);
      validateUUID(user_id);

      await assertExists(() => userDAO.getUserByID(user_id), "User not found");

      const location = await locationDAO.getLocationByID(location_id);
      if (!location) throw new NotFoundError("Location not found");

      const [stampCards, giftCards] = await Promise.all([
        stampCardDAO.getAllStampCardsByUserID(user_id),
        giftCardDAO.getAllGiftCardsByUserID(user_id),
      ]);

      const relevant = selectRelevantCards(location.business_id, stampCards, giftCards);
      return relevant.length > 0 ? relevant : null;
    },
  };
}