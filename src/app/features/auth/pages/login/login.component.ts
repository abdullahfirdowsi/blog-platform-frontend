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
            
            // Check if error is related to email verification
            const errorMessage = error.error?.message || error.error?.detail || '';
            if (error.status === 403 && errorMessage.includes('verify your email')) {
              this.isEmailUnverified = true;
              this.errorMessage = errorMessage;
            } else {
              this.isEmailUnverified = false;
              this.errorMessage = errorMessage || 'Login failed. Please check your credentials.';
            }
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
          this.errorMessage = error.error?.message || 'Failed to send verification email. Please try again.';
        }
      });
  }
}
