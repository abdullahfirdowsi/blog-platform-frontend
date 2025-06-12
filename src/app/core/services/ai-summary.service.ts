import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiSummary, AiSummaryCreate } from '../../shared/interfaces/post.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiSummaryService {
  private apiUrl = environment.apiUrl || 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // Get AI summary for a blog
  getAiSummary(blogId: string): Observable<AiSummary> {
    return this.http.get<AiSummary>(`${this.apiUrl}/summaries/${blogId}`);
  }

  // Generate AI summary for a blog
  generateAiSummary(blogId: string, blogTitle: string, blogContent: string): Observable<AiSummary> {
    const payload: AiSummaryCreate = {
      blog_id: blogId,
      blog_title: blogTitle,
      blog_content: blogContent
    };
    return this.http.post<AiSummary>(`${this.apiUrl}/summaries/`, payload);
  }

  // Delete AI summary for a blog
  deleteAiSummary(blogId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/summaries/${blogId}`);
  }
}

