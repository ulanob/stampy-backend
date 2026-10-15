import { EligibilityCheck } from "../types";
import { getLocalDayAndMinutes, postgresTimeToMinutes } from "./utils";

export const generalWindowCheck: EligibilityCheck = {
    name: "generalWindowCheck",
    check(_notifiable, preferences, context) {
        const dayAndMinutes = getLocalDayAndMinutes(context.now, context.timezone);
        
        const dayOfWeek = dayAndMinutes.dayOfWeek;
        const timeInMinutes = dayAndMinutes.minutes;

        const windowStart = preferences.general_notification_window_start === null
            ? 0 : postgresTimeToMinutes(preferences.general_notification_window_start);
        
        const windowEnd = preferences.general_notification_window_end === null
            ? 1439 : postgresTimeToMinutes(preferences.general_notification_window_end);

        if (preferences.notify_window_days !== null && !preferences.notify_window_days.includes(dayOfWeek)) {
            return { eligible: false, reason: "general_window_invalid", detail: "Invalid: outside user's Day of Week preference window"};
        }

        if (windowStart > timeInMinutes) {
            return { eligible: false, reason: "general_window_invalid", detail: "Invalid: outside user's Time of Day preference window - before window"};
        }

        if (windowEnd < timeInMinutes) {
            return { eligible: false, reason: "general_window_invalid", detail: "Invalid: outside user's Time of Day preference window - after window"};
        }

        return { eligible: true };
    }
};