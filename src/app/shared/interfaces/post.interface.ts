import { User } from './user.interface';
import { Comment } from './comment.interface';

// MongoDB Blog Structure
export interface Blog {
  _id: string;
  user_id: string;
  username:string;
  title: string;
  content: string;
  tags: string[];  // Changed from tag_ids to tags to match backend
  main_image_url?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  // Populated fields
  user?: User;
  views?: number;
  likes_count?: number;
  comment_count?: number;
}

// Tag structure
export interface Tag {
  _id: string;
  name: string;
  description?: string;
  created_at: string;
}

// Legacy Post interface for compatibility
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

// Blog response interfaces for MongoDB
export interface BlogSummary {
  _id: string;
  username?: string;
  title: string;
  content?: string;
  main_image_url?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  // Populated fields
  user?: Pick<User, '_id' | 'username' | 'profile_picture'>;
  tags?: Pick<Tag, '_id' | 'name'>[] | string[];  // Can be tag objects or tag names
  views?: number;
  likes_count?: number;
  comment_count?: number;
}

export interface BlogsResponse {
  blogs: BlogSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// AI Summary interface
export interface AiSummary {
  _id: string;
  blog_id: string;
  summary: string;
  created_at: string;
}

// AI Summary creation request interface
export interface AiSummaryCreate {
  blog_id: string;
  blog_title: string;
  blog_content: string;
}

export interface CreateBlogRequest {
  title: string;
  content: string;
  tags?: string[];  // Changed from tag_ids to tags to match backend
  main_image_url?: string;
  published?: boolean;
}

export interface UpdateBlogRequest {
  title?: string;
  content?: string;
  tags?: string[];  // Changed from tag_ids to tags to match backend
  main_image_url?: string;
  published?: boolean;
}

export interface BlogFilters {
  page?: number;
  limit?: number;
  published?: boolean;
  tags?: string;
  search?: string;
  user_id?: string;
}

// Legacy filters for compatibility
export interface PostFilters {
  page?: number;
  limit?: number;
  status?: 'draft' | 'published' | 'all';
  category?: string;
  tags?: string;
  search?: string;
  author_id?: string;
}

export interface PostSummary {
  id: string;
  title: string;
  username?: string; // Optional for legacy compatibility
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
  comment_count: number;
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

