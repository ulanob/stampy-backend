import { EligibilityCheck } from "../types";

export const cooldownCheck: EligibilityCheck = {
    name: "cooldownCheck",
    check(notifiable, _preferences, context) {
        const checkInTimeInSecs = context.now.getTime() / 1000;
        const lastTimeSentInSecs = notifiable.card.notification_time_sent ? notifiable.card.notification_time_sent.getTime() / 1000 : null;

        const cooldownTime = notifiable.card.notification_cooldown_seconds;

        if (cooldownTime !== null && lastTimeSentInSecs !== null) {
            const elapsedTimeInSecs = checkInTimeInSecs - lastTimeSentInSecs;
            
            if (cooldownTime > elapsedTimeInSecs) {
                return { eligible: false, reason: 'still_in_cooldown', detail: `Card is still in cooldown, ${Math.round(cooldownTime - elapsedTimeInSecs)} seconds` };
            }

        }
        
        return { eligible: true };
    }
};