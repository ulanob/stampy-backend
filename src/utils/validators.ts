import { VALID_TYPES, BusinessType } from "../models/business.model";
import { NextResponse } from "next/server";


export class AppError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidUUIDError extends AppError {
  constructor(message = "Invalid ID format") {
    super(message, 400);
  }
}

export class InvalidBusinessType extends AppError {
  constructor(message = "Invalid business type") {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

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
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  console.error(`${context} error:`, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}