import { EligibilityCheck } from "../types";

function isSameLocalDay(dateA: Date, dateB: Date, timezone: string): boolean {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    return formatter.format(dateA) === formatter.format(dateB);
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