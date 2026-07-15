export interface StampEvent {
  id: string;
  user_id: string;
  stamp_card_id: string;
  location_id: string | null;
  quantity: number;
  created_at: Date;
}

export type CreateStampEventInput = Omit<StampEvent, 'id' | 'created_at'>;