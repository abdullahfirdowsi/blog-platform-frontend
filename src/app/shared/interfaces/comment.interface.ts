import { User } from './user.interface';

export interface Comment {
  id: number;
  content: string;
  post_id: number;
  author_id: number;
  author: User;
  parent_id?: number;
  replies?: Comment[];
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  content: string;
  post_id: number;
  parent_id?: number;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

