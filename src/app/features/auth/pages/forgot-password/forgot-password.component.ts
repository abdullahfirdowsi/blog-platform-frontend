import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { takeUntil, Subject } from 'rxjs';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  isUnregisteredEmail = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
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

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.errorMessage = '';
      this.successMessage = '';
      this.isUnregisteredEmail = false;

      const email = this.forgotPasswordForm.value.email;

      this.authService.requestPasswordReset(email)
        .subscribe({
          next: () => {
            this.successMessage = 'Password reset instructions have been sent to your email address.';
            this.forgotPasswordForm.reset();
          },
          error: (error) => {
            console.error('Forgot password error:', error);
            this.errorMessage = this.getForgotPasswordErrorMessage(error);
          }
        });
    } else {
      this.forgotPasswordForm.get('email')?.markAsTouched();
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.forgotPasswordForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'Email is required';
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.forgotPasswordForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  private getForgotPasswordErrorMessage(error: any): string {
    // Reset unregistered email state
    this.isUnregisteredEmail = false;

    // Check for network errors first
    if (!error.error) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    const errorData = error.error;
    const statusCode = error.status;
    const message = errorData.message || errorData.detail || '';
    const lowerMessage = message.toLowerCase();

    // Handle 404 errors for unregistered email
    if (statusCode === 404) {
      this.isUnregisteredEmail = true;
      if (lowerMessage.includes('user not found') || lowerMessage.includes('email not found') || 
          lowerMessage.includes('account not found')) {
        return 'No account found with this email address. Please check your email or create a new account.';
      }
      return message || 'No account found with this email address.';
    }

    // Handle specific forgot password error scenarios
    if (lowerMessage.includes('user not found') || lowerMessage.includes('email not found') || 
        lowerMessage.includes('account not found')) {
      this.isUnregisteredEmail = true;
      return 'No account found with this email address. Please check your email or create a new account.';
    }

    if (lowerMessage.includes('already sent') || lowerMessage.includes('reset email already sent')) {
      return 'A password reset email was already sent recently. Please check your inbox or wait a few minutes before requesting another.';
    }

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests') || 
        lowerMessage.includes('too many attempts')) {
      return 'Too many password reset requests. Please wait a few minutes before trying again.';
    }

    if (lowerMessage.includes('email service') || lowerMessage.includes('smtp') || 
        lowerMessage.includes('mail server') || lowerMessage.includes('email delivery')) {
      return 'Email service is temporarily unavailable. Please try again later.';
    }

    if (lowerMessage.includes('invalid email') || lowerMessage.includes('email format')) {
      return 'Please enter a valid email address.';
    }

    if (lowerMessage.includes('account disabled') || lowerMessage.includes('account suspended') || 
        lowerMessage.includes('account blocked')) {
      return 'Your account has been disabled. Please contact support for assistance.';
    }

    if (lowerMessage.includes('maintenance') || lowerMessage.includes('unavailable')) {
      return 'The password reset service is temporarily unavailable. Please try again later.';
    }

    // Handle HTTP status codes
    switch (statusCode) {
      case 400:
        return 'Invalid email address provided. Please check your email and try again.';
      case 409:
        return 'A password reset email was already sent recently. Please check your inbox or wait before requesting another.';
      case 422:
        return 'Invalid email address format. Please enter a valid email address.';
      case 429:
        return 'Too many password reset requests. Please wait a few minutes before trying again.';
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
            !lowerMessage.includes('stack') && !lowerMessage.includes('error')) {
          return message;
        }
        return 'Failed to send password reset email. Please try again.';
    }
  }
}
