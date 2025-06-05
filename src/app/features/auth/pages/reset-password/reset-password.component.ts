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
            this.errorMessage = error.error?.message || 
                              'Failed to reset password. The token may be expired or invalid.';
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
    const displayNames: { [key: string]: string } = {
      new_password: 'Password',
      confirm_password: 'Confirm password'
    };
    return displayNames[fieldName] || fieldName;
  }
}
