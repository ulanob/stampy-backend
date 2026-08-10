export interface StampEvent {
  id: string;
  user_id: string;
  stamp_card_id: string;
  location_id: string | null;
  request_id: string;
  type: StampEventType;
  quantity: number;
  created_at: Date;
}

export const STAMP_EVENT_TYPES = [
  'stamp_added',
  'stamp_removed',
  'reward_redeemed',
  'card_expired',
  'card_deleted',
] as const;
export type StampEventType = typeof STAMP_EVENT_TYPES[number];

export type CreateStampEventInput = Omit<StampEvent, 'id' | 'created_at'>;