export interface User {
  _id?: string; // MongoDB _id
  id?: string;  // Legacy id for compatibility
  username: string;
  email: string;
  email_verified?: boolean; // Email verification status
  full_name?: string;
  bio?: string;
  profile_picture?: string;
  profile_image?: string; // Alias for profile_picture to support both naming conventions
  is_active?: boolean;
  is_verified?: boolean;
  role?: string;
  provider?: string; // Authentication provider (e.g., 'email')
  has_password?: boolean; // Indicates if user can change password
  created_at: string;
  updated_at?: string;
}


// User Interests interfaces
export interface UserInterests {
  _id: string;
  user_id: string;
  interests: string[];
  created_at: string;
  updated_at: string;
}
 
export interface UserInterestsCreate {
  interests: string[];
}
 
export interface UserInterestsUpdate {
  interests: string[];
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
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
