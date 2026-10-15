import { DAY_OF_WEEK } from "@/src/models/shared.types";

export function toLocalDateKey(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // "2026-10-06"
}

export function getLocalDayAndMinutes(now: Date, timezone: string): { dayOfWeek: DAY_OF_WEEK; minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
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

export function postgresTimeToMinutes(timeStr: string): number {
  // 1. Split the "HH:MM:SS" or "HH:MM" string
  const [hoursStr, minutesStr] = timeStr.split(':');

  // 2. Convert to numbers (fallback to 0 if the string format is unexpected)
  const hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;

  // 3. Return total minutes from midnight
  return (hours * 60) + minutes;
}