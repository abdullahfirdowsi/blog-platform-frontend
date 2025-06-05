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
  private apiUrl = `${environment.apiUrl}/posts`;

  constructor(private http: HttpClient) {}

  getPosts(filters?: PostFilters): Observable<PostsResponse> {
    let params = new HttpParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PostsResponse>(this.apiUrl, { params });
  }

  getPost(id: string): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/${id}`);
  }

  getPostBySlug(slug: string): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/slug/${slug}`);
  }

  createPost(postData: CreatePostRequest): Observable<Post> {
    return this.http.post<Post>(this.apiUrl, postData);
  }

  updatePost(id: string, postData: UpdatePostRequest): Observable<Post> {
    return this.http.put<Post>(`${this.apiUrl}/${id}`, postData);
  }

  deletePost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  likePost(id: string): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/${id}/like`, {});
  }

  unlikePost(id: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${id}/like`);
  }

  getUserPosts(userId: string, filters?: PostFilters): Observable<PostsResponse> {
    let params = new HttpParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PostsResponse>(`${environment.apiUrl}/users/${userId}/posts`, { params });
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories/`);
  }

  getTags(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/tags/`);
  }

  searchPosts(query: string, filters?: Omit<PostFilters, 'search'>): Observable<PostsResponse> {
    const searchFilters: PostFilters = { ...filters, search: query };
    return this.getPosts(searchFilters);
  }
}

