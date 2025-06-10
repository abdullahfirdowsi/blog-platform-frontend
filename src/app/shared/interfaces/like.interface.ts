// Like interfaces matching backend format
export interface Like {
  _id: string;
  blog_id: string;
  user_id: string;
  created_at: string;
}

export interface LikeResponse {
  _id?: string;
  blog_id?: string;
  user_id?: string;
  created_at?: string;
  message?: string;
}

