import { validTypes, BusinessType } from "../models/business.model";

export class InvalidUUIDError extends Error {}
export class InvalidBusinessType extends Error {}

export function validateUUID(id: string): void {
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  if (!uuidRegex.test(id)) {
    throw new InvalidUUIDError("Invalid ID format");
  }
}

export function validateBusinessType(value: string): asserts value is BusinessType {
    if (!validTypes.includes(value as BusinessType)) {
      throw new InvalidBusinessType();
    }
} 