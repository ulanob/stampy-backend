export class InvalidUUIDError extends Error {}

export function validateUUID(id: string): void {
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  if (!uuidRegex.test(id)) {
    throw new InvalidUUIDError("Invalid ID format");
  }
}