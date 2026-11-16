import { LocationDAO, UserDAO } from "../dao"
import { validateUUID } from "../utils/validators";
import { assertExists, requireFields } from "./helpers.service";

export type CheckInService = {
  checkIn(location_id: string, user_id: string): Promise<null>
}

export function createCheckInService(
  locationDAO: LocationDAO,
  userDAO: UserDAO,
  // businessDAO: BusinessDAO
): CheckInService {
  return {
    async checkIn(location_id: string, user_id: string): Promise<null> {
      requireFields({ location_id, user_id }, ['location_id', 'user_id']);
      
      validateUUID(location_id);
      validateUUID(user_id);

      await assertExists(() => userDAO.getUserByID(user_id), 'User not found');
      await assertExists(() => locationDAO.getLocationByID(location_id), 'Location not found');

      return null
    }
  }
}