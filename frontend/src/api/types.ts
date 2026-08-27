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

export interface ApiError {
  detail: string;
}
