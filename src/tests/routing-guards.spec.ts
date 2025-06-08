import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { AuthService } from '../app/core/services/auth.service';
import { authGuard, guestGuard } from '../app/core/guards/auth.guard';

// Mock components for testing routes
@Component({ template: 'Home Component' })
class MockHomeComponent {}

@Component({ template: 'Dashboard Component' })
class MockDashboardComponent {}

@Component({ template: 'Login Component' })
class MockLoginComponent {}

@Component({ template: 'Register Component' })
class MockRegisterComponent {}

@Component({ template: 'Landing Component' })
class MockLandingComponent {}

@Component({ template: 'Profile Component' })
class MockProfileComponent {}

describe('Routing and Guards Tests', () => {
  let router: Router;
  let location: Location;
  let authService: AuthService;
  let fixture: any;

  const mockUser = {
    id: 'user_123',
    username: 'test_user',
    email: 'test@example.com',
    full_name: 'Test User'
  };

  const routes = [
    { path: '', redirectTo: '/landing', pathMatch: 'full' },
    { path: 'landing', component: MockLandingComponent },
    { path: 'home', component: MockHomeComponent },
    { 
      path: 'dashboard', 
      component: MockDashboardComponent, 
      canActivate: [authGuard] 
    },
    { 
      path: 'profile', 
      component: MockProfileComponent, 
      canActivate: [authGuard] 
    },
    { 
      path: 'auth/login', 
      component: MockLoginComponent, 
      canActivate: [guestGuard] 
    },
    { 
      path: 'auth/register', 
      component: MockRegisterComponent, 
      canActivate: [guestGuard] 
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes(routes),
        HttpClientTestingModule
      ],
      declarations: [
        MockHomeComponent,
        MockDashboardComponent,
        MockLoginComponent,
        MockRegisterComponent,
        MockLandingComponent,
        MockProfileComponent
      ],
      providers: [AuthService]
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(MockHomeComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('Authentication Guard (authGuard)', () => {
    it('should allow access to protected routes for authenticated users', async () => {
      // Mock authenticated user
      authService['tokenSubject'].next('valid_token');
      authService['currentUserSubject'].next(mockUser);
      sessionStorage.setItem('access_token', 'valid_token');
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));
      
      // Navigate to protected route
      await router.navigate(['/dashboard']);
      
      expect(location.path()).toBe('/dashboard');
    });

    it('should redirect unauthenticated users to login', async () => {
      // Ensure user is not authenticated
      authService.logout();
      
      // Try to navigate to protected route
      await router.navigate(['/dashboard']);
      
      expect(location.path()).toBe('/auth/login?returnUrl=%2Fdashboard');
    });

    it('should redirect to login with return URL for protected routes', async () => {
      // Ensure user is not authenticated
      authService.logout();
      
      // Try to navigate to profile
      await router.navigate(['/profile']);
      
      expect(location.path()).toBe('/auth/login?returnUrl=%2Fprofile');
    });
  });

  describe('Guest Guard (guestGuard)', () => {
    it('should allow access to auth pages for unauthenticated users', async () => {
      // Ensure user is not authenticated
      authService.logout();
      
      // Navigate to login page
      await router.navigate(['/auth/login']);
      
      expect(location.path()).toBe('/auth/login');
    });

    it('should redirect authenticated users away from auth pages', async () => {
      // Mock authenticated user
      authService['tokenSubject'].next('valid_token');
      authService['currentUserSubject'].next(mockUser);
      sessionStorage.setItem('access_token', 'valid_token');
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));
      
      // Try to navigate to login page
      await router.navigate(['/auth/login']);
      
      expect(location.path()).toBe('/home');
    });

    it('should redirect authenticated users from register page to home', async () => {
      // Mock authenticated user
      authService['tokenSubject'].next('valid_token');
      authService['currentUserSubject'].next(mockUser);
      sessionStorage.setItem('access_token', 'valid_token');
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));
      
      // Try to navigate to register page
      await router.navigate(['/auth/register']);
      
      expect(location.path()).toBe('/home');
    });
  });

  describe('Navigation Flow', () => {
    it('should navigate to home after successful login', async () => {
      // Start unauthenticated
      authService.logout();
      
      // Simulate login success
      authService['tokenSubject'].next('valid_token');
      authService['currentUserSubject'].next(mockUser);
      sessionStorage.setItem('access_token', 'valid_token');
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));
      
      await router.navigate(['/home']);
      
      expect(location.path()).toBe('/home');
    });

    it('should navigate to home after successful registration', async () => {
      // Start unauthenticated
      authService.logout();
      
      // Simulate registration success (auto-login)
      authService['tokenSubject'].next('valid_token');
      authService['currentUserSubject'].next(mockUser);
      sessionStorage.setItem('access_token', 'valid_token');
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));
      
      await router.navigate(['/home']);
      
      expect(location.path()).toBe('/home');
    });

    it('should handle logout and redirect to landing', async () => {
      // Start authenticated
      authService['tokenSubject'].next('valid_token');
      authService['currentUserSubject'].next(mockUser);
      
      // Logout
      authService.logout();
      
      // Should be redirected to landing
      expect(location.path()).toBe('/landing');
    });

    it('should redirect root path to landing', async () => {
      await router.navigate(['']);
      expect(location.path()).toBe('/landing');
    });
  });

  describe('Return URL Functionality', () => {
    it('should store and use return URL after login', async () => {
      // Try to access protected route while unauthenticated
      authService.logout();
      await router.navigate(['/dashboard']);
      
      // Should be redirected to login with return URL
      expect(location.path()).toBe('/auth/login?returnUrl=%2Fdashboard');
      
      // Simulate successful login
      authService['tokenSubject'].next('valid_token');
      authService['currentUserSubject'].next(mockUser);
      sessionStorage.setItem('access_token', 'valid_token');
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));
      
      // Navigate to the return URL
      await router.navigate(['/dashboard']);
      
      expect(location.path()).toBe('/dashboard');
    });
  });

  describe('Session Management', () => {
    it('should maintain authentication state across page refresh simulation', () => {
      // Set up authenticated state
      const token = 'valid_token_with_future_exp';
      authService['tokenSubject'].next(token);
      authService['currentUserSubject'].next(mockUser);
      sessionStorage.setItem('access_token', token);
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));
      
      // Simulate page refresh by creating new auth service instance
      const newAuthService = new AuthService(TestBed.inject(HttpClientTestingModule) as any);
      
      // Should load stored auth
      expect(newAuthService.getCurrentUser()).toEqual(mockUser);
      expect(newAuthService.getToken()).toBe(token);
    });

    it('should clear invalid tokens on initialization', () => {
      // Set up invalid token (expired)
      const invalidToken = 'invalid_or_expired_token';
      sessionStorage.setItem('access_token', invalidToken);
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));
      
      // Create new auth service instance (simulates app restart)
      const newAuthService = new AuthService(TestBed.inject(HttpClientTestingModule) as any);
      
      // Should clear invalid auth
      expect(newAuthService.getCurrentUser()).toBeNull();
      expect(newAuthService.getToken()).toBeNull();
      expect(sessionStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle navigation to non-existent routes', async () => {
      await router.navigate(['/non-existent-route']);
      // Should redirect to landing (wildcard route)
      expect(location.path()).toBe('/landing');
    });

    it('should handle concurrent authentication state changes', async () => {
      // Simulate rapid auth state changes
      authService.logout();
      authService['tokenSubject'].next('token1');
      authService['tokenSubject'].next('token2');
      authService['currentUserSubject'].next(mockUser);
      
      expect(authService.getToken()).toBe('token2');
      expect(authService.getCurrentUser()).toEqual(mockUser);
    });

    it('should handle malformed session storage data', () => {
      // Set malformed user data
      sessionStorage.setItem('access_token', 'valid_token');
      sessionStorage.setItem('current_user', 'invalid_json');
      
      // Create new auth service instance
      const newAuthService = new AuthService(TestBed.inject(HttpClientTestingModule) as any);
      
      // Should handle gracefully
      expect(newAuthService.getCurrentUser()).toBeNull();
      expect(newAuthService.getToken()).toBeNull();
    });
  });
});

