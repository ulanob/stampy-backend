// src/services/timezone.service.ts
import { UserDAO } from '../dao';
import { TimezoneResolver } from '../lib/timezone';
import { NotFoundError, validateUUID } from '../utils/validators';
import { validateCoordinates } from './helpers.service';

export type TimezoneService = {
  correctUserTimezone(user_id: string, lat: number, lng: number): Promise<string>;
};

export function createTimezoneService(
  userDAO: UserDAO,
  resolveTimezones: TimezoneResolver,
): TimezoneService {
  return {
    // Returns the user's effective timezone after any correction
    async correctUserTimezone(user_id, lat, lng): Promise<string> {
      validateUUID(user_id);
      validateCoordinates(lat, lng);

      const user = await userDAO.getUserByID(user_id);
      if (!user) throw new NotFoundError('Could not find user');

      const candidates = await resolveTimezones(lat, lng);

      // no result (ocean), or the stored zone is still valid here: leave it alone
      if (candidates.length === 0 || candidates.includes(user.timezone)) {
        return user.timezone;
      }

      const updated = await userDAO.updateUserByID(user_id, { timezone: candidates[0] });
      if (!updated) throw new NotFoundError('Could not update user timezone');

      return updated.timezone;
    },
  };
}
