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
  created_at: Date;
  updated_at: Date;
  is_archived: boolean;
}
