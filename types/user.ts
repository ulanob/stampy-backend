export interface User {
  id: string;
  display_name: string | null;
  email: string;
  auth_provider_id: string | null;
  created_at: Date;
  updated_at: Date;
  is_archived: boolean;
}
