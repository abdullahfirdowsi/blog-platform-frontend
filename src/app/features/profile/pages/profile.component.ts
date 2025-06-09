import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { takeUntil, Subject } from 'rxjs';
import { User } from './../../../shared/interfaces/user.interface'
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { InterestsComponent } from '../../../shared/components/interests/interests.component';

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
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]]
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
            username: user.username
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

      // Note: Backend doesn't support profile updates yet
      // This is just for demonstration
      const profileData = {
        username: this.profileForm.value.username,
        email: this.profileForm.value.email
      };

      // Profile update not available in current backend
      this.errorMessage = 'Profile updates are not available yet.';
      setTimeout(() => this.errorMessage = '', 5000);
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
          error: (error) => {
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
    const name = this.currentUser.username;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
}
