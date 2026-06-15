export interface StampEvent {
  id: string;
  user_id: string;
  stamp_card_id: string;
  quantity: number;
  created_at: Date;
}

export type CreateStampEventInput = Omit<StampEvent, 'id' | 'created_at'>;