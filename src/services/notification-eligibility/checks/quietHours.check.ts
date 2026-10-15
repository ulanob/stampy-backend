import { EligibilityCheck } from "../types";
import { getLocalDayAndMinutes, postgresTimeToMinutes } from "./utils";

// start > end means the window wraps past midnight
// start === end is treated as "no window" - eligible
function isWithinWindow(start: number, end: number, now: number): boolean {
  if (start === end) return false;

  return start < end
    ? now >= start && now < end   // same-day window
    : now >= start || now < end;  // overnight window
}

export const quietHoursCheck: EligibilityCheck = {
  name: "quietHoursCheck",
  check(_notifiable, preferences, context) {
    const { quiet_hours_start, quiet_hours_end } = preferences;

    if (quiet_hours_start === null || quiet_hours_end === null) {
      return { eligible: true };
    }

    const { minutes } = getLocalDayAndMinutes(context.now, context.timezone);
    const start = postgresTimeToMinutes(quiet_hours_start);
    const end = postgresTimeToMinutes(quiet_hours_end);

    if (isWithinWindow(start, end, minutes)) {
      return {
        eligible: false,
        reason: "within_user_quiet_window",
        detail: `Within user's quiet window of ${quiet_hours_start} and ${quiet_hours_end}`,
      };
    }

    return { eligible: true };
  },
};