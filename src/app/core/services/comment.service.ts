import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Comment, CommentCreate, CommentResponse } from '../../shared/interfaces/comment.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrl = environment.apiUrl || 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // Get all comments for a blog
  getBlogComments(blogId: string, skip: number = 0, limit: number = 20): Observable<CommentResponse[]> {
    return this.http.get<CommentResponse[]>(`${this.apiUrl}/comments/blogs/${blogId}?skip=${skip}&limit=${limit}`);
  }

  // Create a new comment
  createComment(blogId: string, comment: CommentCreate): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(`${this.apiUrl}/comments/blogs/${blogId}`, comment);
  }

  // Update a comment
  updateComment(commentId: string, comment: CommentCreate): Observable<CommentResponse> {
    return this.http.put<CommentResponse>(`${this.apiUrl}/comments/${commentId}`, comment);
  }

  // Delete a comment
  deleteComment(commentId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/comments/${commentId}`);
  }

  // Get my comments
  getMyComments(skip: number = 0, limit: number = 20): Observable<CommentResponse[]> {
    return this.http.get<CommentResponse[]>(`${this.apiUrl}/comments/my-comments?skip=${skip}&limit=${limit}`);
  }
}

