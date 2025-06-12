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
          const errorMsg = error.error?.message || error.error?.detail || '';
          
          if (errorMsg.includes('expired')) {
            this.errorMessage = 'This verification link has expired. Please request a new one.';
            this.canResend = true;
          } else if (errorMsg.includes('invalid')) {
            this.errorMessage = 'This verification link is invalid. Please try again or request a new one.';
            this.canResend = true;
          } else {
            this.errorMessage = errorMsg || 'Email verification failed. Please try again.';
            this.canResend = true;
          }
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
}

