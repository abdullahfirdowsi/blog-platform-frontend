import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardTotals {
  total_users: number;
  total_posts: number;
  total_comments: number;
  total_likes: number;
}

export interface PostsOverTime {
  period: string;
  count: number;
}

export interface PostsByCategory {
  category: string;
  count: number;
}

export interface TopTag {
  tag: string;
  count: number;
}

export interface MostLikedPost {
  id: string;
  title: string;
  author: string;
  likes_count: number;
  created_at: string;
}

export interface MostCommentedPost {
  id: string;
  title: string;
  author: string;
  comment_count: number;
  created_at: string;
}

export interface UsersOverTime {
  period: string;
  count: number;
}

export interface Activity {
  type: string;
  id: string;
  title?: string;
  user: string;
  created_at: string;
  description: string;
}

export interface TopContributor {
  user_id: string;
  username: string;
  email: string;
  post_count: number;
  comment_count: number;
  total_score: number;
  joined_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getTotals(): Observable<DashboardTotals> {
    return this.http.get<DashboardTotals>(`${this.baseUrl}/totals`);
  }

  getPostsOverTime(period: 'day' | 'week' | 'month' | 'year' = 'week'): Observable<PostsOverTime[]> {
    const params = new HttpParams().set('period', period);
    return this.http.get<PostsOverTime[]>(`${this.baseUrl}/posts-over-time`, { params });
  }

  getPostsByCategory(): Observable<PostsByCategory[]> {
    return this.http.get<PostsByCategory[]>(`${this.baseUrl}/posts-by-category`);
  }

  getTopTags(limit: number = 20): Observable<TopTag[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<TopTag[]>(`${this.baseUrl}/top-tags`, { params });
  }

  getMostLikedPosts(limit: number = 10): Observable<MostLikedPost[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<MostLikedPost[]>(`${this.baseUrl}/most-liked`, { params });
  }

  getMostCommentedPosts(limit: number = 10): Observable<MostCommentedPost[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<MostCommentedPost[]>(`${this.baseUrl}/most-commented`, { params });
  }

  getUsersOverTime(period: 'day' | 'week' | 'month' | 'year' = 'month'): Observable<UsersOverTime[]> {
    const params = new HttpParams().set('period', period);
    return this.http.get<UsersOverTime[]>(`${this.baseUrl}/users-over-time`, { params });
  }

  getRecentActivity(limit: number = 20): Observable<Activity[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<Activity[]>(`${this.baseUrl}/recent-activity`, { params });
  }

  getTopContributors(limit: number = 10): Observable<TopContributor[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<TopContributor[]>(`${this.baseUrl}/top-contributors`, { params });
  }
}

