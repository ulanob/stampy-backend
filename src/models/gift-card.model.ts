import { NotificationWindowDays } from "./shared.types";

export interface GiftCard {
  id: string;
  user_id: string;
  business_id: string;
  nickname: string | null;
  notes: string | null;
  current_balance: number;
  currency: string;
  status: GiftCardStatus;
  notify_window_days: NotificationWindowDays | null;
  notify_window_start_time: string | null;
  notify_window_end_time: string | null;
  notification_time_sent: Date | null;
  notification_cooldown_seconds: number | null;
  expiration_date: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
  deleted_at: Date | null;
}

export const GIFT_CARD_STATUSES = ['active', 'cancelled', 'expired'] as const;
export type GiftCardStatus = typeof GIFT_CARD_STATUSES[number];

export type CreateGiftCardInput = Omit<GiftCard,
  "id"
  | "created_at"
  | "updated_at"
  | "deleted"
  | "deleted_at"
> & {
  current_balance?: number;
};

export type CreateGiftCardRequestBody = CreateGiftCardInput & {
  amount: number;
  location_id?: string | null;
  request_id: string;
};

type GiftCardUpdateableFields = Pick<GiftCard,
  "nickname"
  | "notes"
  | "status"
  | "notify_window_days"
  | "notify_window_start_time"
  | "notify_window_end_time"
  | "notification_time_sent"
  | "notification_cooldown_seconds"
  | "expiration_date"
>

export type UpdateGiftCardInput = Partial<GiftCardUpdateableFields>;