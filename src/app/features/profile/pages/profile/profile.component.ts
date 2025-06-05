import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../shared/interfaces';
import { takeUntil, Subject } from 'rxjs';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent, FooterComponent],
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
  activeTab: 'profile' | 'password' = 'profile';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      bio: [''],
      profile_image: ['']
    });

    this.passwordForm = this.fb.group({
      current_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Add body class for header spacing
    this.document.body.classList.add('has-header');
    
    // Subscribe to current user
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.profileForm.patchValue({
            email: user.email,
            full_name: user.full_name || '',
            bio: user.bio || '',
            profile_image: user.profile_image || ''
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
    // Remove body class when component is destroyed
    this.document.body.classList.remove('has-header');
    this.destroy$.next();
    this.destroy$.complete();
  }

  onUpdateProfile(): void {
    if (this.profileForm.valid) {
      this.successMessage = '';
      this.errorMessage = '';

      const profileData = {
        username: this.profileForm.value.email, // Use email as username
        email: this.profileForm.value.email,
        full_name: this.profileForm.value.full_name,
        bio: this.profileForm.value.bio,
        profile_image: this.profileForm.value.profile_image
      };

      this.authService.updateProfile(profileData)
        .subscribe({
          next: (user) => {
            this.successMessage = 'Profile updated successfully!';
            setTimeout(() => this.successMessage = '', 5000);
          },
          error: (error) => {
            console.error('Profile update error:', error);
            this.errorMessage = error.error?.message || 'Failed to update profile. Please try again.';
          }
        });
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

      this.authService.changePassword(currentPassword, newPassword)
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

  setActiveTab(tab: 'profile' | 'password'): void {
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
    const displayNames: { [key: string]: string } = {
      email: 'Email',
      full_name: 'Full name',
      bio: 'Bio',
      current_password: 'Current password',
      new_password: 'New password',
      confirm_password: 'Confirm password'
    };
    return displayNames[fieldName] || fieldName;
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    const name = this.currentUser.full_name || this.currentUser.username;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getProviderIcon(): string {
    if (!this.currentUser) return 'fas fa-user';
    return this.currentUser.google_id ? 'fab fa-google' : 'fas fa-envelope';
  }

  getProviderText(): string {
    if (!this.currentUser) return '';
    return this.currentUser.google_id ? 'Google Account' : 'Email Account';
  }
}
