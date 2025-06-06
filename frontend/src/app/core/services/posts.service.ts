import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Post, 
  PostsResponse, 
  CreatePostRequest, 
  UpdatePostRequest, 
  PostFilters
} from '../../shared/interfaces';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private apiUrl = `${environment.apiUrl}/blogs`;
  private tagsUrl = `${environment.apiUrl}/tags`;
  private likesUrl = `${environment.apiUrl}/likes`;

  constructor(private http: HttpClient) {}

  // Get all blogs with pagination and filters
  getPosts(filters?: any): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.page_size) params = params.set('page_size', filters.page_size.toString());
      if (filters.published_only !== undefined) params = params.set('published_only', filters.published_only.toString());
      if (filters.tag_id) params = params.set('tag_id', filters.tag_id);
    }

    return this.http.get<any>(this.apiUrl, { params });
  }

  // Get single blog by ID
  getPost(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Create new blog
  createPost(postData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, postData);
  }

  // Update existing blog
  updatePost(id: string, postData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, postData);
  }

  deletePost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Like/Unlike blog posts
  likePost(blogId: string): Observable<any> {
    return this.http.post<any>(`${this.likesUrl}/${blogId}`, { isLiked: true });
  }

  unlikePost(blogId: string): Observable<any> {
    return this.http.delete<any>(`${this.likesUrl}/${blogId}`);
  }

  // Get likes for a blog
  getBlogLikes(blogId: string): Observable<any> {
    return this.http.get<any>(`${this.likesUrl}/${blogId}`);
  }

  // Get user's blogs
  getUserPosts(userId: string, filters?: any): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.page_size) params = params.set('page_size', filters.page_size.toString());
      if (filters.published_only !== undefined) params = params.set('published_only', filters.published_only.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/user/${userId}`, { params });
  }

  // Get all tags
  getTags(): Observable<any> {
    return this.http.get<any>(this.tagsUrl);
  }

  // Create new tag
  createTag(name: string): Observable<any> {
    return this.http.post<any>(this.tagsUrl, { name });
  }

  // Search blogs (can be implemented using filters)
  searchPosts(query: string, filters?: any): Observable<any> {
    // For now, return regular posts - search can be implemented later
    return this.getPosts(filters);
  }
}

