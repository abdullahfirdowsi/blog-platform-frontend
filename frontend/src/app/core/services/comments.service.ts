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

  getPostComments(blogId: string, page?: number, limit?: number): Observable<any> {
    let params = new HttpParams();
    
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());
    // Add blog_id filter for comments endpoint
    params = params.set('blog_id', blogId);

    return this.http.get<any>(this.apiUrl, { params });
  }

  getComment(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createComment(blogId: string, text: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${blogId}`, { text });
  }

  updateComment(id: string, text: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, { text });
  }

  deleteComment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

