import { GiftCard } from "@/src/models/gift-card.model";
import { StampCard } from "@/src/models/stamp-card.model";
import { NotifiableCard } from "./types";
import {
  VALID_GIFT_CARD_STATUSES,
  VALID_STAMP_CARD_STATUSES,
} from "./checks/cardStatus.check";

function isRelevantStampCard(card: StampCard, businessId: string): boolean {
  if (card.business_id !== businessId) return false;
  if (!VALID_STAMP_CARD_STATUSES.includes(card.status)) return false;
  // a completed card is a reward waiting; an active card needs progress to be worth a push
  return card.status === "completed" || card.stamps_acquired > 0;
}

function isRelevantGiftCard(card: GiftCard, businessId: string): boolean {
  return (
    card.business_id === businessId &&
    VALID_GIFT_CARD_STATUSES.includes(card.status) &&
    card.current_balance > 0
  );
}

export function selectRelevantCards(
  businessId: string,
  stampCards: StampCard[],
  giftCards: GiftCard[]
): NotifiableCard[] {
  return [
    ...stampCards
      .filter((card) => isRelevantStampCard(card, businessId))
      .map((card): NotifiableCard => ({ type: "stamp_card", card })),
    ...giftCards
      .filter((card) => isRelevantGiftCard(card, businessId))
      .map((card): NotifiableCard => ({ type: "gift_card", card })),
  ];
}