export interface User {
  id: string;
  display_name: string | null;
  email: string | null;
  auth_provider_id: string | null;
  timezone: string;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
  deleted_at: Date | null;
}

export type CreateUserInput = Omit<
  User,
  'id' | 'created_at' | 'updated_at' | 'deleted' | 'deleted_at' | 'email'
> & {
  email?: string | null;
};

type UserUpdateableFields = Pick<User, 'display_name' | 'timezone'>;

export type UpdateUserInput = Partial<UserUpdateableFields>;
