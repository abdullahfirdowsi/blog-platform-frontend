import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, timer, switchMap, of, map } from 'rxjs';
import { Router } from '@angular/router';
import { User, LoginRequest, LoginResponse, CreateUserRequest } from '../../shared/interfaces';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private refreshTokenTimer: any;
  private router = inject(Router);
  private currentApiDomain: string;

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public isAuthenticated$ = this.token$.pipe(
    map(token => !!token && this.isTokenValid(token))
  );

  constructor(private http: HttpClient) {
    this.currentApiDomain = this.extractDomain(environment.apiUrl);
    this.checkApiUrlChange();
    this.loadStoredAuth();
  }

  /**
   * Extracts domain from a URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      console.error('Invalid URL format:', url);
      return '';
    }
  }

  /**
   * Checks if API URL has changed since last use
   */
  private checkApiUrlChange(): void {
    const storedApiDomain = sessionStorage.getItem('api_domain');
    
    if (storedApiDomain && storedApiDomain !== this.currentApiDomain) {
      console.warn(`API domain changed from ${storedApiDomain} to ${this.currentApiDomain}`);
      this.handleApiUrlChange();
    }
    
    // Store current API domain
    sessionStorage.setItem('api_domain', this.currentApiDomain);
  }

  /**
   * Handles API URL change by clearing auth data and redirecting to login
   */
  private handleApiUrlChange(): void {
    console.log('API URL changed - clearing authentication data');
    this.clearStoredAuth();
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    
    // Show a notification about the API change (optional)
    // Can be enhanced with a proper notification service
    setTimeout(() => {
      alert('The application has been updated. Please log in again.');
    }, 1000);
    
    // Redirect to login page
    this.router.navigate(['/auth/login']);
  }


  private loadStoredAuth(): void {
    const token = sessionStorage.getItem('access_token');
    const user = sessionStorage.getItem('current_user');
    const tokenDomain = sessionStorage.getItem('token_domain');
    
    // Check if token exists, is valid, and the domain matches
    if (token && user && this.isTokenValid(token)) {
      // Verify that token was issued for the current API domain
      if (tokenDomain && tokenDomain !== this.currentApiDomain) {
        console.warn(`Token domain mismatch: token from ${tokenDomain}, current API is ${this.currentApiDomain}`);
        this.clearStoredAuth();
        return;
      }
      
      console.log('Loading stored authentication');
      this.tokenSubject.next(token);
      this.currentUserSubject.next(JSON.parse(user));
      this.scheduleTokenRefresh();
    } else {
      console.log('No valid stored authentication found');
      // Clear stored auth silently - don't log as error for public pages
      this.clearStoredAuth();
    }
  }

  private isTokenValid(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  private getTokenExpirationTime(token: string): number {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      return 0;
    }
  }

  private scheduleTokenRefresh(): void {
    const token = this.getToken();
    if (!token) return;

    // Clear any existing timer first
    this.clearRefreshTimer();

    const expirationTime = this.getTokenExpirationTime(token);
    const currentTime = Date.now();
    const refreshTime = expirationTime - currentTime - (5 * 60 * 1000); // Refresh 5 minutes before expiry

    // Only schedule if we have a reasonable time until expiry (more than 1 minute)
    if (refreshTime > 60000) {
      console.log(`Token refresh scheduled in ${Math.floor(refreshTime / 1000 / 60)} minutes`);
      this.refreshTokenTimer = timer(refreshTime).subscribe(() => {
        console.log('Attempting token refresh...');
        this.refreshToken().subscribe({
          next: (response) => {
            console.log('Token refreshed successfully');
            this.scheduleTokenRefresh();
          },
          error: (error) => {
            console.error('Token refresh failed:', error);
            this.logout();
          }
        });
      });
    } else if (refreshTime <= 0) {
      // Token is expired or about to expire, logout immediately
      console.log('Token expired, logging out');
      this.logout();
    }
  }

  private clearRefreshTimer(): void {
    if (this.refreshTokenTimer) {
      this.refreshTokenTimer.unsubscribe();
      this.refreshTokenTimer = null;
    }
  }

  private handleAuthSuccess(response: LoginResponse): void {
    // Store access token in session storage (cleared on browser close)
    sessionStorage.setItem('access_token', response.access_token);
    sessionStorage.setItem('current_user', JSON.stringify(response.user));
    sessionStorage.setItem('token_domain', this.currentApiDomain);
    
    // Refresh token is handled via HTTP-only cookies on the backend
    this.tokenSubject.next(response.access_token);
    this.currentUserSubject.next(response.user);
    this.scheduleTokenRefresh();
  }

  private clearStoredAuth(): void {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('current_user');
    sessionStorage.removeItem('refresh_token'); // Clear any existing refresh token
    sessionStorage.removeItem('token_domain'); // Clear token domain
    // Don't remove api_domain as we want to track changes
    this.clearRefreshTimer();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.isLoadingSubject.next(true);
    
    const loginData = {
      email: credentials.email,
      password: credentials.password
    };

    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, loginData, {
      withCredentials: true // Include cookies for refresh token
    }).pipe(
      tap(response => {
        console.log('Login response received:', response);
        this.handleAuthSuccess(response);
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        
        // Check if error is related to API access
        if (error.status === 0) {
          console.error('Could not connect to the API. The service might be down or the URL has changed.');
          // Handle as potential API URL change
          this.handleApiAccessError();
        }
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Handle API access errors that might be related to URL changes
   */
  private handleApiAccessError(): void {
    // Clear any stored auth data as it might be for the wrong domain
    this.clearStoredAuth();
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  register(userData: CreateUserRequest): Observable<any> {
    this.isLoadingSubject.next(true);
    
    return this.http.post<any>(`${this.apiUrl}/register`, userData, {
      withCredentials: true // Include cookies for refresh token
    }).pipe(
      tap(response => {
        // Only handle auth success if response contains tokens
        if (response && response.access_token) {
          this.handleAuthSuccess(response);
        }
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    // Call backend logout to clear refresh token cookie
    this.http.post(`${this.apiUrl}/logout`, {}, {
      withCredentials: true // Include cookies for refresh token
    }).subscribe({
      next: () => console.log('Successfully logged out from server'),
      error: (error) => console.error('Logout error:', error)
    });

    this.clearStoredAuth();
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    this.router.navigate(['/landing']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && this.isTokenValid(token);
  }

  refreshToken(): Observable<LoginResponse> {
    console.log('Refreshing token...');
    // Backend uses HTTP-only cookies for refresh tokens
    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, {}, {
      withCredentials: true // Include cookies
    }).pipe(
      tap(response => {
        console.log('Token refresh response received');
        sessionStorage.setItem('access_token', response.access_token);
        sessionStorage.setItem('token_domain', this.currentApiDomain);
        this.tokenSubject.next(response.access_token);
        if (response.user) {
          sessionStorage.setItem('current_user', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }
      }),
      catchError(error => {
        console.error('Token refresh error:', error);
        
        // Special handling for connection errors - might be API URL change
        if (error.status === 0) {
          console.error('Could not connect to API during token refresh. The service might be down or the URL has changed.');
          this.handleApiAccessError();
        } else {
          // Standard logout for other errors
          this.logout();
        }
        
        return throwError(() => error);
      })
    );
  }

  updateProfile(userData: Partial<User>): Observable<User> {
    // Use different endpoints based on what's being updated
    const endpoint = userData.profile_picture !== undefined 
      ? `${this.apiUrl}/update-profile-picture`
      : `${this.apiUrl}/update-username`;
      
    return this.http.put<User>(endpoint, userData)
      .pipe(
        tap(user => {
          console.log('Profile updated, new user data:', user);
          // Store updated user data
          sessionStorage.setItem('current_user', JSON.stringify(user));
          // Force update the current user subject to trigger UI refresh
          this.currentUserSubject.next(user);
          // Also update any cached user data
          this.refreshUserData();
        })
      );
  }

  changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password`, {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, {
      token,
      new_password: newPassword
    });
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-email`, { token });
  }

  resendVerificationEmail(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend-verification`, { email });
  }

  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${userId}`);
  }

  // Refresh user data to ensure UI consistency
  private refreshUserData(): void {
    // Force a fresh read from session storage
    const storedUser = sessionStorage.getItem('current_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Emit the updated user to trigger UI refresh in all components
        setTimeout(() => {
          this.currentUserSubject.next(user);
        }, 100); // Small delay to ensure the update is processed
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }
  }

  // Debug methods
  getRefreshTimerStatus(): boolean {
    return !!this.refreshTokenTimer;
  }

  /**
   * Force check for API URL change - useful for manual troubleshooting
   */
  checkApiConfiguration(): {currentDomain: string, storedDomain: string | null, tokenDomain: string | null} {
    const storedApiDomain = sessionStorage.getItem('api_domain');
    const tokenDomain = sessionStorage.getItem('token_domain');
    
    return {
      currentDomain: this.currentApiDomain,
      storedDomain: storedApiDomain,
      tokenDomain: tokenDomain
    };
  }

  manualClearRefreshTimer(): void {
    console.log('Manually clearing refresh timer');
    this.clearRefreshTimer();
  }

  getTokenInfo(): any {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = payload.exp;
      const timeUntilExpiry = expirationTime - currentTime;
      
      return {
        isValid: this.isTokenValid(token),
        expiresAt: new Date(expirationTime * 1000),
        timeUntilExpiryMinutes: Math.floor(timeUntilExpiry / 60),
        timeUntilExpirySeconds: timeUntilExpiry % 60
      };
    } catch (error) {
      return { error: 'Invalid token format' };
    }
  }
}

