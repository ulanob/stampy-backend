export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  deleted: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const VALID_TYPES = ['restaurant', 'cafe', 'retail', 'other'] as const;
export type BusinessType = typeof VALID_TYPES[number];


export type CreateBusinessInput = Omit<Business,
  "id"
  | "created_at"
  | "updated_at"
  | "deleted"
  | "deleted_at"
>

type BusinessUpdateableFields = Pick<Business,
  "name"
  | "type"
>

export type UpdateBusinessInput = Partial<BusinessUpdateableFields>
