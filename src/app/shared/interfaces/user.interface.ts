export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  bio?: string;
  profile_picture?: string;
  profile_image?: string; // Alias for profile_picture to support both naming conventions
  is_active: boolean;
  is_verified?: boolean;
  role: string;
  provider?: string; // Authentication provider (e.g., 'google', 'email')
  created_at: string;
  updated_at?: string;
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
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface GoogleAuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface UpdateUserRequest {
  full_name?: string;
  bio?: string;
  profile_picture?: string;
  profile_image?: string; // Alias for profile_picture to support both naming conventions
  username?: string;
  email?: string;
}

export interface UserProfile {
  user: User;
  posts_count: number;
  published_posts_count: number;
  draft_posts_count: number;
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
