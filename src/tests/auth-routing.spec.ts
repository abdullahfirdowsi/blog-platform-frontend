import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

import { AuthService } from '../app/core/services/auth.service';
import { LoginComponent } from '../app/features/auth/pages/login/login.component';
import { RegisterComponent } from '../app/features/auth/pages/register/register.component';
import { HomeComponent } from '../app/features/home/pages/home/home.component';
import { environment } from '../environments/environment';
import { User, LoginResponse } from '../app/shared/interfaces';

describe('Authentication and Routing Tests', () => {
  let authService: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;
  let fixture: ComponentFixture<any>;
  let component: any;

  const mockUser = {
    id: 'user_123',
    username: 'test_user',
    email: 'test_user@example.com',
    full_name: 'Test User'
  };

  const mockLoginResponse = {
    access_token: 'mock_token',
    user: mockUser
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'home', component: HomeComponent },
          { path: 'auth/login', component: LoginComponent },
          { path: 'auth/register', component: RegisterComponent }
        ]),
        ReactiveFormsModule
      ],
      providers: [AuthService]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('Login Flow', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(LoginComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should login successfully and navigate to home', async () => {
      const credentials = { email: 'test_user@example.com', password: 'password123' };

      const routerSpy = spyOn(router, 'navigate');

      authService.login(credentials).subscribe(response => {
        expect(response).toEqual(mockLoginResponse);
        expect(authService.isAuthenticated()).toBe(true);
        expect(routerSpy).toHaveBeenCalledWith(['/home']);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockLoginResponse);
    });

    it('should handle login errors', async () => {
      const credentials = { email: 'wrong@example.com', password: 'wrongpass' };
      const errorResponse = { status: 401, statusText: 'Unauthorized' };

      authService.login(credentials).subscribe({
        next: () => fail('expected an error'),
        error: error => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({}, errorResponse);
    });
  });

  describe('Routing Guards', () => {
    it('should allow access to routes for authenticated users', () => {
      authService['currentUserSubject'].next(mockUser);
      authService['tokenSubject'].next(mockLoginResponse.access_token);

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should block access for unauthenticated users', () => {
      authService.logout();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});

