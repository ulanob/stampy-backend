export interface Location {
  id: string;
  business_id: string;
  address: string;
  lat: number;
  lng: number;
  geofence_radius: number;
  deleted: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateLocationInput = Omit<Location,
  "id"
  | "created_at"
  | "updated_at"
  | "deleted"
  | "deleted_at"
>

type LocationUpdateableFields = Pick<Location,
  "address"
  | "lat"
  | "lng"
  | "geofence_radius"
>

export type UpdateLocationInput = Partial<LocationUpdateableFields>
