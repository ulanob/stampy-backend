export interface StampCard {
  id: string;
  user_id: string;
  nickname: string | null;
  vendor_place_id: string | null;
  vendor_name: string | null;
  vendor_address: string | null;
  vendor_lat: number | null;
  vendor_lng: number | null;
  geofence_radius: number | null;
  notify_window_days: string[] | null;
  notify_window_start_time: Date | null;
  notify_window_end_time: Date | null;
  notification_time_sent: Date | null;
  notification_cooldown_time: number | null;
  notes: string | null;
  stamps_needed: number;
  stamps_acquired: number;
  expiration_date: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
  deleted_at: Date | null;
}

export type CreateStampCardInput = Omit<StampCard,
  "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "is_archived"
>

type StampCardUpdateableFields = Pick<StampCard,
  "nickname"
  | "vendor_place_id"
  | "vendor_name"
  | "vendor_address"
  | "vendor_lat"
  | "vendor_lng"
  | "geofence_radius"
  | "notify_window_days"
  | "notify_window_start_time"
  | "notify_window_end_time"
  | "notes"
  | "stamps_needed"
  | "stamps_acquired"
  | "expiration_date"
>

export type UpdateStampCardInput = Partial<StampCardUpdateableFields>;