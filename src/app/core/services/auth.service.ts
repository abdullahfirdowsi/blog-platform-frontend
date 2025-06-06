import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, timer, switchMap, of } from 'rxjs';
import { Router } from '@angular/router';
import { User, LoginRequest, LoginResponse, CreateUserRequest, GoogleAuthResponse } from '../../shared/interfaces';
import { environment } from '../../../environments/environment';
import { AnalyticsService } from './analytics.service';

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
  private analytics = inject(AnalyticsService);
  private googleAuthReturnUrl: string = '/home';

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredAuth();
    this.initGoogleAuth();
    this.logGoogleAuthStatus();
  }

  private async initGoogleAuth(): Promise<void> {
    console.log('AuthService: Starting Google Auth initialization');
    const startTime = Date.now();
    
    try {
      // Load Google Identity Services script
      if (!window.google) {
        console.log('AuthService: Loading Google script...');
        await this.loadGoogleScript();
        console.log('AuthService: Google script loaded successfully');
        this.analytics.trackScriptLoading(true, Date.now() - startTime);
      } else {
        console.log('AuthService: Google script already loaded');
        this.analytics.trackScriptLoading(true, 0);
      }
      
      // Wait a bit for the script to fully initialize
      console.log('AuthService: Waiting for script initialization...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!window.google?.accounts?.id) {
        console.error('AuthService: Google Identity Services not properly loaded');
        this.analytics.trackScriptLoading(false, Date.now() - startTime);
        throw new Error('Google Identity Services not properly loaded');
      }
      
      console.log('AuthService: Initializing Google Identity Services...');
      
      const initConfig = {
        client_id: environment.googleClientId,
        callback: this.handleGoogleAuth.bind(this),
        auto_select: false,
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: false
      };
      
      console.log('AuthService: Google init config:', { ...initConfig, callback: '[Function]' });
      
      window.google.accounts.id.initialize(initConfig);
      
      console.log('AuthService: Google Identity Services initialized successfully');
      
      // Also initialize for additional scopes if needed
      if (window.google?.accounts?.oauth2) {
        console.log('AuthService: Initializing OAuth2 token client...');
        window.google.accounts.oauth2.initTokenClient({
          client_id: environment.googleClientId,
          scope: 'openid email profile',
          callback: (response: any) => {
            console.log('OAuth2 token response:', response);
          }
        });
        console.log('AuthService: OAuth2 token client initialized');
      }
    } catch (error) {
      console.error('AuthService: Failed to initialize Google Auth:', error);
      this.analytics.trackScriptLoading(false, Date.now() - startTime);
      throw error;
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
      script.onload = () => {
        console.log('AuthService: Google script loaded successfully');
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('AuthService: Failed to load Google script:', error);
        reject(new Error('Failed to load Google Auth script'));
      };
      
      document.head.appendChild(script);
      console.log('AuthService: Google script added to DOM');
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
    
    // Debug: Log the credential to see what Google sends
    console.log('DEBUG: Google credential received:', response.credential);
    
    // Try to decode the JWT token to see its contents
    try {
      const parts = response.credential.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        console.log('DEBUG: Decoded Google token payload:', payload);
      }
    } catch (e) {
      console.log('DEBUG: Could not decode token:', e);
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
        this.analytics.trackAuthAttempt('google', true);
        
        // Navigate to the stored return URL
        this.router.navigate([this.googleAuthReturnUrl]);
      },
      error: (error) => {
        console.error('Google authentication failed:', error);
        this.analytics.trackAuthAttempt('google', false, error?.message);
        this.isLoadingSubject.next(false);
      }
    });
  }

  setGoogleAuthReturnUrl(returnUrl: string): void {
    this.googleAuthReturnUrl = returnUrl;
  }

  renderGoogleButton(element: HTMLElement, returnUrl?: string): void {
    console.log('AuthService: Attempting to render Google button');
    
    if (returnUrl) {
      this.setGoogleAuthReturnUrl(returnUrl);
      console.log('AuthService: Return URL set to:', returnUrl);
    }
    
    if (!window.google?.accounts?.id) {
      console.error('AuthService: Google Identity Services not available');
      this.analytics.trackButtonRender(false, undefined, 'Google Identity Services not available');
      throw new Error('Google Identity Services not available');
    }
    
    console.log('AuthService: Google Identity Services available, proceeding with render');
    
    // Clear any existing content first
    element.innerHTML = '';
    
    // Get the container width for responsive sizing
    const containerWidth = element.offsetWidth || element.parentElement?.offsetWidth || 320;
    const buttonWidth = Math.min(containerWidth, 400); // Max width of 400px
    
    console.log('AuthService: Container width:', containerWidth, 'Button width:', buttonWidth);
    
    try {
      const buttonConfig = {
        theme: 'outline',
        size: 'large',
        width: buttonWidth.toString(),
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left'
      };
      
      console.log('AuthService: Rendering button with config:', buttonConfig);
      
      window.google.accounts.id.renderButton(element, buttonConfig);
      
      console.log('AuthService: Google button rendered successfully');
      this.analytics.trackButtonRender(true, containerWidth);
      
      // Apply additional styling for better integration
      setTimeout(() => {
        const googleBtn = element.querySelector('.gsi-material-button') as HTMLElement;
        if (googleBtn) {
          googleBtn.style.width = '100%';
          googleBtn.style.maxWidth = 'none';
          console.log('AuthService: Applied custom styling to Google button');
        } else {
          console.warn('AuthService: Could not find rendered Google button for styling');
        }
      }, 50);
    } catch (error) {
      console.error('AuthService: Failed to render Google button:', error);
      this.analytics.trackButtonRender(false, containerWidth, String(error));
      throw error;
    }
  }

  // Method to check Google Auth status
  getGoogleAuthStatus(): {
    scriptLoaded: boolean;
    identityServicesAvailable: boolean;
    oauth2Available: boolean;
  } {
    return {
      scriptLoaded: !!window.google,
      identityServicesAvailable: !!(window.google?.accounts?.id),
      oauth2Available: !!(window.google?.accounts?.oauth2)
    };
  }

  // Method to log current Google Auth status
  private logGoogleAuthStatus(): void {
    setTimeout(() => {
      const status = this.getGoogleAuthStatus();
      console.log('AuthService: Google Auth Status:', status);
      console.log('AuthService: Environment Google Client ID:', environment.googleClientId);
    }, 1000); // Wait 1 second after service initialization
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

