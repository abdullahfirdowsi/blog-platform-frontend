import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ImageUploadService } from '../../../core/services/image-upload.service';
import { ProfilePictureService } from '../../../core/services/profile-picture.service';
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

// Custom validator to disallow spaces in username
export function noSpacesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null;
    }
    
    if (value.includes(' ')) {
      return { noSpaces: true };
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
  
  // Profile picture upload state
  isUploadingProfilePicture = false;
  uploadSuccessMessage = '';
  uploadErrorMessage = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private imageUploadService: ImageUploadService,
    private profilePictureService: ProfilePictureService
  ) {
    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(2), noSpacesValidator()]]
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
    this.uploadSuccessMessage = '';
    this.uploadErrorMessage = '';
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
      if (field.errors['noSpaces']) {
        return 'Username cannot contain spaces';
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
    return this.profilePictureService.getUserInitials(this.currentUser);
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


  // Profile picture upload functionality
  selectProfilePicture(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => this.onProfilePictureSelect(event!);
    input.click();
  }

  onProfilePictureSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showUploadMessage('Please select a valid image file', 'error');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showUploadMessage('Image size should be less than 5MB', 'error');
      return;
    }
    
    this.uploadProfilePicture(file);
  }

  private uploadProfilePicture(file: File): void {
    this.isUploadingProfilePicture = true;
    this.uploadSuccessMessage = '';
    this.uploadErrorMessage = '';
    
    this.imageUploadService.uploadImage(file).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response && response.imageUrl) {
          // Update profile with new profile picture
          this.authService.updateProfile({ profile_picture: response.imageUrl })
            .subscribe({
              next: (updatedUser) => {
                this.isUploadingProfilePicture = false;
                this.showUploadMessage('Profile picture updated successfully!', 'success');
                // Update current user in the service and local state
                this.currentUser = updatedUser;
              },
              error: (error) => {
                console.error('Error updating profile picture:', error);
                this.isUploadingProfilePicture = false;
                this.showUploadMessage('Failed to update profile picture. Please try again.', 'error');
              }
            });
        } else {
          this.isUploadingProfilePicture = false;
          this.showUploadMessage('Invalid response from server. Please try again.', 'error');
        }
      },
      error: (error) => {
        console.error('Error uploading image:', error);
        this.isUploadingProfilePicture = false;
        
        let errorMessage = 'Failed to upload image. Please try again.';
        
        if (error.status === 413) {
          errorMessage = 'Image file is too large. Please choose a smaller file.';
        } else if (error.status === 400) {
          errorMessage = 'Invalid image file. Please choose a valid image.';
        } else if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your connection.';
        }
        
        this.showUploadMessage(errorMessage, 'error');
      }
    });
  }

  removeProfilePicture(): void {
    this.authService.updateProfile({ profile_picture: '' })
      .subscribe({
        next: (updatedUser) => {
          this.currentUser = updatedUser;
          this.showUploadMessage('Profile picture removed successfully!', 'success');
        },
        error: (error) => {
          console.error('Error removing profile picture:', error);
          this.showUploadMessage('Failed to remove profile picture. Please try again.', 'error');
        }
      });
  }

  private showUploadMessage(message: string, type: 'success' | 'error'): void {
    if (type === 'success') {
      this.uploadSuccessMessage = message;
      this.uploadErrorMessage = '';
      setTimeout(() => this.uploadSuccessMessage = '', 5000);
    } else {
      this.uploadErrorMessage = message;
      this.uploadSuccessMessage = '';
      setTimeout(() => this.uploadErrorMessage = '', 5000);
    }
  }

  getProfilePictureUrl(): string | null {
    return this.profilePictureService.getUserProfilePictureUrl(this.currentUser);
  }

  onProfilePictureError(event: Event): void {
    this.profilePictureService.onImageError(event);
  }
}
