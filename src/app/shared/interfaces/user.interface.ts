export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  bio?: string;
  profile_image?: string;
  is_active: boolean;
  is_verified: boolean;
  provider?: 'email' | 'google';
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  confirm_password?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
  expires_in?: number;
}

export interface GoogleAuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  expires_in?: number;
}

export interface UpdateUserRequest {
  full_name?: string;
  bio?: string;
  profile_image?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
  confirm_password: string;
}

export interface AuthError {
  message: string;
  field?: string;
  code?: string;
}
