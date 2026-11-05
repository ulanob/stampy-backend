import { describe, it, expect } from "vitest";
import { NOTIFICATION_STATUSES } from "../../models/notification.model";
import { validateNotificationStatus, ValidationError } from "../../utils/validators";

describe("validateNotificationStatus", () => {
  it.each(NOTIFICATION_STATUSES)("accepts %s", (status) => {
    expect(() => validateNotificationStatus(status)).not.toThrow();
  });

  it.each(["banana", "", "SENT", "pending "])("rejects %j", (value) => {
    expect(() => validateNotificationStatus(value)).toThrow(ValidationError);
  });
});