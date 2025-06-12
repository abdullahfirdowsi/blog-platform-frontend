import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { BlogService } from './blog.service';
import { Blog, UpdateBlogRequest, BlogSummary } from '../../shared/interfaces/post.interface';

interface BlogState {
  blogs: Blog[];
  loading: boolean;
  error: string | null;
  selectedBlog: Blog | null;
  hasChanges: boolean;
  originalContent: string | null;
}

const initialState: BlogState = {
  blogs: [],
  loading: false,
  error: null,
  selectedBlog: null,
  hasChanges: false,
  originalContent: null
};

@Injectable({
  providedIn: 'root'
})
export class BlogStateService {
  private stateSubject = new BehaviorSubject<BlogState>(initialState);
  public state$ = this.stateSubject.asObservable();

  constructor(private blogService: BlogService) {}

  // Getters for specific state slices
  get blogs$(): Observable<Blog[]> {
    return this.state$.pipe(map(state => state.blogs));
  }

  get loading$(): Observable<boolean> {
    return this.state$.pipe(map(state => state.loading));
  }

  get error$(): Observable<string | null> {
    return this.state$.pipe(map(state => state.error));
  }

  get selectedBlog$(): Observable<Blog | null> {
    return this.state$.pipe(map(state => state.selectedBlog));
  }

  get hasChanges$(): Observable<boolean> {
    return this.state$.pipe(map(state => state.hasChanges));
  }

  // Update state helper
  private updateState(partial: Partial<BlogState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...partial });
  }

  // Load user's blogs
  loadMyBlogs(): Observable<Blog[]> {
    this.updateState({ loading: true, error: null });
    
    // Only fetch from API (MongoDB)
    return this.blogService.getMyBlogs(1, 100).pipe(
      tap(blogs => {
        console.log('Successfully loaded blogs from API:', blogs);
        this.updateState({ blogs, loading: false });
        // Save to localStorage as cache after successful API call
        this.saveBlogsToLocalStorage(blogs);
      }),
      catchError(error => {
        console.error('Failed to load blogs from API:', error);
        let errorMessage = 'Failed to load blogs';
        
        if (error.status === 401) {
          errorMessage = 'Please log in to view your blogs';
        } else if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your connection.';
        } else if (error.error?.detail) {
          errorMessage = error.error.detail;
        }
        
        this.updateState({ blogs: [], loading: false, error: errorMessage });
        return throwError(() => error);
      })
    );
  }

  // Get single blog by ID
  getBlogById(id: string): Observable<Blog | null> {
    this.updateState({ loading: true, error: null });
    
    // First check localStorage
    const localBlog = this.getBlogFromLocalStorage(id);
    if (localBlog) {
      this.updateState({ 
        selectedBlog: localBlog, 
        loading: false,
        originalContent: localBlog.content,
        hasChanges: false
      });
      return of(localBlog);
    }

    // Try API as fallback
    return this.blogService.getBlogById(id).pipe(
      map(blogSummary => this.convertSummaryToBlog(blogSummary)),
      tap(blog => {
        if (blog) {
          this.updateState({ 
            selectedBlog: blog, 
            loading: false,
            originalContent: blog.content,
            hasChanges: false
          });
        }
      }),
      catchError(error => {
        console.error('Error fetching blog:', error);
        this.updateState({ 
          selectedBlog: null, 
          loading: false, 
          error: 'Blog not found' 
        });
        return of(null);
      })
    );
  }

  // Update blog
  updateBlog(id: string, updateData: UpdateBlogRequest): Observable<Blog> {
    this.updateState({ loading: true, error: null });
    
    // Update localStorage first for immediate response
    const updatedBlog = this.updateBlogInLocalStorage(id, updateData);
    if (updatedBlog) {
      // Update the blogs array
      const currentBlogs = this.stateSubject.value.blogs;
      const updatedBlogs = currentBlogs.map(blog => 
        blog._id === id ? updatedBlog : blog
      );
      
      this.updateState({ 
        blogs: updatedBlogs,
        selectedBlog: updatedBlog,
        loading: false,
        originalContent: updatedBlog.content,
        hasChanges: false
      });
      
      return of(updatedBlog);
    }

    // API call as fallback
    return this.blogService.updateBlog(id, updateData).pipe(
      map(blogResponse => this.convertApiResponseToBlog(blogResponse)),
      tap(blog => {
        const currentBlogs = this.stateSubject.value.blogs;
        const updatedBlogs = currentBlogs.map(b => b._id === id ? blog : b);
        this.updateState({ 
          blogs: updatedBlogs,
          selectedBlog: blog,
          loading: false,
          originalContent: blog.content,
          hasChanges: false
        });
      }),
      catchError(error => {
        console.error('Error updating blog:', error);
        this.updateState({ loading: false, error: 'Failed to update blog' });
        return throwError(() => error);
      })
    );
  }

  // Delete blog
  deleteBlog(id: string): Observable<void> {
    this.updateState({ loading: true, error: null });
    
    // Delete from localStorage first
    this.deleteBlogFromLocalStorage(id);
    
    // Update state immediately
    const currentBlogs = this.stateSubject.value.blogs;
    const updatedBlogs = currentBlogs.filter(blog => blog._id !== id);
    this.updateState({ blogs: updatedBlogs, loading: false });
    
    // Try API call as well (will fail silently if not available)
    return this.blogService.deleteBlog(id).pipe(
      tap(() => {
        console.log('Blog deleted from API as well');
      }),
      catchError(error => {
        console.warn('API delete failed, but localStorage already updated:', error);
        return of(void 0);
      })
    );
  }

  // Track content changes for edit detection
  updateSelectedBlogContent(content: string): void {
    const currentState = this.stateSubject.value;
    if (currentState.selectedBlog) {
      const updatedBlog = { ...currentState.selectedBlog, content };
      const hasChanges = content !== currentState.originalContent;
      
      this.updateState({ 
        selectedBlog: updatedBlog,
        hasChanges
      });
    }
  }

  // Reset change tracking
  resetChanges(): void {
    this.updateState({ hasChanges: false });
  }

  // Clear selected blog
  clearSelectedBlog(): void {
    this.updateState({ 
      selectedBlog: null, 
      hasChanges: false, 
      originalContent: null 
    });
  }

  // LocalStorage operations
  private getBlogsFromLocalStorage(): Blog[] {
    try {
      const blogsJson = localStorage.getItem('user_blogs');
      if (!blogsJson) return [];
      
      const blogs = JSON.parse(blogsJson);
      return blogs.map((blog: any) => this.convertLocalStorageToBlog(blog));
    } catch (error) {
      console.error('Error reading blogs from localStorage:', error);
      return [];
    }
  }

  private getBlogFromLocalStorage(id: string): Blog | null {
    const blogs = this.getBlogsFromLocalStorage();
    return blogs.find(blog => blog._id === id) || null;
  }

  private updateBlogInLocalStorage(id: string, updateData: UpdateBlogRequest): Blog | null {
    try {
      const blogs = this.getBlogsFromLocalStorage();
      const blogIndex = blogs.findIndex(blog => blog._id === id);
      
      if (blogIndex === -1) return null;
      
      const updatedBlog = {
        ...blogs[blogIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      blogs[blogIndex] = updatedBlog;
      localStorage.setItem('user_blogs', JSON.stringify(blogs.map(this.convertBlogToLocalStorage)));
      
      return updatedBlog;
    } catch (error) {
      console.error('Error updating blog in localStorage:', error);
      return null;
    }
  }

  private deleteBlogFromLocalStorage(id: string): void {
    try {
      const blogs = this.getBlogsFromLocalStorage();
      const filteredBlogs = blogs.filter(blog => blog._id !== id);
      localStorage.setItem('user_blogs', JSON.stringify(filteredBlogs.map(this.convertBlogToLocalStorage)));
    } catch (error) {
      console.error('Error deleting blog from localStorage:', error);
    }
  }

  private saveBlogsToLocalStorage(blogs: Blog[]): void {
    try {
      const blogsToStore = blogs.map(blog => this.convertBlogToLocalStorage(blog));
      localStorage.setItem('user_blogs', JSON.stringify(blogsToStore));
    } catch (error) {
      console.error('Error saving blogs to localStorage:', error);
    }
  }

  // Conversion helpers
  private convertLocalStorageToBlog(localBlog: any): Blog {
    return {
      _id: localBlog._id,
      user_id: localBlog.user_id || 'current_user',
      title: localBlog.title,
      username:localBlog.username,
      content: localBlog.content,
      tags: localBlog.tags || [],  // Changed from tag_ids to tags
      main_image_url: localBlog.main_image_url,
      published: localBlog.published,
      created_at: localBlog.created_at,
      updated_at: localBlog.updated_at
    };
  }

  private convertBlogToLocalStorage(blog: Blog): any {
    return {
      _id: blog._id,
      user_id: blog.user_id,
      title: blog.title,
      content: blog.content,
      tags: blog.tags,  // Changed from blog.tag_ids to blog.tags
      main_image_url: blog.main_image_url,
      published: blog.published,
      created_at: blog.created_at,
      updated_at: blog.updated_at
    };
  }

  private convertSummaryToBlog(summary: any): Blog {
    return {
      _id: summary.id || summary._id,
      user_id: summary.user_id,
      title: summary.title,
      username:summary.username,
      content: summary.content || summary.blog_body || '',
      tags: summary.tags || [],  // Changed from tag_ids to tags
      main_image_url: summary.main_image_url,
      published: summary.published,
      created_at: summary.created_at,
      updated_at: summary.updated_at
    };
  }

  private convertApiResponseToBlog(apiResponse: any): Blog {
    return {
      _id: apiResponse.id || apiResponse._id,
      user_id: apiResponse.user_id,
      title: apiResponse.title,
      username:apiResponse.username,
      content: apiResponse.blog_body || apiResponse.content || '',
      tags: apiResponse.tags || [],  // Changed from tag_ids to tags
      main_image_url: apiResponse.main_image_url,
      published: apiResponse.published,
      created_at: apiResponse.created_at,
      updated_at: apiResponse.updated_at
    };
  }
}

