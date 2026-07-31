import { UserDAO , UserNotificationPreferencesDAO,  } from "../dao";
import { CreateUserInput, User, UpdateUserInput } from "../models/user.model";
import { CreateUserNotificationPreferencesInput } from "../models/user-notification-preferences.model";
import { NotFoundError, validateUUID, ValidationError } from "../utils/validators";
import { withTransaction } from "../lib/db";
import { Pool } from "pg";

export type UserService = {
  createUser(fields: CreateUserInput): Promise<User>;
  getAllUsers(includeDeleted?: boolean): Promise<User[]>;
  getUserByID(id: string): Promise<User>;
  updateUserByID(id: string, updates: UpdateUserInput): Promise<User>;
  deleteUserByID(id: string): Promise<void>;
};

export function createUserService(
  userDAO: UserDAO,
  userNotificationPreferencesDAO: UserNotificationPreferencesDAO,
  pool: Pool
): UserService {
  return {
    async createUser(fields): Promise<User> {
        // TODO: set from Cognito
        const requiredFields: (keyof CreateUserInput)[] = [ "email" ];

        for (const field of requiredFields) {
            if (fields[field] === undefined || fields[field] === null) {
                throw new ValidationError(`Missing required field: ${field}`)
            }
        }

      return withTransaction(pool, async (client) => {
        const newUser = await userDAO.createUser(fields, client);
        const defaultPreferences:CreateUserNotificationPreferencesInput = {
            user_id: newUser.id,
            notifications_enabled: true,
            quiet_hours_start: null,
            quiet_hours_end: null,
            general_notification_window_start: null,
            general_notification_window_end: null,
            notify_window_days: null,
            daily_notification_cap: 5
        }
        await userNotificationPreferencesDAO.createUserNotificationPreferences(defaultPreferences, client);
        return newUser;
      });
    },

    async getAllUsers(includeDeleted = false): Promise<User[]> {
        return userDAO.getAllUsers(includeDeleted);
    },

    async getUserByID(user_id: string):Promise<User> {
        validateUUID(user_id);

        const fetchedUser = await userDAO.getUserByID(user_id);

        if (!fetchedUser) { 
            throw new NotFoundError('Could not find user')
        } 
        
        return fetchedUser;
    },

    async updateUserByID(user_id: string, updates: UpdateUserInput): Promise<User> {
        validateUUID(user_id);

        const safeUpdates: UpdateUserInput = {
            display_name: updates.display_name,
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
            throw new NotFoundError('Could not find user to delete')
        }

        if (fetchedUser.deleted) {
            throw new ValidationError('User already deleted')
        }

        await userDAO.deleteUserByID(user_id);
    }
  };
}