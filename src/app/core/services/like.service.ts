import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Like, LikeResponse } from '../../shared/interfaces/like.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LikeService {
  private apiUrl = environment.apiUrl || 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // Toggle like for a blog (like/unlike)
  toggleLike(blogId: string): Observable<LikeResponse> {
    return this.http.post<LikeResponse>(`${this.apiUrl}/likes/blogs/${blogId}`, {});
  }

  // Get likes count for a blog
  getBlogLikesCount(blogId: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/likes/blogs/${blogId}/count`);
  }

  // Check if current user liked a blog
  getMyLikeForBlog(blogId: string): Observable<LikeResponse> {
    return this.http.get<LikeResponse>(`${this.apiUrl}/likes/blogs/${blogId}/my-like`);
  }

  // Remove like from a blog
  removeLike(blogId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/likes/blogs/${blogId}`);
  }

  // Get all my likes
  getMyLikes(): Observable<LikeResponse[]> {
    return this.http.get<LikeResponse[]>(`${this.apiUrl}/likes/my-likes`);
  }
}

