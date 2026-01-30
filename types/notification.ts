export interface Notification {
  id: string;
  user_id: string;
  stamp_card_id: string | null;
  gift_card_id: string | null;
  type: string | null;
  status: string | null;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
  subject: string | null;
  body: string | null;
}
