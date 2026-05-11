import { Pool } from "pg";
import { UserNotificationPreferences, CreateUserNotificationPreferencesInput, UpdateUserNotificationPreferences } from "../models/user-notification-preferences.model";

const userNotificationPreferencesTableName = "user_notification_preferences"

export type UserNotificationPreferencesDAO = {
  createUserNotificationPreferences(fields: CreateUserNotificationPreferencesInput): Promise<UserNotificationPreferences | null>;
  getUserNotificationPreferencesByUserID(user_id: string): Promise<UserNotificationPreferences | null>;
  updateUserNotificationPreferencesByUserID(user_id: string, updates: UpdateUserNotificationPreferences): Promise<UserNotificationPreferences | null>;
}

export function createUserNotificationPreferencesDAO(pool: Pool): UserNotificationPreferencesDAO {
  return {
    async createUserNotificationPreferences(fields: CreateUserNotificationPreferencesInput): Promise<UserNotificationPreferences | null> {
      const sqlString = `
      INSERT INTO ${userNotificationPreferencesTableName}
        (user_id,
        notifications_enabled,
        quiet_hours_start,
        quiet_hours_end,
        general_notification_window_start,
        general_notification_window_end,
        notify_window_days,
        daily_notification_cap
        )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        ${userNotificationPreferencesColumns}`

      const inputs = [
        fields.user_id,
        fields.notifications_enabled,
        fields.quiet_hours_start,
        fields.quiet_hours_end,
        fields.general_notification_window_start,
        fields.general_notification_window_end,
        fields.notify_window_days, 
        fields.daily_notification_cap,
      ]

      const result = await pool.query(sqlString, inputs);
      const row = result.rows[0]

      if (!row) return null;

      return mapDbRowToUserNotificationPreferences(row);
    },

    async getUserNotificationPreferencesByUserID(user_id: string, ): Promise<UserNotificationPreferences | null> {
      const sqlString = `
          SELECT
            ${userNotificationPreferencesColumns}
          FROM ${userNotificationPreferencesTableName}
          WHERE user_id = $1
          `;

      const result = await pool.query(sqlString, [user_id])
      const row = result.rows[0]
      if (!row) return null;

      return mapDbRowToUserNotificationPreferences(row);
    },

    async updateUserNotificationPreferencesByUserID(user_id: string, updates: UpdateUserNotificationPreferences) {
      const setArgs: string[] = [];
      const values: (string | string[] | number | boolean | Date | null)[] = [];

      let i = 1;

      // Safe: keys are derived from typed UpdateUserNotificationPreferences, not raw user input
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setArgs.push(`${key} = $${i}`);
          values.push(value);
          i++;
        }
      }

      if (setArgs.length === 0) {
        throw new Error("No fields to update");
      }

      const sqlString = `
          UPDATE ${userNotificationPreferencesTableName}
          SET ${setArgs.join(", ")},
          updated_at = NOW()
          WHERE user_id = $${i}
          RETURNING *;
        `;
      values.push(user_id);

      const result = await pool.query(sqlString, values);
      const row = result.rows[0];
      if (!row) return null;

      return mapDbRowToUserNotificationPreferences(row);
    }
  }
}

const userNotificationPreferencesColumns = `
  id,
  user_id,
  notifications_enabled,
  quiet_hours_start,
  quiet_hours_end,
  notify_window_days,
  general_notification_window_start,
  general_notification_window_end,
  daily_notification_cap,
  daily_notification_counter,
  created_at,
  updated_at
`

type UserNotificationPreferencesRow = {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  quiet_hours_start: string | null; // TIME
  quiet_hours_end: string | null;   // TIME
  notify_window_days: string[] | null;
  general_notification_window_start: string | null; // TIME
  general_notification_window_end: string | null;   // TIME
  daily_notification_cap: number;
  daily_notification_counter: number;
  created_at: Date;
  updated_at: Date;
}

function mapDbRowToUserNotificationPreferences(row: UserNotificationPreferencesRow): UserNotificationPreferences {
  return {
    id: row.id,
    user_id: row.user_id,
    notifications_enabled: row.notifications_enabled,
    quiet_hours_start: row.quiet_hours_start ?? null,
    quiet_hours_end: row.quiet_hours_end ?? null,
    notify_window_days: row.notify_window_days ?? null,
    general_notification_window_start: row.general_notification_window_start ??  null,
    general_notification_window_end: row.general_notification_window_end ?? null,
    daily_notification_cap: row.daily_notification_cap,
    daily_notification_counter: row.daily_notification_counter,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  };
}