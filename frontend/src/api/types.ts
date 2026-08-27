export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  role_id: number | null;
  role: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role_id?: number | null;
  is_active?: boolean;
  is_superuser?: boolean;
}

export interface UserUpdate {
  email?: string;
  username?: string;
  full_name?: string;
  role_id?: number | null;
  is_active?: boolean;
  is_superuser?: boolean;
}

export interface Permission {
  id: number;
  name: string;
  description: string | null;
  module: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export interface RoleCreate {
  name: string;
  description?: string | null;
  permission_ids: number[];
}

export interface RoleUpdate {
  name?: string;
  description?: string | null;
  permission_ids?: number[];
}

export interface ApiError {
  detail: string;
}
