import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';

import { AuthService } from '../app/core/services/auth.service';
import { RegisterComponent } from '../app/features/auth/pages/register/register.component';
import { LoginComponent } from '../app/features/auth/pages/login/login.component';
import { HomeComponent } from '../app/features/home/pages/home/home.component';
import { environment } from '../environments/environment';
import { authGuard, guestGuard } from '../app/core/guards/auth.guard';

// Mock components
@Component({ template: 'Mock Dashboard' })
class MockDashboardComponent {}

@Component({ template: 'Mock Profile' })
class MockProfileComponent {}

@Component({ template: 'Mock Landing' })
class MockLandingComponent {}

describe('Complete User Flow Integration Tests', () => {
  let router: Router;
  let location: Location;
  let authService: AuthService;
  let httpMock: HttpTestingController;
  
  const mockUser = {
    id: 'user_123',
    username: 'test_user@example.com',
    email: 'test_user@example.com',
    full_name: 'Test User',
    profile_picture: null,
    created_at: '2024-06-08T02:50:51Z',
    updated_at: '2024-06-08T02:50:51Z'
  };

  const mockAuthResponse = {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_payload.signature',
    user: mockUser
  };

  const routes = [
    { path: '', redirectTo: '/landing', pathMatch: 'full' },
    { path: 'landing', component: MockLandingComponent },
    { path: 'home', component: HomeComponent },
    { path: 'dashboard', component: MockDashboardComponent, canActivate: [authGuard] },
    { path: 'profile', component: MockProfileComponent, canActivate: [authGuard] },
    { path: 'auth/login', component: LoginComponent, canActivate: [guestGuard] },
    { path: 'auth/register', component: RegisterComponent, canActivate: [guestGuard] },
    { path: '**', redirectTo: '/landing' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes(routes),
        ReactiveFormsModule,
        RegisterComponent,
        LoginComponent,
        HomeComponent
      ],
      declarations: [
        MockDashboardComponent,
        MockProfileComponent,
        MockLandingComponent
      ],
      providers: [AuthService]
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('Complete Registration Flow', () => {
    it('should complete full registration flow with immediate user data availability', async () => {
      // Step 1: Navigate to registration page
      await router.navigate(['/auth/register']);
      expect(location.path()).toBe('/auth/register');

      // Step 2: Create and setup registration component
      const registerFixture = TestBed.createComponent(RegisterComponent);
      const registerComponent = registerFixture.componentInstance;
      registerFixture.detectChanges();

      // Step 3: Fill registration form
      registerComponent.registerForm.patchValue({
        full_name: 'Test User',
        email: 'test_user@example.com',
        password: 'StrongPass123!',
        confirm_password: 'StrongPass123!'
      });

      expect(registerComponent.registerForm.valid).toBeTruthy();

      // Step 4: Submit registration
      registerComponent.onSubmit();

      // Step 5: Mock backend response
      const registerReq = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(registerReq.request.method).toBe('POST');
      expect(registerReq.request.body).toEqual({
        username: 'test_user@example.com',
        email: 'test_user@example.com',
        full_name: 'Test User',
        password: 'StrongPass123!',
        confirm_password: 'StrongPass123!'
      });

      registerReq.flush(mockAuthResponse);

      // Step 6: Verify authentication state is immediately updated
      expect(authService.isAuthenticated()).toBeTruthy();
      expect(authService.getCurrentUser()).toEqual(mockUser);
      expect(sessionStorage.getItem('access_token')).toBe(mockAuthResponse.access_token);
      expect(JSON.parse(sessionStorage.getItem('current_user') || '{}')).toEqual(mockUser);

      // Step 7: Navigate to home (simulating registration success navigation)
      await router.navigate(['/home']);
      expect(location.path()).toBe('/home');

      // Step 8: Create and verify home component receives user data immediately
      const homeFixture = TestBed.createComponent(HomeComponent);
      const homeComponent = homeFixture.componentInstance;
      homeFixture.detectChanges();

      // Step 9: Verify user data is available immediately in HomeComponent
      expect(homeComponent.isAuthenticated).toBeTruthy();
      expect(homeComponent.currentUser).toEqual(mockUser);
      expect(homeComponent.getDefaultAvatar()).toContain('Test%20User');
      expect(homeComponent.getDefaultAvatar()).toContain('ui-avatars.com');

      console.log('✅ Registration flow completed with immediate user data availability');
    });
  });

  describe('Complete Login Flow', () => {
    it('should complete full login flow with user data consistency', async () => {
      // Step 1: Navigate to login page
      await router.navigate(['/auth/login']);
      expect(location.path()).toBe('/auth/login');

      // Step 2: Create and setup login component
      const loginFixture = TestBed.createComponent(LoginComponent);
      const loginComponent = loginFixture.componentInstance;
      loginFixture.detectChanges();

      // Step 3: Fill login form
      loginComponent.loginForm.patchValue({
        email: 'test_user@example.com',
        password: 'StrongPass123!'
      });

      expect(loginComponent.loginForm.valid).toBeTruthy();

      // Step 4: Submit login
      loginComponent.onSubmit();

      // Step 5: Mock backend response
      const loginReq = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(loginReq.request.method).toBe('POST');
      expect(loginReq.request.body).toEqual({
        email: 'test_user@example.com',
        password: 'StrongPass123!'
      });

      loginReq.flush(mockAuthResponse);

      // Step 6: Verify authentication state
      expect(authService.isAuthenticated()).toBeTruthy();
      expect(authService.getCurrentUser()).toEqual(mockUser);

      // Step 7: Navigate to home
      await router.navigate(['/home']);
      expect(location.path()).toBe('/home');

      // Step 8: Verify home component state
      const homeFixture = TestBed.createComponent(HomeComponent);
      const homeComponent = homeFixture.componentInstance;
      homeFixture.detectChanges();

      expect(homeComponent.isAuthenticated).toBeTruthy();
      expect(homeComponent.currentUser).toEqual(mockUser);

      console.log('✅ Login flow completed with consistent user data');
    });
  });

  describe('Registration vs Login Flow Comparison', () => {
    it('should produce identical results for registration and login flows', async () => {
      // Test Registration Flow
      const registrationFixture = TestBed.createComponent(RegisterComponent);
      const registrationComponent = registrationFixture.componentInstance;
      registrationFixture.detectChanges();

      registrationComponent.registerForm.patchValue({
        full_name: 'Test User',
        email: 'test_user@example.com',
        password: 'StrongPass123!',
        confirm_password: 'StrongPass123!'
      });

      registrationComponent.onSubmit();
      const registerReq = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      registerReq.flush(mockAuthResponse);

      // Capture registration auth state
      const registrationAuthState = {
        isAuthenticated: authService.isAuthenticated(),
        currentUser: authService.getCurrentUser(),
        token: authService.getToken(),
        sessionUser: JSON.parse(sessionStorage.getItem('current_user') || 'null'),
        sessionToken: sessionStorage.getItem('access_token')
      };

      // Create home component for registration flow
      const homeAfterRegistration = TestBed.createComponent(HomeComponent);
      const homeComponentRegistration = homeAfterRegistration.componentInstance;
      homeAfterRegistration.detectChanges();

      const registrationUIState = {
        isAuthenticated: homeComponentRegistration.isAuthenticated,
        currentUser: homeComponentRegistration.currentUser,
        defaultAvatar: homeComponentRegistration.getDefaultAvatar()
      };

      // Reset for login test
      authService.logout();
      sessionStorage.clear();

      // Test Login Flow
      const loginFixture = TestBed.createComponent(LoginComponent);
      const loginComponent = loginFixture.componentInstance;
      loginFixture.detectChanges();

      loginComponent.loginForm.patchValue({
        email: 'test_user@example.com',
        password: 'StrongPass123!'
      });

      loginComponent.onSubmit();
      const loginReq = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      loginReq.flush(mockAuthResponse);

      // Capture login auth state
      const loginAuthState = {
        isAuthenticated: authService.isAuthenticated(),
        currentUser: authService.getCurrentUser(),
        token: authService.getToken(),
        sessionUser: JSON.parse(sessionStorage.getItem('current_user') || 'null'),
        sessionToken: sessionStorage.getItem('access_token')
      };

      // Create home component for login flow
      const homeAfterLogin = TestBed.createComponent(HomeComponent);
      const homeComponentLogin = homeAfterLogin.componentInstance;
      homeAfterLogin.detectChanges();

      const loginUIState = {
        isAuthenticated: homeComponentLogin.isAuthenticated,
        currentUser: homeComponentLogin.currentUser,
        defaultAvatar: homeComponentLogin.getDefaultAvatar()
      };

      // Compare states
      expect(registrationAuthState.isAuthenticated).toBe(loginAuthState.isAuthenticated);
      expect(registrationAuthState.currentUser).toEqual(loginAuthState.currentUser);
      expect(registrationAuthState.token).toBe(loginAuthState.token);
      expect(registrationAuthState.sessionUser).toEqual(loginAuthState.sessionUser);
      expect(registrationAuthState.sessionToken).toBe(loginAuthState.sessionToken);

      expect(registrationUIState.isAuthenticated).toBe(loginUIState.isAuthenticated);
      expect(registrationUIState.currentUser).toEqual(loginUIState.currentUser);
      expect(registrationUIState.defaultAvatar).toBe(loginUIState.defaultAvatar);

      console.log('✅ Registration and login flows produce identical results');
    });
  });

  describe('Protected Route Access After Authentication', () => {
    it('should allow access to protected routes after successful registration', async () => {
      // Complete registration
      const registerFixture = TestBed.createComponent(RegisterComponent);
      const registerComponent = registerFixture.componentInstance;
      registerFixture.detectChanges();

      registerComponent.registerForm.patchValue({
        full_name: 'Test User',
        email: 'test_user@example.com',
        password: 'StrongPass123!',
        confirm_password: 'StrongPass123!'
      });

      registerComponent.onSubmit();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      req.flush(mockAuthResponse);

      // Test access to protected routes
      await router.navigate(['/dashboard']);
      expect(location.path()).toBe('/dashboard');

      await router.navigate(['/profile']);
      expect(location.path()).toBe('/profile');

      console.log('✅ Protected routes accessible after registration');
    });

    it('should block access to auth pages after authentication', async () => {
      // Set authenticated state
      authService['tokenSubject'].next(mockAuthResponse.access_token);
      authService['currentUserSubject'].next(mockUser);
      sessionStorage.setItem('access_token', mockAuthResponse.access_token);
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));

      // Try to access auth pages
      await router.navigate(['/auth/login']);
      expect(location.path()).toBe('/home');

      await router.navigate(['/auth/register']);
      expect(location.path()).toBe('/home');

      console.log('✅ Auth pages blocked for authenticated users');
    });
  });

  describe('Session Persistence', () => {
    it('should maintain authentication across simulated page refresh', async () => {
      // Complete authentication
      authService['tokenSubject'].next(mockAuthResponse.access_token);
      authService['currentUserSubject'].next(mockUser);
      sessionStorage.setItem('access_token', mockAuthResponse.access_token);
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));

      // Simulate page refresh by creating new auth service
      const newAuthService = new AuthService(TestBed.inject(HttpClientTestingModule) as any);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify session persistence
      expect(newAuthService.getCurrentUser()).toEqual(mockUser);
      expect(newAuthService.getToken()).toBe(mockAuthResponse.access_token);

      console.log('✅ Session persists across page refresh');
    });
  });

  describe('Logout Flow', () => {
    it('should complete logout flow and redirect to landing', async () => {
      // Set authenticated state
      authService['tokenSubject'].next(mockAuthResponse.access_token);
      authService['currentUserSubject'].next(mockUser);
      sessionStorage.setItem('access_token', mockAuthResponse.access_token);
      sessionStorage.setItem('current_user', JSON.stringify(mockUser));

      // Navigate to home
      await router.navigate(['/home']);
      const homeFixture = TestBed.createComponent(HomeComponent);
      const homeComponent = homeFixture.componentInstance;
      homeFixture.detectChanges();

      // Perform logout
      homeComponent.logout();

      // Mock logout request
      const logoutReq = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      logoutReq.flush({});

      // Verify logout state
      expect(authService.isAuthenticated()).toBeFalsy();
      expect(authService.getCurrentUser()).toBeNull();
      expect(sessionStorage.getItem('access_token')).toBeNull();
      expect(location.path()).toBe('/landing');

      // Verify protected routes are blocked
      await router.navigate(['/dashboard']);
      expect(location.path()).toBe('/auth/login?returnUrl=%2Fdashboard');

      console.log('✅ Logout flow completed successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle registration errors gracefully', async () => {
      const registerFixture = TestBed.createComponent(RegisterComponent);
      const registerComponent = registerFixture.componentInstance;
      registerFixture.detectChanges();

      registerComponent.registerForm.patchValue({
        full_name: 'Test User',
        email: 'existing@example.com',
        password: 'StrongPass123!',
        confirm_password: 'StrongPass123!'
      });

      registerComponent.onSubmit();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      req.flush(
        { message: 'Email already registered' },
        { status: 400, statusText: 'Bad Request' }
      );

      expect(registerComponent.errorMessage).toBe('Email already registered');
      expect(authService.isAuthenticated()).toBeFalsy();
      expect(location.path()).toBe('/auth/register');

      console.log('✅ Registration errors handled gracefully');
    });

    it('should handle login errors gracefully', async () => {
      const loginFixture = TestBed.createComponent(LoginComponent);
      const loginComponent = loginFixture.componentInstance;
      loginFixture.detectChanges();

      loginComponent.loginForm.patchValue({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      });

      loginComponent.onSubmit();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(
        { message: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' }
      );

      expect(loginComponent.errorMessage).toBe('Invalid credentials');
      expect(authService.isAuthenticated()).toBeFalsy();

      console.log('✅ Login errors handled gracefully');
    });
  });
});

