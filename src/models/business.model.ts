export interface Business {
  id: string;
  name: string;
  type: string;
  deleted: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

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

export type UpdateBusiness = Partial<BusinessUpdateableFields>
