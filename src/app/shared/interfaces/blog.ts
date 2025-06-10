import { PostSummary } from "./post.interface";

// Add these interfaces to your types file
export interface BlogResponse {
  id: string;
  user_id: string;
  username?: string;  // Optional if not always included
  title: string;
  content: string;
  tags: string[];
  main_image_url: string | null;
  published: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  comment_count: number;
  likes_count: number;
  // SEO fields
  meta_title?: string;
  meta_description?: string;
  // Status fields
  status?: 'draft' | 'published' | 'archived';
  // Engagement metrics
  view_count?: number;
  reading_time?: number; // in minutes
  // Relationships
  author?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  // Frontend-specific fields
  is_liked?: boolean;
  is_bookmarked?: boolean;
}

export interface SearchBlogsResponse {
  blogs: (BlogResponse | { blog: BlogResponse, relevance_score: number })[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PostsResponse {
  posts: PostSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}