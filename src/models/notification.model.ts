export interface Notification {
  id: string;
  user_id: string;
  stamp_card_id: string | null;
  gift_card_id: string | null;
  location_id: string | null;
  type: string;
  status: string;
  sent_at: Date | null;
  subject: string | null;
  body: string | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateNotificationInput = Omit<Notification,
  "id"
  | "user_id"
  | "status"
  | "sent_at"
  | "created_at"
  | "updated_at"
>;

type NotificationUpdateableFields = Pick<Notification,
  "status"
>

export type UpdateNotificationInput = Partial<NotificationUpdateableFields>;