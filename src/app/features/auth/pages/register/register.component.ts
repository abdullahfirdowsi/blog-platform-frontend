import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { takeUntil, Subject } from 'rxjs';

// Custom validator for password confirmation
export function passwordMatchValidator(passwordField: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent) {
      return null;
    }
    const password = control.parent.get(passwordField);
    const confirmPassword = control;

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  };
}

// Custom validator for password strength
export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null;
    }

    const hasNumber = /[0-9]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasSpecial = /[^A-Za-z0-9]/.test(value);
    
    const valid = hasNumber && hasUpper && hasLower && hasSpecial;
    if (!valid) {
      return { passwordStrength: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-register',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit, OnDestroy {
  
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  passwordStrength = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator()]],
      confirm_password: ['', [Validators.required, passwordMatchValidator('password')]]
    });

    // Watch password changes for strength indicator
    this.registerForm.get('password')?.valueChanges.subscribe(password => {
      this.calculatePasswordStrength(password);
      // Revalidate confirm password when password changes
      this.registerForm.get('confirm_password')?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    // Subscribe to auth loading state
    this.authService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private calculatePasswordStrength(password: string): void {
    if (!password) {
      this.passwordStrength = 0;
      return;
    }

    let strength = 0;
    const checks = [
      /.{8,}/, // at least 8 characters
      /[a-z]/, // lowercase
      /[A-Z]/, // uppercase
      /[0-9]/, // numbers
      /[^A-Za-z0-9]/ // special characters
    ];

    checks.forEach(check => {
      if (check.test(password)) {
        strength += 20;
      }
    });

    this.passwordStrength = strength;
  }

  getPasswordStrengthText(): string {
    if (this.passwordStrength === 0) return '';
    if (this.passwordStrength <= 40) return 'Weak';
    if (this.passwordStrength <= 60) return 'Fair';
    if (this.passwordStrength <= 80) return 'Good';
    return 'Strong';
  }

  getPasswordStrengthColor(): string {
    if (this.passwordStrength <= 40) return 'bg-red-500';
    if (this.passwordStrength <= 60) return 'bg-yellow-500';
    if (this.passwordStrength <= 80) return 'bg-blue-500';
    return 'bg-green-500';
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.errorMessage = '';
      this.successMessage = '';

      const normalizedEmail = this.registerForm.value.email.toLowerCase().trim();
      // Extract username from email (part before @)
      const extractedUsername = normalizedEmail.split('@')[0];
      const userData = {
        username: extractedUsername, // Use name before @ as username
        email: normalizedEmail,
        password: this.registerForm.value.password,
        confirm_password: this.registerForm.value.confirm_password
      };

      this.authService.register(userData)
        .subscribe({
          next: (response) => {
            console.log('Registration response:', response);
            
            // Check if this is email verification flow or direct login
            if (response.message && response.message.includes('verify your email')) {
              this.successMessage = response.message;
            } else if (response.user && response.user.email_verified === false) {
              this.successMessage = 'Registration successful! Please check your email to verify your account before logging in.';
            } else {
              this.successMessage = 'Registration successful! Please log in with your credentials.';
            }
            
            // Navigate to login page after successful registration
            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 3000); // Extended time to read verification message
          },
          error: (error) => {
            console.error('Registration error:', error);
            this.errorMessage = this.getRegistrationErrorMessage(error);
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
    }
  }

  togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldDisplayName(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['pattern'] && fieldName === 'username') {
        return 'Username can only contain letters, numbers, and underscores';
      }
      if (field.errors['passwordStrength']) {
        return 'Password must contain uppercase, lowercase, number, and special character';
      }
      if (field.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
    }
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: Record<string, string> = {
      username: 'Username',
      email: 'Email',
      password: 'Password',
      confirm_password: 'Confirm password'
    };
    return displayNames[fieldName] || fieldName;
  }

  private getRegistrationErrorMessage(error: any): string {
    // Check for network errors first
    if (!error.error) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    const errorData = error.error;
    const statusCode = error.status;

    // Handle specific server error messages
    if (errorData.message || errorData.detail) {
      const message = (errorData.message || errorData.detail).toLowerCase();
      
      // Email already exists
      if (message.includes('email') && (message.includes('already') || message.includes('exists') || message.includes('taken'))) {
        return 'This email address is already registered. Please use a different email or try signing in instead.';
      }
      
      // Username already exists
      if (message.includes('username') && (message.includes('already') || message.includes('exists') || message.includes('taken'))) {
        return 'This username is already taken. Please choose a different username.';
      }
      
      // User already exists (general)
      if (message.includes('user') && (message.includes('already') || message.includes('exists'))) {
        return 'An account with these details already exists. Please try signing in or use different information.';
      }
      
      // Password validation errors
      if (message.includes('password')) {
        if (message.includes('weak') || message.includes('strength')) {
          return 'Password is too weak. Please include uppercase, lowercase, numbers, and special characters.';
        }
        if (message.includes('match')) {
          return 'Passwords do not match. Please ensure both password fields are identical.';
        }
        if (message.includes('length') || message.includes('short')) {
          return 'Password is too short. Please use at least 8 characters.';
        }
        return 'Invalid password. Please check the password requirements.';
      }
      
      // Email validation errors
      if (message.includes('email') && (message.includes('invalid') || message.includes('format'))) {
        return 'Please enter a valid email address.';
      }
      
      // Username validation errors
      if (message.includes('username') && message.includes('invalid')) {
        return 'Username contains invalid characters. Please use only letters, numbers, and underscores.';
      }
      
      // Rate limiting
      if (message.includes('rate') || message.includes('limit') || message.includes('many requests')) {
        return 'Too many registration attempts. Please wait a few minutes before trying again.';
      }
      
      // Server maintenance
      if (message.includes('maintenance') || message.includes('unavailable')) {
        return 'The service is temporarily unavailable. Please try again later.';
      }
      
      // Return the original message if it's user-friendly
      if (errorData.message.length < 200 && !message.includes('internal') && !message.includes('error')) {
        return errorData.message;
      }
    }

    // Handle field-specific errors
    if (errorData.email) {
      if (Array.isArray(errorData.email)) {
        return errorData.email[0] || 'Email address is invalid.';
      }
      return 'This email address is already registered. Please use a different email.';
    }

    if (errorData.username) {
      if (Array.isArray(errorData.username)) {
        return errorData.username[0] || 'Username is invalid.';
      }
      return 'This username is already taken. Please choose a different username.';
    }

    if (errorData.password) {
      if (Array.isArray(errorData.password)) {
        return errorData.password[0] || 'Password does not meet requirements.';
      }
      return 'Password does not meet the security requirements.';
    }

    // Handle HTTP status codes
    switch (statusCode) {
      case 400:
        return 'Invalid registration information provided. Please check all fields and try again.';
      case 409:
        return 'An account with this email or username already exists. Please use different information.';
      case 422:
        return 'The information provided is invalid. Please check all fields and try again.';
      case 429:
        return 'Too many registration attempts. Please wait a few minutes before trying again.';
      case 500:
        return 'Server error occurred. Please try again in a few moments.';
      case 503:
        return 'Registration service is temporarily unavailable. Please try again later.';
      default:
        if (statusCode >= 500) {
          return 'Server error occurred. Please try again later.';
        }
        return 'Registration failed. Please check your information and try again.';
    }
  }
}
