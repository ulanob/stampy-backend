import { EligibilityCheck } from "../types";

export const notificationsEnabledCheck: EligibilityCheck = {
    name: "notificationsEnabledCheck",
    check(_notifiable, preferences, _context) {
        if (preferences.notifications_enabled === false) {
            return { eligible: false, reason: 'notifications_disabled', detail: 'User has disabled notifications'};
        }

        return { eligible: true };
    }
};