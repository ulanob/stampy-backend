import { EligibilityCheck } from "../types";
import { toLocalDateKey } from "./utils";

export const expirationCheck: EligibilityCheck = {
    name: "expirationCheck",
    check(notifiable, _preferences, context) {

        if (notifiable.card.expiration_date !== null) {

            const expiredKey = toLocalDateKey(notifiable.card.expiration_date, context.timezone);
            const todayKey = toLocalDateKey(context.now, context.timezone);

            if (expiredKey < todayKey) { 
                return { eligible: false, reason: 'expired_card', detail: `Card Expired on ${expiredKey}`};
            }
        }

        return { eligible: true };
    }
};