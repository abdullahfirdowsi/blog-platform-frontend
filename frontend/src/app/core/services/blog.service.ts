import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  BlogsResponse, 
  BlogFilters, 
  BlogSummary, 
  Blog,
  CreateBlogRequest,
  UpdateBlogRequest,
  Tag,
  PostsResponse, 
  PostFilters,
  PostSummary 
} from '../../shared/interfaces/post.interface';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Get all blogs with filters (MongoDB)
  getBlogs(filters?: BlogFilters): Observable<BlogsResponse> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.published !== undefined) params = params.set('published', filters.published.toString());
      if (filters.tag_ids) params = params.set('tag_ids', filters.tag_ids);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.user_id) params = params.set('user_id', filters.user_id);
    }

    return this.http.get<BlogsResponse>(`${this.apiUrl}/blogs`, { params });
  }

  // Get all available tags (MongoDB)
  getTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}/tags`);
  }

  // Get tag names only
  getTagNames(): Observable<string[]> {
    return this.getTags().pipe(
      map(tags => tags.map(tag => tag.name))
    );
  }

  // Search blogs
  searchBlogs(query: string, page = 1, limit = 10): Observable<BlogsResponse> {
    const params = new HttpParams()
      .set('search', query)
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('published', 'true');

    return this.http.get<BlogsResponse>(`${this.apiUrl}/blogs`, { params });
  }

  // Get blogs by tag
  getBlogsByTag(tagName: string, page = 1, limit = 10): Observable<BlogsResponse> {
    const params = new HttpParams()
      .set('tag_name', tagName)
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('published', 'true');

    return this.http.get<BlogsResponse>(`${this.apiUrl}/blogs`, { params });
  }

  // Get single blog by ID
  getBlogById(id: string): Observable<BlogSummary> {
    return this.http.get<BlogSummary>(`${this.apiUrl}/blogs/${id}`);
  }

  // Legacy methods for compatibility
  getPosts(filters?: PostFilters): Observable<PostsResponse> {
    // Convert new blog structure to legacy post structure
    const blogFilters: BlogFilters = {
      page: filters?.page,
      limit: filters?.limit,
      published: filters?.status === 'published' ? true : filters?.status === 'draft' ? false : undefined,
      search: filters?.search,
      user_id: filters?.author_id
    };

    return this.getBlogs(blogFilters).pipe(
      map(blogResponse => {
        const posts: PostSummary[] = blogResponse.blogs.map(blog => ({
          id: blog.id,
          title: blog.title,
          excerpt: this.generateExcerpt(blog.content),
          slug: this.generateSlug(blog.title),
          status: blog.published ? 'published' : 'draft',
          featured_image: blog.main_image_url,
          author_id: blog.user_id,
          author: {
            id: blog.user_id,
            username: 'Unknown',
            profile_picture: undefined
          },
          tags: blog.tags,
          views: 0,
          likes_count: blog.likes_count,
          comments_count: blog.comment_count,
          is_liked: false,
          created_at: blog.created_at,
          updated_at: blog.updated_at
        }));

        return {
          posts,
          total: blogResponse.total,
          page: blogResponse.page,
          limit: blogResponse.limit,
          total_pages: blogResponse.total_pages
        };
      })
    );
  }

  searchPosts(query: string, page = 1, limit = 10): Observable<PostsResponse> {
    return this.searchBlogs(query, page, limit).pipe(
      map(blogResponse => this.convertBlogsToPostsResponse(blogResponse))
    );
  }

  getPostsByTag(tag: string, page = 1, limit = 10): Observable<PostsResponse> {
    return this.getBlogsByTag(tag, page, limit).pipe(
      map(blogResponse => this.convertBlogsToPostsResponse(blogResponse))
    );
  }

  // Helper methods
  private generateExcerpt(content: string | undefined, length = 150): string {
    if (!content) return '';
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.length > length ? textContent.substring(0, length) + '...' : textContent;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private convertBlogsToPostsResponse(blogResponse: BlogsResponse): PostsResponse {
    const posts: PostSummary[] = blogResponse.blogs.map(blog => ({
      id: blog.id,
      title: blog.title,
      excerpt: this.generateExcerpt(blog.content),
      slug: this.generateSlug(blog.title),
      status: blog.published ? 'published' : 'draft',
      featured_image: blog.main_image_url,
      author_id: blog.user_id,
      author: {
        id: blog.user_id,
        username: 'Unknown',
        profile_picture: undefined
      },
      tags: blog.tags,
      views: 0,
      likes_count: blog.likes_count,
      comments_count: blog.comment_count,
      is_liked: false,
      created_at: blog.created_at,
      updated_at: blog.updated_at
    }));

    return {
      posts,
      total: blogResponse.total,
      page: blogResponse.page,
      limit: blogResponse.limit,
      total_pages: blogResponse.total_pages
    };
  }

  // Create new blog
  createBlog(blogData: CreateBlogRequest): Observable<Blog> {
    return this.http.post<Blog>(`${this.apiUrl}/blogs`, blogData);
  }

  // Update existing blog
  updateBlog(blogId: string, blogData: UpdateBlogRequest): Observable<Blog> {
    return this.http.put<Blog>(`${this.apiUrl}/blogs/${blogId}`, blogData);
  }

  // Delete blog
  deleteBlog(blogId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/blogs/${blogId}`);
  }

  // Get user's blogs (both published and drafts)
  getMyBlogs(page = 1, limit = 10): Observable<Blog[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    return this.http.get<BlogsResponse>(`${this.apiUrl}/blogs`, { params }).pipe(
      map(response => response.blogs.map(blog => this.convertBlogSummaryToBlog(blog)))
    );
  }

  private convertBlogSummaryToBlog(summary: BlogSummary): Blog {
    return {
      _id: summary.id,
      user_id: summary.user_id,
      title: summary.title,
      content: summary.content,
      tag_ids: summary.tags,
      main_image_url: summary.main_image_url,
      published: summary.published,
      created_at: summary.created_at,
      updated_at: summary.updated_at,
      tags: summary.tags.map(tag => ({ _id: tag, name: tag, created_at: new Date().toISOString() }))
    };
  }

  // Save blog as draft
  saveDraft(blogData: CreateBlogRequest): Observable<Blog> {
    return this.createBlog({ ...blogData, published: false });
  }

  // Publish blog
  publishBlog(blogData: CreateBlogRequest): Observable<Blog> {
    return this.createBlog({ ...blogData, published: true });
  }
}

