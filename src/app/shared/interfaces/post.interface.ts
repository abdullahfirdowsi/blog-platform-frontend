import { User } from './user.interface';
import { Comment } from './comment.interface';

export interface Post {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  slug: string;
  status: 'draft' | 'published';
  author_id: number;
  author: User;
  categories: Category[];
  tags: Tag[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  is_liked?: boolean;
  comments?: Comment[];
}

export interface CreatePostRequest {
  title: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  status: 'draft' | 'published';
  category_ids?: number[];
  tag_names?: string[];
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  excerpt?: string;
  featured_image?: string;
  status?: 'draft' | 'published';
  category_ids?: number[];
  tag_names?: string[];
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PostFilters {
  search?: string;
  category_id?: number;
  tag_id?: number;
  author_id?: number;
  status?: 'draft' | 'published';
  page?: number;
  per_page?: number;
  sort_by?: 'created_at' | 'updated_at' | 'likes_count' | 'title';
  sort_order?: 'asc' | 'desc';
}

