import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, timer, switchMap, of } from 'rxjs';
import { Router } from '@angular/router';
import { User, LoginRequest, LoginResponse, CreateUserRequest, GoogleAuthResponse } from '../../shared/interfaces';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    google: any;
  }
}

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
  private googleAuthReturnUrl: string = '/home';

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredAuth();
    this.initGoogleAuth();
  }

  private async initGoogleAuth(): Promise<void> {
    try {
      // Load Google Identity Services script
      if (!window.google) {
        await this.loadGoogleScript();
      }
      
      window.google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: this.handleGoogleAuth.bind(this)
      });
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error);
    }
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById('google-auth-script')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-auth-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Auth script'));
      document.head.appendChild(script);
    });
  }

  private handleGoogleAuth(response: any): void {
    this.isLoadingSubject.next(true);
    
    // Validate that we received a token from Google
    if (!response?.credential) {
      console.error('Google authentication failed: No token received');
      this.isLoadingSubject.next(false);
      return;
    }
    
    this.http.post<GoogleAuthResponse>(`${this.apiUrl}/google`, {
      token: response.credential
    }, {
      withCredentials: true // Include cookies for refresh token
    }).pipe(
      catchError(error => {
        this.isLoadingSubject.next(false);
        console.error('Google authentication failed:', error);
        return throwError(() => error);
      })
    ).subscribe({
      next: (authResponse) => {
        this.handleAuthSuccess(authResponse);
        this.isLoadingSubject.next(false);
        
        // Navigate to the stored return URL
        this.router.navigate([this.googleAuthReturnUrl]);
      },
      error: (error) => {
        console.error('Google authentication failed:', error);
        this.isLoadingSubject.next(false);
      }
    });
  }

  setGoogleAuthReturnUrl(returnUrl: string): void {
    this.googleAuthReturnUrl = returnUrl;
  }

  renderGoogleButton(element: HTMLElement, returnUrl?: string): void {
    if (returnUrl) {
      this.setGoogleAuthReturnUrl(returnUrl);
    }
    
    if (window.google) {
      window.google.accounts.id.renderButton(element, {
        theme: 'outline',
        size: 'large',
        width: '320',
        text: 'signin_with'
      });
    }
  }

  private loadStoredAuth(): void {
    const token = sessionStorage.getItem('access_token');
    const user = sessionStorage.getItem('current_user');
    
    if (token && user && this.isTokenValid(token)) {
      this.tokenSubject.next(token);
      this.currentUserSubject.next(JSON.parse(user));
      this.scheduleTokenRefresh();
    } else {
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

    const expirationTime = this.getTokenExpirationTime(token);
    const currentTime = Date.now();
    const refreshTime = expirationTime - currentTime - (5 * 60 * 1000); // Refresh 5 minutes before expiry

    if (refreshTime > 0) {
      this.refreshTokenTimer = timer(refreshTime).subscribe(() => {
        this.refreshToken().subscribe({
          next: () => this.scheduleTokenRefresh(),
          error: () => this.logout()
        });
      });
    }
  }

  private clearRefreshTimer(): void {
    if (this.refreshTokenTimer) {
      this.refreshTokenTimer.unsubscribe();
      this.refreshTokenTimer = null;
    }
  }

  private handleAuthSuccess(response: LoginResponse | GoogleAuthResponse): void {
    // Store access token in session storage (cleared on browser close)
    sessionStorage.setItem('access_token', response.access_token);
    sessionStorage.setItem('current_user', JSON.stringify(response.user));
    
    // Refresh token is handled via HTTP-only cookies on the backend
    this.tokenSubject.next(response.access_token);
    this.currentUserSubject.next(response.user);
    this.scheduleTokenRefresh();
  }

  private clearStoredAuth(): void {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('current_user');
    sessionStorage.removeItem('refresh_token'); // Clear any existing refresh token
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
        this.handleAuthSuccess(response);
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  register(userData: CreateUserRequest): Observable<LoginResponse> {
    this.isLoadingSubject.next(true);
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/register`, userData, {
      withCredentials: true // Include cookies for refresh token
    }).pipe(
      tap(response => {
        this.handleAuthSuccess(response);
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
    // Backend uses HTTP-only cookies for refresh tokens
    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, {}, {
      withCredentials: true // Include cookies
    }).pipe(
      tap(response => {
        sessionStorage.setItem('access_token', response.access_token);
        this.tokenSubject.next(response.access_token);
        if (response.user) {
          sessionStorage.setItem('current_user', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  updateProfile(userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, userData)
      .pipe(
        tap(user => {
          sessionStorage.setItem('current_user', JSON.stringify(user));
          this.currentUserSubject.next(user);
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

  resendVerificationEmail(): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend-verification`, {});
  }
}

