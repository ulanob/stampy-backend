import { VALID_TYPES, BusinessType } from "../models/business.model";
import { NextResponse } from "next/server";


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
    if (!VALID_TYPES.includes(value as BusinessType)) {
      throw new InvalidBusinessType();
    }
} 

export function handleRouteError(error: unknown, context: string): NextResponse {
  if (error instanceof InvalidUUIDError) {
    return NextResponse.json({ error: "Invalid id format" }, { status: 400 });
  }
  if (error instanceof InvalidBusinessType) {
    return NextResponse.json({ error: "Invalid business type" }, { status: 400 });
  }
  console.error(`${context} error:`, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}