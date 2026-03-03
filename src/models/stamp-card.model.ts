import { NotificationWindowDays } from "./shared.types";

export interface StampCard {
  id: string;
  user_id: string;
  business_id: string;
  location_id: string | null;
  nickname: string | null;
  notes: string | null;
  stamps_needed: number;
  stamps_acquired: number;
  notify_window_days: NotificationWindowDays | null;
  notify_window_start_time: string | null; // TIME
  notify_window_end_time: string | null;   // TIME
  notification_time_sent: Date | null;
  notification_cooldown_time: number | null;
  expiration_date: Date | null;
  deleted: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateStampCardInput = Omit<StampCard,
  "id"
  // | "user_id"
  | "created_at"
  | "updated_at"
  | "deleted"
  | "deleted_at"
>

type StampCardUpdateableFields = Pick<StampCard,
  "business_id"
  | "location_id"
  | "nickname"
  | "notes"
  | "stamps_needed"
  | "stamps_acquired"
  | "notify_window_days"
  | "notify_window_start_time"
  | "notify_window_end_time"
  | "notification_time_sent"
  | "notification_cooldown_time"
  | "expiration_date"
>

export type UpdateStampCardInput = Partial<StampCardUpdateableFields>;