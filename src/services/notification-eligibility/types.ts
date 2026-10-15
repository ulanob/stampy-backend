import { StampCard } from "@/src/models/stamp-card.model";
import { GiftCard } from "@/src/models/gift-card.model";
import { UserNotificationPreferences } from "@/src/models/user-notification-preferences.model";

export type NotifiableCard = { type: "gift_card"; card: GiftCard } | { type: "stamp_card"; card: StampCard };

export type EligibilityResult = { eligible: true } | { eligible: false; reason: string; detail?: string };

export type EligibilityContext = {
  now: Date;
  location_id: string;
  timezone: string;
};

export interface EligibilityCheck {
    readonly name: string;
    check(
        notifiable: NotifiableCard,
        preferences: UserNotificationPreferences,
        context: EligibilityContext
    ): EligibilityResult
}

