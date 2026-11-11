import { describe, it, expect } from "vitest";
import { validatePositiveNumber } from "../../services/helpers.service";
import { ValidationError } from "../../utils/validators";

describe("validatePositiveNumber", () => {
  it.each([1, 5.5, 0.01, 1_000_000])("accepts %s", (value) => {
    expect(() => validatePositiveNumber(value, "amount")).not.toThrow();
  });

  it.each([0, -1, -0.01, NaN, Infinity, -Infinity, "5", "abc", null, undefined, {}, true])(
    "rejects %s",
    (value) => {
      expect(() => validatePositiveNumber(value, "amount")).toThrow(ValidationError);
    }
  );

  it("includes the field name in the error message", () => {
    expect(() => validatePositiveNumber(0, "quantity")).toThrow("quantity must be a positive number");
  });
});