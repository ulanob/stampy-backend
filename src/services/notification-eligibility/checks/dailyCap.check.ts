import { EligibilityCheck } from "../types";
import { toLocalDateKey } from "./utils";

function isSameLocalDay(dateA: Date, dateB: Date, timezone: string): boolean {
    return toLocalDateKey(dateA, timezone) === toLocalDateKey(dateB, timezone);
}

export const dailyCapCheck: EligibilityCheck = {
    name: "dailyCapCheck",
    check(_notifiable, preferences, context) {
        const {last_notified_date, daily_notification_cap, daily_notification_counter } = preferences;

        const sameDay = last_notified_date !== null && isSameLocalDay( last_notified_date, context.now, context.timezone);

        if(sameDay && daily_notification_counter >= daily_notification_cap) {
            return { eligible: false, reason: 'notification_cap_reached', detail: `Daily Notification Cap (${daily_notification_cap}) has been reached`};
        }

        return { eligible: true };
    }
};