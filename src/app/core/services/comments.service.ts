import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Comment, 
  CommentsResponse, 
  CreateCommentRequest, 
  UpdateCommentRequest 
} from '../../shared/interfaces';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommentsService {
  private apiUrl = `${environment.apiUrl}/comments`;

  constructor(private http: HttpClient) {}

  getPostComments(postId: string, page?: number, limit?: number): Observable<CommentsResponse> {
    let params = new HttpParams();
    
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());
    // Add post_id filter for comments endpoint
    params = params.set('post_id', postId);

    return this.http.get<CommentsResponse>(this.apiUrl, { params });
  }

  getComment(id: string): Observable<Comment> {
    return this.http.get<Comment>(`${this.apiUrl}/${id}`);
  }

  createComment(commentData: CreateCommentRequest): Observable<Comment> {
    return this.http.post<Comment>(this.apiUrl, commentData);
  }

  updateComment(id: string, commentData: UpdateCommentRequest): Observable<Comment> {
    return this.http.put<Comment>(`${this.apiUrl}/${id}`, commentData);
  }

  deleteComment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getCommentReplies(parentId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/${parentId}/replies`);
  }
}

