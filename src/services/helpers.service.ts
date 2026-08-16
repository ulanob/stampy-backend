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

export function validateCoordinates(lat: number, lng: number): void {
  // validate lat & lng, 0 value edge case
  if (lat === undefined || lng === undefined) {
    throw new ValidationError('lat & lng need to be updated at the same time')
  }
  
  if (lat < -90 || lat > 90) {
    throw new ValidationError('Latitude must be between -90 and 90');
  }

  if (lng < -180 || lng > 180) {
    throw new ValidationError('Longitude must be between -180 and 180');
  }
}

export function validateRadius(radius: number): void {
  if (radius <= 0) throw new ValidationError('geofence_radius must be positive');
}