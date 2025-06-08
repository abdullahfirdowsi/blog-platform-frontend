import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiSummary } from '../../shared/interfaces/post.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiSummaryService {
  private apiUrl = `${environment.apiUrl}/blog-summaries`;

  constructor(private http: HttpClient) {}

  getAiSummary(blogId: string): Observable<AiSummary> {
    return this.http.get<AiSummary>(`${this.apiUrl}/blog/${blogId}`);
  }

  generateAiSummary(blogId: string): Observable<AiSummary> {
    return this.http.post<AiSummary>(`${this.apiUrl}/generate/${blogId}`, {});
  }

  deleteAiSummary(blogId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/blog/${blogId}`);
  }
}

