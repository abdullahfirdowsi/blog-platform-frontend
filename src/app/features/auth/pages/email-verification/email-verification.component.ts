import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-email-verification',
  imports: [CommonModule, RouterLink],
  templateUrl: './email-verification.component.html',
  styleUrls: ['./email-verification.component.css']
})
export class EmailVerificationComponent implements OnInit, OnDestroy {
  isLoading = true;
  isSuccess = false;
  errorMessage = '';
  canResend = false;
  resendingVerification = false;
  countdown = 3;
  showCountdown = false;
  private userEmail = '';
  private countdownInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get token from query parameters
    const token = this.route.snapshot.queryParamMap.get('token');
    
    if (!token) {
      this.isLoading = false;
      this.errorMessage = 'Invalid verification link. Please try again or request a new verification email.';
      this.canResend = true;
      return;
    }

    // Verify the email with the token
    this.authService.verifyEmail(token)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Email verification response:', response);
          this.isSuccess = true;
          this.showCountdown = true;
          
          // Start countdown timer
          this.startCountdown();
        },
        error: (error) => {
          console.error('Email verification error:', error);
          this.errorMessage = this.getEmailVerificationErrorMessage(error);
          this.canResend = true;
        }
      });
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.router.navigate(['/auth/login'], {
          queryParams: { message: 'Email verified successfully! You can now sign in.' }
        });
      }
    }, 1000);
  }

  resendVerification(): void {
    // For now, redirect to login where they can resend
    // In a full implementation, you might want to collect email here
    this.router.navigate(['/auth/login'], {
      queryParams: { message: 'Please enter your email to resend verification' }
    });
  }

  private getEmailVerificationErrorMessage(error: any): string {
    // Check for network errors first
    if (!error.error) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    const errorData = error.error;
    const statusCode = error.status;
    const message = errorData.message || errorData.detail || '';
    const lowerMessage = message.toLowerCase();

    // Handle specific email verification error scenarios
    if (lowerMessage.includes('token') && (lowerMessage.includes('expired') || lowerMessage.includes('expir'))) {
      return 'This verification link has expired. Please request a new verification email.';
    }

    if (lowerMessage.includes('token') && (lowerMessage.includes('invalid') || lowerMessage.includes('not found') || 
        lowerMessage.includes('malformed'))) {
      return 'This verification link is invalid or malformed. Please request a new verification email.';
    }

    if (lowerMessage.includes('token') && lowerMessage.includes('used')) {
      return 'This verification link has already been used. Your email may already be verified.';
    }

    if (lowerMessage.includes('already verified') || lowerMessage.includes('email already verified')) {
      return 'Your email address is already verified. You can sign in normally.';
    }

    if (lowerMessage.includes('user not found') || lowerMessage.includes('account not found')) {
      return 'The associated account was not found. The verification link may be for a different account.';
    }

    if (lowerMessage.includes('account disabled') || lowerMessage.includes('account suspended') || 
        lowerMessage.includes('account blocked')) {
      return 'Your account has been disabled. Please contact support for assistance.';
    }

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      return 'Too many verification attempts. Please wait a few minutes before trying again.';
    }

    if (lowerMessage.includes('maintenance') || lowerMessage.includes('unavailable')) {
      return 'The email verification service is temporarily unavailable. Please try again later.';
    }

    // Handle HTTP status codes
    switch (statusCode) {
      case 400:
        return 'Invalid verification request. The verification link may be malformed.';
      case 401:
      case 403:
        return 'This verification link has expired or is no longer valid. Please request a new one.';
      case 404:
        return 'The verification link is invalid or the associated account was not found.';
      case 409:
        return 'Your email address is already verified. You can sign in normally.';
      case 410:
        return 'This verification link has expired. Please request a new verification email.';
      case 422:
        return 'The verification link format is invalid. Please request a new verification email.';
      case 429:
        return 'Too many verification attempts. Please wait a few minutes before trying again.';
      case 500:
        return 'Server error occurred during verification. Please try again in a few moments.';
      case 503:
        return 'Email verification service is temporarily unavailable. Please try again later.';
      default:
        if (statusCode >= 500) {
          return 'Server error occurred. Please try again later.';
        }
        // Return original message if it's user-friendly
        if (message && message.length < 200 && !lowerMessage.includes('internal') && 
            !lowerMessage.includes('stack') && !lowerMessage.includes('traceback')) {
          return message;
        }
        return 'Email verification failed. Please request a new verification email.';
    }
  }
}

