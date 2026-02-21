export interface Notification {
  id: string;
  user_id: string;
  stamp_card_id: string | null;
  gift_card_id: string | null;
  type: string | null;
  status: string | null;
  sent_at: Date | null;
  subject: string | null;
  body: string | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateNotificationInput = Omit<Notification,
  "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "is_archived"
>

type NotificationUpdateableFields = Pick<Notification,
  "type"
  | "status"
  | "subject"
  | "body"
>

export type UpdateNotificationInput = Partial<NotificationUpdateableFields>;