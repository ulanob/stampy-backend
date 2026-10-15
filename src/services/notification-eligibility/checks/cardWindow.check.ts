import { EligibilityCheck } from "../types";
import { getLocalDayAndMinutes, postgresTimeToMinutes } from "./utils";

export const cardWindowCheck: EligibilityCheck = {
    name: "cardWindowCheck",
    check(notifiable, _preferences, context) {
        const dayAndMinutes = getLocalDayAndMinutes(context.now, context.timezone);

        const dayOfWeek = dayAndMinutes.dayOfWeek;
        const timeInMinutes = dayAndMinutes.minutes;

        const windowStart = notifiable.card.notify_window_start_time === null
            ? 0 : postgresTimeToMinutes(notifiable.card.notify_window_start_time);
        
        const windowEnd = notifiable.card.notify_window_end_time === null
            ? 1439 : postgresTimeToMinutes(notifiable.card.notify_window_end_time);
            

        if (notifiable.card.notify_window_days !== null && !notifiable.card.notify_window_days.includes(dayOfWeek)) {
            return { eligible: false, reason: "card_window_invalid", detail: "Invalid: outside Day of Week window"};
        }

        if (windowStart > timeInMinutes) {
            return { eligible: false, reason: "card_window_invalid", detail: "Invalid: outside Time of Day window - before window"};
        }

        if (windowEnd < timeInMinutes) {
            return { eligible: false, reason: "card_window_invalid", detail: "Invalid: outside Time of Day window - after window"};
        }

        return { eligible: true };
    }
};