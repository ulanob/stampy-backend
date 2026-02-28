export interface GiftCard {
  id: string;
  user_id: string;
  business_id: string;
  location_id: string;
  nickname: string | null;
  notes: string | null;
  initial_balance: number;
  current_balance: number;
  currency: string;
  notify_window_days: string[] | null;
  notify_window_start_time: string | null;
  notify_window_end_time: string | null;
  notification_time_sent: Date | null;
  notification_cooldown_time: number | null;
  expiration_date: Date | null;
  deleted: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateGiftCardInput = Omit<GiftCard,
  "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "deleted"
  | "deleted_at"
>

type GiftCardUpdateableFields = Pick<GiftCard,
  "business_id"
  | "location_id"
  | "nickname"
  | "notes"
  | "initial_balance"
  | "current_balance"
  | "currency"
  | "notify_window_days"
  | "notify_window_start_time"
  | "notify_window_end_time"
  | "notification_time_sent"
  | "notification_cooldown_time"
  | "expiration_date"
>

export type UpdateGiftCardInput = Partial<GiftCardUpdateableFields>;