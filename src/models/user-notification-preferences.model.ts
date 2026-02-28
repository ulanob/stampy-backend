export interface UserNotificationPreferences {
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

export type CreateUserNotificationPreferencesInput = Omit<UserNotificationPreferences,
  "id"
  | "user_id"
  | "created_at"
  | "updated_at"
>

type UserNotificationPreferencesUpdateableFields = Pick<UserNotificationPreferences,
  "notifications_enabled"
  | "quiet_hours_start"
  | "quiet_hours_end"
  | "general_notification_window_start"
  | "general_notification_window_end"
  | "notify_window_days"
  | "daily_notification_cap"
  | "daily_notification_counter"
>

export type UpdateUserNotificationPreferences = Partial<UserNotificationPreferencesUpdateableFields>
