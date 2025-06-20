import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserInterests, UserInterestsCreate, UserInterestsUpdate } from '../../shared/interfaces/user.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InterestsService {
  private apiUrl = `${environment.apiUrl}/interests`;
  private userInterestsSubject = new BehaviorSubject<UserInterests | null>(null);
  
  public userInterests$ = this.userInterestsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get current user's interests
  getUserInterests(): Observable<UserInterests> {
    return this.http.get<UserInterests>(this.apiUrl).pipe(
      tap(interests => this.userInterestsSubject.next(interests))
    );
  }

  // Create user interests (first time)
  createUserInterests(interests: UserInterestsCreate): Observable<UserInterests> {
    return this.http.post<UserInterests>(this.apiUrl, interests).pipe(
      tap(interests => this.userInterestsSubject.next(interests))
    );
  }

  // Update user interests (replace all)
  updateUserInterests(interests: UserInterestsUpdate): Observable<UserInterests> {
    return this.http.put<UserInterests>(this.apiUrl, interests).pipe(
      tap(interests => this.userInterestsSubject.next(interests))
    );
  }

  // Add single interest
  addInterest(interest: string): Observable<{message: string}> {
    return this.http.patch<{message: string}>(`${this.apiUrl}/add`, null, {
      params: { interest }
    });
  }

  // Remove single interest
  removeInterest(interest: string): Observable<{message: string}> {
    return this.http.patch<{message: string}>(`${this.apiUrl}/remove`, null, {
      params: { interest }
    });
  }

  // Delete all user interests
  deleteUserInterests(): Observable<{message: string}> {
    return this.http.delete<{message: string}>(this.apiUrl).pipe(
      tap(() => this.userInterestsSubject.next(null))
    );
  }

  // Get interest suggestions
  getInterestSuggestions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/suggestions`);
  }

  // Check if user has interests
  hasInterests(): boolean {
    const interests = this.userInterestsSubject.value;
    return interests != null && interests.interests.length > 0;
  }

  // Get current interests value
  getCurrentInterests(): UserInterests | null {
    return this.userInterestsSubject.value;
  }

  // Clear interests from memory
  clearInterests(): void {
    this.userInterestsSubject.next(null);
  }
}