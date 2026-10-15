import { EligibilityCheck, EligibilityContext, EligibilityResult, NotifiableCard } from "./types";
import { UserNotificationPreferences } from "@/src/models/user-notification-preferences.model";

export function evaluateEligibility(
    notifiable: NotifiableCard,
    preferences: UserNotificationPreferences,
    context: EligibilityContext,
    checks: EligibilityCheck[]
): EligibilityResult {
    for (const check of checks) {
        const result = check.check(notifiable, preferences, context);
        if (!result.eligible) return result;
    }

    return { eligible: true };
}