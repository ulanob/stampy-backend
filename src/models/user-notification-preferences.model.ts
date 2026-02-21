export interface UserNotificationPreferences {
  id: string;
  user_id: string;
  general_notification_window_start: Date | null;
  general_notification_window_end: Date | null;
  notify_window_days: string[] | null;
  notifications_enabled: boolean;
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
  "general_notification_window_start"
  | "general_notification_window_end"
  | "notify_window_days"
  | "notifications_enabled"
>

export type UpdateUserNotificationPreferences = Partial<UserNotificationPreferencesUpdateableFields>
