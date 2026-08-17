import { UserNotificationPreferencesDAO } from '../dao';
import {
  UserNotificationPreferences,
  CreateUserNotificationPreferencesInput,
  UpdateUserNotificationPreferencesInput,
} from '../models/user-notification-preferences.model';
import {
  NotFoundError,
  validateUUID,
  ValidationError,
} from '../utils/validators';
import { Pool } from 'pg';
import { requireFields } from './helpers.service';
import { Executor } from '../dao/types';

export type UserNotificationPreferencesService = {
  createUserNotificationPreferences(
    fields: CreateUserNotificationPreferencesInput,
    executor?: Executor
  ): Promise<UserNotificationPreferences>;
  getUserNotificationPreferencesByUserID(
    user_id: string
  ): Promise<UserNotificationPreferences>;
  updateUserNotificationPreferencesByUserID(
    user_id: string,
    updates: UpdateUserNotificationPreferencesInput
  ): Promise<UserNotificationPreferences>;
};

export function createUserNotificationPreferencesService(
  userNotificationPreferencesDAO: UserNotificationPreferencesDAO,
  pool: Pool
): UserNotificationPreferencesService {
  return {
    async createUserNotificationPreferences(
      fields: CreateUserNotificationPreferencesInput,
      executor: Executor = pool
    ): Promise<UserNotificationPreferences> {
      // check required fields
      requireFields(fields, ['user_id']);
      validateUUID(fields.user_id);

      return await userNotificationPreferencesDAO.createUserNotificationPreferences(
        fields,
        executor
      );
    },

    async getUserNotificationPreferencesByUserID(
      user_id: string
    ): Promise<UserNotificationPreferences> {
      validateUUID(user_id);

      const fetchedUserNotificationPreferences =
        await userNotificationPreferencesDAO.getUserNotificationPreferencesByUserID(
          user_id
        );

      if (!fetchedUserNotificationPreferences) {
        throw new NotFoundError('Could not find userNotificationPreferences');
      }

      return fetchedUserNotificationPreferences;
    },

    async updateUserNotificationPreferencesByUserID(
      user_id: string,
      updates: UpdateUserNotificationPreferencesInput
    ): Promise<UserNotificationPreferences> {
      validateUUID(user_id);

      // check updates exist, arent aren't undefined
      const definedUpdates = Object.entries(updates).filter(
        ([, v]) => v !== undefined
      );
      if (definedUpdates.length === 0) {
        throw new ValidationError('No fields to update');
      }

      const updatedUserNotificationPreferences =
        await userNotificationPreferencesDAO.updateUserNotificationPreferencesByUserID(
          user_id,
          updates
        );

      if (!updatedUserNotificationPreferences) {
        throw new NotFoundError('Could not update userNotificationPreferences');
      }

      return updatedUserNotificationPreferences;
    },
  };
}
