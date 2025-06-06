import { User } from './user.interface';
import { Comment } from './comment.interface';

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  slug: string;
  status: 'draft' | 'published';
  author_id: string;
  author: User;
  category?: string;
  tags: string[];
  meta_description?: string;
  meta_keywords?: string;
  views: number;
  likes_count: number;
  liked_by: string[];
  comments_count: number;
  created_at: string;
  updated_at?: string;
  published_at?: string;
  is_liked?: boolean;
  comments?: Comment[];
}

export interface CreatePostRequest {
  title: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  status: 'draft' | 'published';
  category?: string;
  tags?: string[];
  meta_description?: string;
  meta_keywords?: string;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  excerpt?: string;
  featured_image?: string;
  status?: 'draft' | 'published';
  category?: string;
  tags?: string[];
  meta_description?: string;
  meta_keywords?: string;
}

export interface PostSummary {
  id: string;
  title: string;
  excerpt?: string;
  slug: string;
  status: 'draft' | 'published';
  featured_image?: string;
  author_id: string;
  author: Pick<User, 'id' | 'username' | 'profile_picture'>;
  category?: string;
  tags: string[];
  views: number;
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
  created_at: string;
  updated_at?: string;
  published_at?: string;
}

export interface PostsResponse {
  posts: PostSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PostFilters {
  page?: number;
  limit?: number;
  status?: 'draft' | 'published' | 'all';
  category?: string;
  tags?: string;
  search?: string;
  author_id?: string;
}

