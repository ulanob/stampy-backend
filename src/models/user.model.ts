export interface User {
  id: string;
  display_name: string | null;
  email: string;
  auth_provider_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
  deleted_at: Date | null;
}

export type CreateUserInput = Omit<User,
  "id"
  | "created_at"
  | "updated_at"
  | "deleted"
  | "deleted_at"

>

type UserUpdateableFields = Pick<User,
  "display_name"
  | "email"
  | "auth_provider_id"
>

export type UpdateUserInput = Partial<UserUpdateableFields>;