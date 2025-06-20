import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { takeUntil, Subject } from 'rxjs';

// Password match validator
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

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  resetPasswordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  token = '';
  passwordStrength = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required, passwordMatchValidator('new_password')]]
    });

    // Watch password changes for strength indicator
    this.resetPasswordForm.get('new_password')?.valueChanges.subscribe(password => {
      this.calculatePasswordStrength(password);
      // Revalidate confirm password when password changes
      this.resetPasswordForm.get('confirm_password')?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    // Get token from query params
    this.token = this.route.snapshot.queryParams['token'];
    
    if (!this.token) {
      this.errorMessage = 'Invalid or missing reset token.';
      return;
    }

    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }

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
    if (this.resetPasswordForm.valid && this.token) {
      this.errorMessage = '';
      this.successMessage = '';

      const newPassword = this.resetPasswordForm.value.new_password;

      this.authService.resetPassword(this.token, newPassword)
        .subscribe({
          next: () => {
            this.successMessage = 'Password reset successfully! You can now sign in with your new password.';
            this.resetPasswordForm.reset();
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 3000);
          },
          error: (error) => {
            console.error('Reset password error:', error);
            this.errorMessage = this.getResetPasswordErrorMessage(error);
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.resetPasswordForm.controls).forEach(key => {
        this.resetPasswordForm.get(key)?.markAsTouched();
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
    const field = this.resetPasswordForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (field.errors['minlength']) {
        return `Password must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
    }
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.resetPasswordForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: Record<string, string> = {
      new_password: 'Password',
      confirm_password: 'Confirm password'
    };
    return displayNames[fieldName] || fieldName;
  }

  private getResetPasswordErrorMessage(error: any): string {
    // Check for network errors first
    if (!error.error) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    const errorData = error.error;
    const statusCode = error.status;
    const message = errorData.message || errorData.detail || '';
    const lowerMessage = message.toLowerCase();

    // Handle specific reset password error scenarios
    if (lowerMessage.includes('token') && (lowerMessage.includes('expired') || lowerMessage.includes('invalid') || 
        lowerMessage.includes('not found'))) {
      return 'The password reset link has expired or is invalid. Please request a new password reset.';
    }

    if (lowerMessage.includes('token') && lowerMessage.includes('used')) {
      return 'This password reset link has already been used. Please request a new password reset if needed.';
    }

    if (lowerMessage.includes('password') && (lowerMessage.includes('weak') || lowerMessage.includes('strength'))) {
      return 'Password is too weak. Please include uppercase, lowercase, numbers, and special characters.';
    }

    if (lowerMessage.includes('password') && (lowerMessage.includes('short') || lowerMessage.includes('length'))) {
      return 'Password is too short. Please use at least 8 characters.';
    }

    if (lowerMessage.includes('password') && lowerMessage.includes('common')) {
      return 'This password is too common. Please choose a more unique password.';
    }

    if (lowerMessage.includes('password') && lowerMessage.includes('match')) {
      return 'Passwords do not match. Please ensure both password fields are identical.';
    }

    if (lowerMessage.includes('user not found') || lowerMessage.includes('account not found')) {
      return 'The associated account was not found. Please request a new password reset.';
    }

    if (lowerMessage.includes('account disabled') || lowerMessage.includes('account suspended') || 
        lowerMessage.includes('account blocked')) {
      return 'Your account has been disabled. Please contact support for assistance.';
    }

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests') || 
        lowerMessage.includes('too many attempts')) {
      return 'Too many password reset attempts. Please wait a few minutes before trying again.';
    }

    if (lowerMessage.includes('maintenance') || lowerMessage.includes('unavailable')) {
      return 'The password reset service is temporarily unavailable. Please try again later.';
    }

    // Handle HTTP status codes
    switch (statusCode) {
      case 400:
        if (errorData.new_password && Array.isArray(errorData.new_password)) {
          return errorData.new_password[0] || 'Invalid password provided. Please check the password requirements.';
        }
        return 'Invalid password reset information provided. Please check all fields.';
      case 401:
      case 403:
        return 'The password reset link has expired or is invalid. Please request a new password reset.';
      case 404:
        return 'The password reset link is invalid or the associated account was not found.';
      case 422:
        if (errorData.new_password && Array.isArray(errorData.new_password)) {
          return errorData.new_password[0] || 'Password does not meet requirements.';
        }
        return 'The password provided does not meet security requirements.';
      case 429:
        return 'Too many password reset attempts. Please wait a few minutes before trying again.';
      case 500:
        return 'Server error occurred. Please try again in a few moments.';
      case 503:
        return 'Password reset service is temporarily unavailable. Please try again later.';
      default:
        if (statusCode >= 500) {
          return 'Server error occurred. Please try again later.';
        }
        // Return original message if it's user-friendly
        if (message && message.length < 200 && !lowerMessage.includes('internal') && 
            !lowerMessage.includes('stack') && !lowerMessage.includes('traceback')) {
          return message;
        }
        return 'Failed to reset password. The reset link may be expired or invalid.';
    }
  }
}
