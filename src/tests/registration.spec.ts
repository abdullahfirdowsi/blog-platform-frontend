import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';

import { AuthService } from '../app/core/services/auth.service';
import { RegisterComponent } from '../app/features/auth/pages/register/register.component';
import { environment } from '../environments/environment';

// Mock Home Component for testing
@Component({
  template: '<div>Mock Home Component</div>'
})
class MockHomeComponent {}

describe('Registration Component Tests', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  const mockUser = {
    id: 'user_456',
    username: 'john.doe@example.com',
    email: 'john.doe@example.com',
    full_name: 'John Doe',
    profile_picture: null,
    created_at: '2024-06-08T02:50:51Z',
    updated_at: '2024-06-08T02:50:51Z'
  };

  const mockRegisterResponse = {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_payload.signature',
    user: mockUser
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'home', component: MockHomeComponent },
          { path: 'auth/login', component: RegisterComponent }
        ]),
        ReactiveFormsModule,
        RegisterComponent
      ],
      providers: [AuthService]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('Form Validation', () => {
    it('should initialize with empty form', () => {
      expect(component.registerForm.get('full_name')?.value).toBe('');
      expect(component.registerForm.get('email')?.value).toBe('');
      expect(component.registerForm.get('password')?.value).toBe('');
      expect(component.registerForm.get('confirm_password')?.value).toBe('');
    });

    it('should validate required fields', () => {
      component.registerForm.get('full_name')?.setValue('');
      component.registerForm.get('email')?.setValue('');
      component.registerForm.get('password')?.setValue('');
      component.registerForm.get('confirm_password')?.setValue('');

      expect(component.registerForm.valid).toBeFalsy();
      expect(component.registerForm.get('full_name')?.hasError('required')).toBeTruthy();
      expect(component.registerForm.get('email')?.hasError('required')).toBeTruthy();
      expect(component.registerForm.get('password')?.hasError('required')).toBeTruthy();
      expect(component.registerForm.get('confirm_password')?.hasError('required')).toBeTruthy();
    });

    it('should validate email format', () => {
      component.registerForm.get('email')?.setValue('invalid-email');
      expect(component.registerForm.get('email')?.hasError('email')).toBeTruthy();

      component.registerForm.get('email')?.setValue('valid@example.com');
      expect(component.registerForm.get('email')?.hasError('email')).toBeFalsy();
    });

    it('should validate password strength', () => {
      // Weak password
      component.registerForm.get('password')?.setValue('weak');
      expect(component.registerForm.get('password')?.hasError('passwordStrength')).toBeTruthy();

      // Strong password
      component.registerForm.get('password')?.setValue('StrongPass123!');
      expect(component.registerForm.get('password')?.hasError('passwordStrength')).toBeFalsy();
    });

    it('should validate password confirmation', () => {
      component.registerForm.get('password')?.setValue('StrongPass123!');
      component.registerForm.get('confirm_password')?.setValue('DifferentPass123!');
      
      component.registerForm.get('confirm_password')?.updateValueAndValidity();
      expect(component.registerForm.get('confirm_password')?.hasError('passwordMismatch')).toBeTruthy();

      component.registerForm.get('confirm_password')?.setValue('StrongPass123!');
      component.registerForm.get('confirm_password')?.updateValueAndValidity();
      expect(component.registerForm.get('confirm_password')?.hasError('passwordMismatch')).toBeFalsy();
    });
  });

  describe('Registration Process', () => {
    beforeEach(() => {
      // Fill form with valid data
      component.registerForm.patchValue({
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'StrongPass123!',
        confirm_password: 'StrongPass123!'
      });
    });

    it('should register successfully and navigate to home', () => {
      const routerSpy = spyOn(router, 'navigate');
      
      component.onSubmit();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        username: 'john.doe@example.com',
        email: 'john.doe@example.com',
        full_name: 'John Doe',
        password: 'StrongPass123!',
        confirm_password: 'StrongPass123!'
      });

      req.flush(mockRegisterResponse);

      expect(component.successMessage).toBe('Registration successful! You have been automatically logged in.');
      expect(routerSpy).toHaveBeenCalledWith(['/home']);
    });

    it('should handle registration errors', () => {
      const errorResponse = {
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Email already registered' }
      };

      component.onSubmit();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      req.flush({ message: 'Email already registered' }, errorResponse);

      expect(component.errorMessage).toBe('Email already registered');
    });

    it('should update auth state after successful registration', () => {
      component.onSubmit();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      req.flush(mockRegisterResponse);

      // Check that auth service state is updated
      expect(authService.isAuthenticated()).toBeTruthy();
      expect(authService.getCurrentUser()).toEqual(mockUser);
      expect(sessionStorage.getItem('access_token')).toBe(mockRegisterResponse.access_token);
      expect(JSON.parse(sessionStorage.getItem('current_user') || '{}')).toEqual(mockUser);
    });
  });

  describe('Password Strength Indicator', () => {
    it('should calculate password strength correctly', () => {
      component.registerForm.get('password')?.setValue('');
      expect(component.passwordStrength).toBe(0);
      expect(component.getPasswordStrengthText()).toBe('');

      component.registerForm.get('password')?.setValue('weak');
      expect(component.passwordStrength).toBe(20); // Only length check passes
      expect(component.getPasswordStrengthText()).toBe('Weak');
      expect(component.getPasswordStrengthColor()).toBe('bg-red-500');

      component.registerForm.get('password')?.setValue('StrongPass123!');
      expect(component.passwordStrength).toBe(100); // All checks pass
      expect(component.getPasswordStrengthText()).toBe('Strong');
      expect(component.getPasswordStrengthColor()).toBe('bg-green-500');
    });
  });

  describe('User Experience', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBeFalsy();
      component.togglePasswordVisibility('password');
      expect(component.showPassword).toBeTruthy();

      expect(component.showConfirmPassword).toBeFalsy();
      component.togglePasswordVisibility('confirm');
      expect(component.showConfirmPassword).toBeTruthy();
    });

    it('should show appropriate error messages', () => {
      component.registerForm.get('full_name')?.setValue('');
      component.registerForm.get('full_name')?.markAsTouched();
      expect(component.getFieldError('full_name')).toBe('Full name is required');

      component.registerForm.get('email')?.setValue('invalid');
      component.registerForm.get('email')?.markAsTouched();
      expect(component.getFieldError('email')).toBe('Please enter a valid email address');
    });

    it('should prevent form submission with invalid data', () => {
      spyOn(authService, 'register');
      
      component.registerForm.patchValue({
        full_name: '',
        email: 'invalid-email',
        password: 'weak',
        confirm_password: 'different'
      });

      component.onSubmit();

      expect(authService.register).not.toHaveBeenCalled();
      expect(component.registerForm.get('full_name')?.touched).toBeTruthy();
      expect(component.registerForm.get('email')?.touched).toBeTruthy();
    });
  });

  describe('Integration with AuthService', () => {
    it('should subscribe to loading state', () => {
      expect(component.isLoading).toBeFalsy();
      
      // Simulate loading state change
      authService['isLoadingSubject'].next(true);
      expect(component.isLoading).toBeTruthy();

      authService['isLoadingSubject'].next(false);
      expect(component.isLoading).toBeFalsy();
    });
  });
});

