import { NotFoundError, ValidationError } from "../utils/validators";

export async function assertExists(
  getter: () => Promise<unknown | null>,
  errorMessage: string
): Promise<void> {
  const result = await getter();
  if (!result) throw new NotFoundError(errorMessage);
}

export function requireFields<T extends object>(fields: T, required: (keyof T)[]): void {
  for (const field of required) {
    if (fields[field] === undefined || fields[field] === null) {
      throw new ValidationError(`Missing required field: ${String(field)}`);
    }
  }
}