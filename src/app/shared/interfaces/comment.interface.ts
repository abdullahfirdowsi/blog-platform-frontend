import { User } from './user.interface';

export interface Comment {
  id: string;
  content: string;
  author_id: string;
  author: User;
  post_id: string;
  parent_id?: string;
  replies?: Comment[];
  created_at: string;
  updated_at?: string;
  is_edited: boolean;
}
export interface CreateCommentRequest {
  content: string;
  post_id: string;
  parent_id?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

