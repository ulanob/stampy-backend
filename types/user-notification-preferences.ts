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
