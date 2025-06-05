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

  getPostComments(postId: number, page?: number, perPage?: number): Observable<CommentsResponse> {
    let params = new HttpParams();
    
    if (page) params = params.set('page', page.toString());
    if (perPage) params = params.set('per_page', perPage.toString());

    return this.http.get<CommentsResponse>(`${environment.apiUrl}/posts/${postId}/comments`, { params });
  }

  getComment(id: number): Observable<Comment> {
    return this.http.get<Comment>(`${this.apiUrl}/${id}`);
  }

  createComment(commentData: CreateCommentRequest): Observable<Comment> {
    return this.http.post<Comment>(this.apiUrl, commentData);
  }

  updateComment(id: number, commentData: UpdateCommentRequest): Observable<Comment> {
    return this.http.put<Comment>(`${this.apiUrl}/${id}`, commentData);
  }

  deleteComment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getCommentReplies(parentId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/${parentId}/replies`);
  }
}

