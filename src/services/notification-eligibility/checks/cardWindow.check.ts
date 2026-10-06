import { DAY_OF_WEEK } from "@/src/models/shared.types";
import { EligibilityCheck } from "../types";

function getLocalDayAndMinutes(now: Date, timezone: string): { dayOfWeek: DAY_OF_WEEK; minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  
  const dayStr = parts.find(part => part.type === 'weekday')?.value.toLowerCase() as DAY_OF_WEEK;
  const hourStr = parts.find(part => part.type === 'hour')?.value || '0';
  const minuteStr = parts.find(part => part.type === 'minute')?.value || '0';
  
  const hours = parseInt(hourStr, 10) % 24;
  const minutes = parseInt(minuteStr, 10);

  const totalMinutes = (hours * 60) + minutes;

  return {
    dayOfWeek: dayStr,
    minutes: totalMinutes
  };
}

function postgresTimeToMinutes(timeStr: string): number {
  // 1. Split the "HH:MM:SS" or "HH:MM" string
  const [hoursStr, minutesStr] = timeStr.split(':');

  // 2. Convert to numbers (fallback to 0 if the string format is unexpected)
  const hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;

  // 3. Return total minutes from midnight
  return (hours * 60) + minutes;
}



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