import { GiftCardStatus } from "@/src/models/gift-card.model";
import { EligibilityCheck } from "../types";
import { StampCardStatus } from "@/src/models/stamp-card.model";

const VALID_GIFT_CARD_STATUSES: GiftCardStatus[] = ['active'];
const VALID_STAMP_CARD_STATUSES: StampCardStatus[] = ['active', 'completed'];

export const cardStatusCheck: EligibilityCheck = {
    name: "cardStatusCheck",
    check(notifiable, _preferences, _context) {
        switch (notifiable.type) {
            case 'gift_card':
                if (!VALID_GIFT_CARD_STATUSES.includes(notifiable.card.status)) {
                    return { eligible: false, reason: 'invalid_status', detail: `Invalid Status on Gift Card: ${notifiable.card.status}` };
                }
                break;
            case 'stamp_card':
                if (!VALID_STAMP_CARD_STATUSES.includes(notifiable.card.status)) {
                    return { eligible: false, reason: 'invalid_status', detail: `Invalid Status on Stamp Card: ${notifiable.card.status}` };
                }
                break;
        }

        return { eligible: true };
    }
};