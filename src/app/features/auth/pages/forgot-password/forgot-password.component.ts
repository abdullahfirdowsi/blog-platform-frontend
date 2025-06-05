import { Component } from '@angular/core';
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
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
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
      this.router.navigate(['/landing']);
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

      const email = this.forgotPasswordForm.value.email;

      this.authService.requestPasswordReset(email)
        .subscribe({
          next: () => {
            this.successMessage = 'Password reset instructions have been sent to your email address.';
            this.forgotPasswordForm.reset();
          },
          error: (error) => {
            console.error('Forgot password error:', error);
            this.errorMessage = error.error?.message || 
                              'Failed to send reset email. Please try again.';
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
}
