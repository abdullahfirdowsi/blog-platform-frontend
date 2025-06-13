import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { finalize, takeUntil, Subject } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy {
  
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  returnUrl = '/';
  showPassword = false;
  isEmailUnverified = false;
  resendingVerification = false;
  verificationSentMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Get return url from route parameters or default to '/home'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
    
    // Check for success message from email verification
    const message = this.route.snapshot.queryParams['message'];
    if (message) {
      this.verificationSentMessage = message;
    }
    
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
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
    if (this.loginForm.valid) {
      this.errorMessage = '';

      const credentials = {
        email: this.loginForm.value.email.toLowerCase().trim(),
        password: this.loginForm.value.password
      };

      this.authService.login(credentials)
        .subscribe({
          next: (response) => {
            this.router.navigate([this.returnUrl]);
          },
          error: (error) => {
            console.error('Login error:', error);
            this.errorMessage = this.getLoginErrorMessage(error);
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        return `Password must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
    }
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }
  
  resendVerificationEmail(): void {
    if (!this.loginForm.value.email) {
      this.errorMessage = 'Please enter your email address first.';
      return;
    }

    this.resendingVerification = true;
    this.verificationSentMessage = '';
    
    const email = this.loginForm.value.email.toLowerCase().trim();
    
    this.authService.resendVerificationEmail(email)
      .pipe(
        finalize(() => {
          this.resendingVerification = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.verificationSentMessage = 'Verification email sent! Please check your inbox.';
          this.errorMessage = '';
        },
        error: (error) => {
          console.error('Resend verification error:', error);
          this.errorMessage = this.getVerificationErrorMessage(error);
        }
      });
  }

  private getLoginErrorMessage(error: any): string {
    // Reset email verification state
    this.isEmailUnverified = false;

    // Check for network errors first
    if (!error.error) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    const errorData = error.error;
    const statusCode = error.status;
    const message = errorData.message || errorData.detail || '';
    const lowerMessage = message.toLowerCase();

    // Check if error is related to email verification
    if (statusCode === 403 && lowerMessage.includes('verify your email')) {
      this.isEmailUnverified = true;
      return message || 'Please verify your email address before signing in. Check your inbox for the verification link.';
    }

    // Handle specific login error scenarios
    if (lowerMessage.includes('invalid credentials') || lowerMessage.includes('incorrect') || 
        lowerMessage.includes('wrong password') || lowerMessage.includes('authentication failed')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }

    if (lowerMessage.includes('user not found') || lowerMessage.includes('account not found') || 
        lowerMessage.includes('email not found')) {
      return 'No account found with this email address. Please check your email or create a new account.';
    }

    if (lowerMessage.includes('account disabled') || lowerMessage.includes('account suspended') || 
        lowerMessage.includes('account blocked')) {
      return 'Your account has been disabled. Please contact support for assistance.';
    }

    if (lowerMessage.includes('account locked') || lowerMessage.includes('too many attempts') || 
        lowerMessage.includes('temporarily locked')) {
      return 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later or reset your password.';
    }

    if (lowerMessage.includes('email not verified') || lowerMessage.includes('unverified email')) {
      this.isEmailUnverified = true;
      return 'Please verify your email address before signing in. Check your inbox for the verification link.';
    }

    if (lowerMessage.includes('password expired')) {
      return 'Your password has expired. Please reset your password to continue.';
    }

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      return 'Too many login attempts. Please wait a few minutes before trying again.';
    }

    if (lowerMessage.includes('maintenance') || lowerMessage.includes('unavailable')) {
      return 'The login service is temporarily unavailable. Please try again later.';
    }

    // Handle HTTP status codes
    switch (statusCode) {
      case 400:
        return 'Invalid login information provided. Please check your email and password.';
      case 401:
        return 'Invalid email or password. Please check your credentials and try again.';
      case 403:
        return 'Access denied. Your account may be disabled or restricted.';
      case 404:
        return 'No account found with this email address. Please check your email or create a new account.';
      case 429:
        return 'Too many login attempts. Please wait a few minutes before trying again.';
      case 500:
        return 'Server error occurred. Please try again in a few moments.';
      case 503:
        return 'Login service is temporarily unavailable. Please try again later.';
      default:
        if (statusCode >= 500) {
          return 'Server error occurred. Please try again later.';
        }
        // Return original message if it's user-friendly, otherwise use generic message
        if (message && message.length < 200 && !lowerMessage.includes('internal') && !lowerMessage.includes('stack')) {
          return message;
        }
        return 'Login failed. Please check your credentials and try again.';
    }
  }

  private getVerificationErrorMessage(error: any): string {
    // Check for network errors first
    if (!error.error) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    const errorData = error.error;
    const statusCode = error.status;
    const message = errorData.message || errorData.detail || '';
    const lowerMessage = message.toLowerCase();

    // Handle specific verification email errors
    if (lowerMessage.includes('already verified')) {
      return 'Your email address is already verified. You can sign in normally.';
    }

    if (lowerMessage.includes('user not found') || lowerMessage.includes('email not found')) {
      return 'No account found with this email address. Please check your email or create a new account.';
    }

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      return 'Too many verification email requests. Please wait a few minutes before trying again.';
    }

    if (lowerMessage.includes('email service') || lowerMessage.includes('smtp') || lowerMessage.includes('mail server')) {
      return 'Email service is temporarily unavailable. Please try again later.';
    }

    // Handle HTTP status codes
    switch (statusCode) {
      case 400:
        return 'Invalid email address provided. Please check your email and try again.';
      case 404:
        return 'No account found with this email address. Please check your email or create a new account.';
      case 429:
        return 'Too many verification email requests. Please wait a few minutes before trying again.';
      case 500:
        return 'Server error occurred. Please try again in a few moments.';
      case 503:
        return 'Email service is temporarily unavailable. Please try again later.';
      default:
        if (statusCode >= 500) {
          return 'Server error occurred. Please try again later.';
        }
        // Return original message if it's user-friendly
        if (message && message.length < 200 && !lowerMessage.includes('internal')) {
          return message;
        }
        return 'Failed to send verification email. Please try again.';
    }
  }
}
