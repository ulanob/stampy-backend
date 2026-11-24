import { EligibilityCheck } from "../types";

export const DEFAULT_COOLDOWN_SECONDS = 3 * 60 * 60;

export const cooldownCheck: EligibilityCheck = {
    name: "cooldownCheck",
    check(notifiable, _preferences, context) {
        const { notification_time_sent, notification_cooldown_seconds } = notifiable.card;

        // never notified before: nothing to cool down from
        if (notification_time_sent === null) return { eligible: true };

        const cooldownSecs = notification_cooldown_seconds ?? DEFAULT_COOLDOWN_SECONDS;
        const elapsedSecs = (context.now.getTime() - notification_time_sent.getTime()) / 1000;

        if (cooldownSecs > elapsedSecs) {
            return {
                eligible: false,
                reason: "still_in_cooldown",
                detail: `Card is still in cooldown, ${Math.round(cooldownSecs - elapsedSecs)} seconds`,
            };
        }

        return { eligible: true };
    },
};