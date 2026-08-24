export interface StampCardEvent {
  id: string;
  user_id: string;
  stamp_card_id: string;
  location_id: string | null;
  request_id: string;
  type: StampCardEventType;
  quantity: number;
  created_at: Date;
}

export const STAMP_CARD_EVENT_TYPES = [
  'stamp_added',
  'stamp_removed',
  'reward_redeemed',
  'card_expired',
  'card_deleted',
] as const;
export type StampCardEventType = typeof STAMP_CARD_EVENT_TYPES[number];

export type CreateStampCardEventInput = Omit<StampCardEvent, 'id' | 'created_at'>;