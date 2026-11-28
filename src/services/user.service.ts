import { UserDAO, UserNotificationPreferencesDAO } from '../dao';
import { CreateUserInput, User, UpdateUserInput } from '../models/user.model';
import { CreateUserNotificationPreferencesInput } from '../models/user-notification-preferences.model';
import {
  NotFoundError,
  validateUUID,
  validateTimezone,
  validateEmail,
  ValidationError,
} from '../utils/validators';
import { withTransaction, isUniqueViolation, USERS_AUTH_PROVIDER_ID_INDEX } from '../lib/db';
import { Pool } from 'pg';
import { assertUserNotDeleted, requireFields } from './helpers.service';

export type UserService = {
  createUser(fields: CreateUserInput): Promise<User>;
  getAllUsers(includeDeleted?: boolean): Promise<User[]>;
  getUserByID(id: string): Promise<User>;
  getOrCreateUserByAuthId(auth_provider_id: string): Promise<User>;
  updateUserByID(id: string, updates: UpdateUserInput): Promise<User>;
  deleteUserByID(id: string): Promise<void>;
};

export function createUserService(
  userDAO: UserDAO,
  userNotificationPreferencesDAO: UserNotificationPreferencesDAO,
  pool: Pool,
): UserService {
  function createUserWithDefaultPreferences(fields: CreateUserInput): Promise<User> {
    return withTransaction(pool, async (client) => {
      const newUser = await userDAO.createUser(fields, client);
      const defaultPreferences: CreateUserNotificationPreferencesInput = {
        user_id: newUser.id,
        notifications_enabled: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
        general_notification_window_start: null,
        general_notification_window_end: null,
        notify_window_days: null,
      };
      await userNotificationPreferencesDAO.createUserNotificationPreferences(
        defaultPreferences,
        client,
      );
      return newUser;
    });
  }

  return {
    async createUser(fields): Promise<User> {
      requireFields(fields, ['timezone']);
      if (fields.email != null) {
        validateEmail(fields.email);
      }
      if (fields.email == null && fields.auth_provider_id == null) {
        throw new ValidationError('Either email or auth_provider_id is required');
      }
      validateTimezone(fields.timezone);
      return createUserWithDefaultPreferences(fields);
    },

    async getOrCreateUserByAuthId(auth_provider_id: string): Promise<User> {
      if (!auth_provider_id || auth_provider_id.trim() === '') {
        throw new ValidationError('auth_provider_id is required');
      }

      // includeDeleted = true so a soft-deleted account is detected, not silently recreated
      const existing = await userDAO.getUserByAuthProviderID(auth_provider_id, true);
      if (existing) return assertUserNotDeleted(existing);

      try {
        return await createUserWithDefaultPreferences({
          email: null,
          display_name: null,
          auth_provider_id,
          timezone: 'UTC', // placeholder until client-side timezone capture exists
        });
      } catch (err) {
        if (!isUniqueViolation(err, USERS_AUTH_PROVIDER_ID_INDEX)) throw err;

        // Lost the race. Our insert only fails after the winner commits,
        // so the winner's row is visible to this read.
        const winner = await userDAO.getUserByAuthProviderID(auth_provider_id, true);
        if (!winner) throw err;
        return assertUserNotDeleted(winner);
      }
    },

    async getAllUsers(includeDeleted = false): Promise<User[]> {
      return userDAO.getAllUsers(includeDeleted);
    },

    async getUserByID(user_id: string): Promise<User> {
      validateUUID(user_id);

      const fetchedUser = await userDAO.getUserByID(user_id);

      if (!fetchedUser) {
        throw new NotFoundError('Could not find user');
      }

      return fetchedUser;
    },

    async updateUserByID(user_id: string, updates: UpdateUserInput): Promise<User> {
      validateUUID(user_id);

      if (updates.timezone) {
        validateTimezone(updates.timezone);
      }

      const safeUpdates: UpdateUserInput = {
        display_name: updates.display_name,
        timezone: updates.timezone,
      };

      const updatedUser = await userDAO.updateUserByID(user_id, safeUpdates);

      if (!updatedUser) {
        throw new NotFoundError('Could not update User');
      }

      return updatedUser;
    },

    async deleteUserByID(user_id: string): Promise<void> {
      validateUUID(user_id);

      const fetchedUser = await userDAO.getUserByID(user_id, true);
      if (!fetchedUser) {
        throw new NotFoundError('Could not find user to delete');
      }

      if (fetchedUser.deleted) {
        throw new ValidationError('User already deleted');
      }

      await userDAO.deleteUserByID(user_id);
    },
  };
}
