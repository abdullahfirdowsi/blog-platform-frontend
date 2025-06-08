import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
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
    const hasSpecial = /[#?!@$%^&*-]/.test(value);
    
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
export class RegisterComponent implements OnInit, AfterViewInit {
  @ViewChild('googleButton', { static: false }) googleButton!: ElementRef;
  
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
      full_name: ['', [Validators.required, Validators.minLength(2)]],
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

  ngAfterViewInit(): void {
    // Initialize Google Sign-In button
    if (this.googleButton) {
      setTimeout(() => {
        this.authService.renderGoogleButton(this.googleButton.nativeElement);
      }, 100);
    }
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

      const userData = {
        username: this.registerForm.value.email, // Use email as username
        email: this.registerForm.value.email,
        full_name: this.registerForm.value.full_name,
        password: this.registerForm.value.password,
        confirm_password: this.registerForm.value.confirm_password
      };

      this.authService.register(userData)
        .subscribe({
          next: (response) => {
            this.successMessage = 'Registration successful! Please log in with your credentials.';
            // Wait a moment to show the success message, then redirect to login
            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 2000);
          },
          error: (error) => {
            console.error('Registration error:', error);
            if (error.error?.message) {
              this.errorMessage = error.error.message;
            } else if (error.error?.username) {
              this.errorMessage = 'Username is already taken.';
            } else if (error.error?.email) {
              this.errorMessage = 'Email is already registered.';
            } else {
              this.errorMessage = 'Registration failed. Please try again.';
            }
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
    const displayNames: { [key: string]: string } = {
      username: 'Username',
      email: 'Email',
      full_name: 'Full name',
      password: 'Password',
      confirm_password: 'Confirm password'
    };
    return displayNames[fieldName] || fieldName;
  }
}
