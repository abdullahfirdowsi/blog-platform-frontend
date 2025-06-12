import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { takeUntil, Subject } from 'rxjs';
import { User } from './../../../shared/interfaces/user.interface'
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { InterestsComponent } from '../../../shared/components/interests/interests.component';

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
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, FooterComponent, InterestsComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  currentUser: User | null = null;
  isLoading = false;
  isPasswordLoading = false;
  successMessage = '';
  errorMessage = '';
  passwordSuccessMessage = '';
  passwordErrorMessage = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  newPasswordStrength = 0;
  activeTab: 'profile' | 'password' | 'interests' = 'profile';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.passwordForm = this.fb.group({
      current_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator()]],
      confirm_password: ['', [Validators.required, passwordMatchValidator('new_password')]]
    });

    // Watch password changes for strength indicator
    this.passwordForm.get('new_password')?.valueChanges.subscribe(password => {
      this.calculatePasswordStrength(password);
      // Revalidate confirm password when password changes
      this.passwordForm.get('confirm_password')?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    // Subscribe to current user
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.profileForm.patchValue({
            email: user.email,
            username: user.username || this.generateUsernameFromEmail(user.email)
          });
        }
      });

    // Subscribe to loading state
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

  onUpdateProfile(): void {
    if (this.profileForm.valid) {
      this.successMessage = '';
      this.errorMessage = '';
      this.isLoading = true;

      const newUsername = this.profileForm.value.username;
      const currentUsername = this.currentUser?.username;

      // Only update username if it has changed
      if (newUsername !== currentUsername) {
        this.authService.updateProfile({ username: newUsername })
          .subscribe({
            next: (response: any) => {
              this.successMessage = 'Username updated successfully!';
              this.isLoading = false;
              setTimeout(() => this.successMessage = '', 5000);
            },
            error: (error: any) => {
              console.error('Username update error:', error);
              this.errorMessage = error.error?.detail || 'Failed to update username. Please try again.';
              this.isLoading = false;
              setTimeout(() => this.errorMessage = '', 5000);
            }
          });
      } else {
        this.errorMessage = 'No changes detected.';
        this.isLoading = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    } else {
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
    }
  }

  onChangePassword(): void {
    if (this.passwordForm.valid && this.passwordsMatch()) {
      this.passwordSuccessMessage = '';
      this.passwordErrorMessage = '';
      this.isPasswordLoading = true;

      const currentPassword = this.passwordForm.value.current_password;
      const newPassword = this.passwordForm.value.new_password;
      const confirmPassword = this.passwordForm.value.confirm_password;

      this.authService.changePassword(currentPassword, newPassword, confirmPassword)
        .subscribe({
          next: () => {
            this.passwordSuccessMessage = 'Password changed successfully!';
            this.passwordForm.reset();
            this.isPasswordLoading = false;
            setTimeout(() => this.passwordSuccessMessage = '', 5000);
          },
          error: (error: any) => {
            console.error('Password change error:', error);
            this.passwordErrorMessage = error.error?.message || 'Failed to change password. Please try again.';
            this.isPasswordLoading = false;
          }
        });
    } else {
      Object.keys(this.passwordForm.controls).forEach(key => {
        this.passwordForm.get(key)?.markAsTouched();
      });
    }
  }

  passwordsMatch(): boolean {
    const newPassword = this.passwordForm.get('new_password')?.value;
    const confirmPassword = this.passwordForm.get('confirm_password')?.value;
    return newPassword === confirmPassword;
  }

  private calculatePasswordStrength(password: string): void {
    if (!password) {
      this.newPasswordStrength = 0;
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

    this.newPasswordStrength = strength;
  }

  getPasswordStrengthText(): string {
    if (this.newPasswordStrength === 0) return '';
    if (this.newPasswordStrength <= 40) return 'Weak';
    if (this.newPasswordStrength <= 60) return 'Fair';
    if (this.newPasswordStrength <= 80) return 'Good';
    return 'Strong';
  }

  getPasswordStrengthColor(): string {
    if (this.newPasswordStrength <= 40) return 'bg-red-500';
    if (this.newPasswordStrength <= 60) return 'bg-yellow-500';
    if (this.newPasswordStrength <= 80) return 'bg-blue-500';
    return 'bg-green-500';
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    switch (field) {
      case 'current':
        this.showCurrentPassword = !this.showCurrentPassword;
        break;
      case 'new':
        this.showNewPassword = !this.showNewPassword;
        break;
      case 'confirm':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }

  setActiveTab(tab: 'profile' | 'password' | 'interests'): void {
    this.activeTab = tab;
    // Clear messages when switching tabs
    this.successMessage = '';
    this.errorMessage = '';
    this.passwordSuccessMessage = '';
    this.passwordErrorMessage = '';
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
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
      if (field.errors['passwordStrength']) {
        return 'Password must contain uppercase, lowercase, number, and special character';
      }
      if (field.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
    }
    return '';
  }

  hasFieldError(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: Record<string, string> = {
      email: 'Email',
      username: 'Username',
      current_password: 'Current password',
      new_password: 'New password',
      confirm_password: 'Confirm password'
    };
    return displayNames[fieldName] || fieldName;
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    // Use actual username or fallback to generated username from email
    const username = this.currentUser.username || this.generateUsernameFromEmail(this.currentUser.email);
    if (!username) return 'U';
    
    // Take first 2 characters of username
    return username.slice(0, 2).toUpperCase();
  }

  getProviderIcon(): string {
    return 'fas fa-envelope';
  }

  getProviderText(): string {
    return 'Email Account';
  }
  
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

  // Generate username from email (part before @)
  private generateUsernameFromEmail(email: string): string {
    if (!email) return '';
    return email.split('@')[0];
  }
}
