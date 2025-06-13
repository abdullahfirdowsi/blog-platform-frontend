import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
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
import { SearchBlogsResponse } from '../../shared/interfaces/blog';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private apiUrl = environment.apiUrl;
  private userCache = new Map<string, any>();

  constructor(private http: HttpClient, private authService: AuthService) {}

  // Get all blogs with filters (MongoDB)
  getBlogs(filters?: BlogFilters): Observable<BlogsResponse> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.published !== undefined) params = params.set('published_only', filters.published.toString());
      if (filters.tags) params = params.set('tags', filters.tags);
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
  searchBlogs(query: string, page = 1, limit = 10): Observable<SearchBlogsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', limit.toString());

    const searchUrl = `${this.apiUrl}/blogs/search/${encodeURIComponent(query)}`;
    console.log('🔍 Search API call:', { 
      url: searchUrl, 
      params: params.toString(), 
      query,
      encodedQuery: encodeURIComponent(query)
    });
    
    return this.http.get<SearchBlogsResponse>(searchUrl, { params }).pipe(
      map(response => {
        console.log('🔍 Raw search response:', response);
        return response;
      }),
      catchError(error => {
        console.error('🔍 Search API error:', error);
        throw error;
      })
    );
  }

  // Get blogs by tag
  getBlogsByTag(tagName: string, page = 1, limit = 10): Observable<BlogsResponse> {
    const params = new HttpParams()
      .set('tags', tagName)
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('published_only', 'true');

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
      switchMap(blogResponse => {
        const blogs = blogResponse.blogs.filter(blog => blog && blog._id);
        
        // Get unique user IDs that need to be fetched
        const userIds = [...new Set(blogs.map(blog => blog.user_id).filter(id => id))];
        
        // Fetch user data for all unique user IDs
        const userRequests = userIds.map(userId => this.getUserInfo(userId));
        
        if (userRequests.length === 0) {
          // No users to fetch, return with default author info
          const posts: PostSummary[] = blogs.map(blog => this.mapBlogToPost(blog, null));
          return of({
            posts,
            total: blogResponse.total,
            page: blogResponse.page,
            limit: blogResponse.limit,
            total_pages: blogResponse.total_pages
          });
        }
        
        return forkJoin(userRequests).pipe(
          map(users => {
            // Create a map of user data by user ID
            const userMap = new Map();
            users.forEach(user => {
              if (user && user.id) {
                userMap.set(user.id, user);
              }
            });
            
            const posts: PostSummary[] = blogs.map(blog => {
              const userInfo = userMap.get(blog.user_id);
              return this.mapBlogToPost(blog, userInfo);
            });
            
            return {
              posts,
              total: blogResponse.total,
              page: blogResponse.page,
              limit: blogResponse.limit,
              total_pages: blogResponse.total_pages
            };
          })
        );
      })
    );
  }

searchPosts(query: string, page = 1, limit = 10): Observable<PostsResponse> {
  // 1. Handle empty query case
  if (!query.trim()) {
    return this.getPosts({ page, limit });
  }

  // 2. Attempt dedicated search
  return this.searchBlogs(query, page, limit).pipe(
    // 3. Transform successful search response
    map(searchResponse => this.transformSearchResponse(searchResponse, limit)),
    
    // 4. Fallback if search fails
    catchError(error => this.handleSearchError(query, page, limit, error))
  );
}

// Helper method for transformation
private transformSearchResponse(response: SearchBlogsResponse, limit: number): PostsResponse {
  const blogs = response.blogs.map(item => 
    'blog' in item ? item.blog : item
  );

  return {
    posts: blogs.map(blog => this.mapBlogToPost(blog, null)),
    total: response.total,
    page: response.page,
    limit: response.page_size, // Convert backend's page_size to frontend's limit
    total_pages: response.total_pages
  };
}

// Helper method for error handling
private handleSearchError(query: string, page: number, limit: number, error: any): Observable<PostsResponse> {
  console.error('🔍 Search failed, falling back to filtered posts', error);
  
  return this.getBlogs({ 
    search: query, 
    page, 
    limit,
    published: true 
  }).pipe(
    map(blogsResponse => ({
      posts: blogsResponse.blogs.map(blog => this.mapBlogToPost(blog, null)),
      total: blogsResponse.total,
      page: blogsResponse.page,
      limit: blogsResponse.limit,
      total_pages: blogsResponse.total_pages
    })),
    catchError(() => of(this.createEmptyResponse(page, limit)))
  );
}

// Helper for empty results
private createEmptyResponse(page: number, limit: number): PostsResponse {
  return {
    posts: [],
    total: 0,
    page,
    limit,
    total_pages: 0
  };
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

  private generateSlug(title: string | undefined | null): string {
    if (!title) {
      return 'untitled-' + Date.now();
    }
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private convertBlogsToPostsResponse(blogResponse: BlogsResponse): PostsResponse {
    // This method is now synchronous and used for cases where user data is already available
    const posts: PostSummary[] = blogResponse.blogs
      .filter(blog => blog && blog._id) // Filter out null/undefined blogs
      .map(blog => this.mapBlogToPost(blog, null));

    return {
      posts,
      total: blogResponse.total,
      page: blogResponse.page,
      limit: blogResponse.limit,
      total_pages: blogResponse.total_pages
    };
  }

  private convertBlogsResponseToPostsResponse(blogResponse: BlogsResponse): Observable<PostsResponse> {
    const blogs = blogResponse.blogs.filter(blog => blog && blog._id);
    
    // Get unique user IDs that need to be fetched
    const userIds = [...new Set(blogs.map(blog => blog.user_id).filter(id => id))];
    
    // Fetch user data for all unique user IDs
    const userRequests = userIds.map(userId => this.getUserInfo(userId));
    
    if (userRequests.length === 0) {
      const posts: PostSummary[] = blogs.map(blog => this.mapBlogToPost(blog, null));
      return of({
        posts,
        total: blogResponse.total,
        page: blogResponse.page,
        limit: blogResponse.limit,
        total_pages: blogResponse.total_pages
      });
    }
    
    return forkJoin(userRequests).pipe(
      map(users => {
        const userMap = new Map();
        users.forEach(user => {
          if (user && user.id) {
            userMap.set(user.id, user);
          }
        });
        
        const posts: PostSummary[] = blogs.map(blog => {
          const userInfo = userMap.get(blog.user_id);
          return this.mapBlogToPost(blog, userInfo);
        });
        
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

  private mapBlogToPost(blog: any, userInfo: any): PostSummary {
    // Use blog.username as the primary source, fallback to userInfo only if blog.username is not available
    const primaryUsername = blog.username || userInfo?.username || 'Unknown';
    
    return {
      id: blog._id,
      title: blog.title || 'Untitled',
      excerpt: blog.excerpt || this.generateExcerpt(blog.blog_body || blog.content),
      slug: this.generateSlug(blog.title),
      status: blog.published ? 'published' : 'draft',
      featured_image: blog.main_image_url,
      author_id: blog.user_id,
      username: primaryUsername,
      author: {
        id: blog.user?._id || blog.user_id,
        username: primaryUsername,
        profile_picture: userInfo?.profile_picture || blog.user?.profile_picture
      },
      tags: Array.isArray(blog.tags) ? (typeof blog.tags[0] === 'string' ? blog.tags as string[] : (blog.tags as any[]).map(tag => tag.name || tag)) : [],
      views: blog.views || 0,
      likes_count: blog.likes_count || 0,
      comment_count: blog.comment_count || 0,
      is_liked: blog.is_liked || false,
      created_at: blog.created_at,
      updated_at: blog.updated_at
    };
  }

  private getUserInfo(userId: string): Observable<any> {
    // Check cache first
    if (this.userCache.has(userId)) {
      return of(this.userCache.get(userId));
    }
    
    // Fetch user info and cache it
    return this.authService.getUserById(userId).pipe(
      map(user => {
        this.userCache.set(userId, user);
        return user;
      }),
      catchError(error => {
        console.warn(`Failed to fetch user info for ID ${userId}:`, error);
        // Return a fallback user object
        const fallbackUser = { id: userId, username: 'Unknown', profile_picture: null };
        this.userCache.set(userId, fallbackUser);
        return of(fallbackUser);
      })
    );
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
  getMyBlogs(page = 1, pageSize = 10): Observable<Blog[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());
    
    return this.http.get<Blog[]>(`${this.apiUrl}/blogs/my-blogs`, { params });
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

