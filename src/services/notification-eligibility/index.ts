import { cardStatusCheck } from "./checks/cardStatus.check";
import { cardWindowCheck } from "./checks/cardWindow.check";
import { cooldownCheck } from "./checks/cooldown.check";
import { dailyCapCheck } from "./checks/dailyCap.check";
import { expirationCheck } from "./checks/expiration.check";
import { generalWindowCheck } from "./checks/generalWindow.check";
import { notificationsEnabledCheck } from "./checks/notificationsEnabled.check";
import { quietHoursCheck } from "./checks/quietHours.check";

export const ELIGIBILITY_CHECKS = [
  notificationsEnabledCheck,
  cardStatusCheck,
  dailyCapCheck,
  generalWindowCheck,
  quietHoursCheck,
  cardWindowCheck,
  cooldownCheck,
  expirationCheck,
];

export * from "./types";
export * from "./pipeline";