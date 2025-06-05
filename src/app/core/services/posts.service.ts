import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Post, 
  PostsResponse, 
  CreatePostRequest, 
  UpdatePostRequest, 
  PostFilters,
  Category,
  Tag
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

  getPost(id: number): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/${id}`);
  }

  getPostBySlug(slug: string): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/slug/${slug}`);
  }

  createPost(postData: CreatePostRequest): Observable<Post> {
    return this.http.post<Post>(this.apiUrl, postData);
  }

  updatePost(id: number, postData: UpdatePostRequest): Observable<Post> {
    return this.http.put<Post>(`${this.apiUrl}/${id}`, postData);
  }

  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  likePost(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/like`, {});
  }

  unlikePost(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/like`);
  }

  getUserPosts(userId: number, filters?: PostFilters): Observable<PostsResponse> {
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

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${environment.apiUrl}/categories`);
  }

  getTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${environment.apiUrl}/tags`);
  }

  searchPosts(query: string, filters?: Omit<PostFilters, 'search'>): Observable<PostsResponse> {
    const searchFilters: PostFilters = { ...filters, search: query };
    return this.getPosts(searchFilters);
  }
}

