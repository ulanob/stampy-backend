export interface GiftCardEvent {
  id: string;
  user_id: string;
  gift_card_id: string;
  location_id: string | null;
  request_id: string;
  type: GiftCardEventType;
  amount: number;
  created_at: Date;
}

export const GIFT_CARD_EVENT_TYPES = [
  'balance_added',
  'balance_redeemed',
  'card_expired',
  'card_deleted',
] as const;
export type GiftCardEventType = typeof GIFT_CARD_EVENT_TYPES[number];

export type CreateGiftCardEventInput = Omit<GiftCardEvent, 'id' | 'created_at'>;