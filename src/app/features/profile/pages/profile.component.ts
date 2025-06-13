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
              this.errorMessage = this.getProfileUpdateErrorMessage(error);
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
            this.passwordErrorMessage = this.getPasswordChangeErrorMessage(error);
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
                this.showUploadMessage(this.getProfilePictureUpdateErrorMessage(error), 'error');
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
        this.showUploadMessage(this.getImageUploadErrorMessage(error), 'error');
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
          this.showUploadMessage(this.getProfilePictureRemoveErrorMessage(error), 'error');
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

  private getProfileUpdateErrorMessage(error: any): string {
    // Check for network errors first
    if (!error.error) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    const errorData = error.error;
    const statusCode = error.status;
    const message = errorData.message || errorData.detail || '';
    const lowerMessage = message.toLowerCase();

    // Handle specific profile update error scenarios
    if (lowerMessage.includes('username') && (lowerMessage.includes('already') || lowerMessage.includes('exists') || lowerMessage.includes('taken'))) {
      return 'This username is already taken. Please choose a different username.';
    }

    if (lowerMessage.includes('username') && lowerMessage.includes('invalid')) {
      return 'Username contains invalid characters. Please use only letters, numbers, and underscores.';
    }

    if (lowerMessage.includes('username') && (lowerMessage.includes('short') || lowerMessage.includes('length'))) {
      return 'Username is too short. Please use at least 2 characters.';
    }

    if (lowerMessage.includes('username') && lowerMessage.includes('long')) {
      return 'Username is too long. Please use less than 50 characters.';
    }

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      return 'Too many profile update attempts. Please wait a few minutes before trying again.';
    }

    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('permission')) {
      return 'You do not have permission to update this profile. Please sign in again.';
    }

    if (lowerMessage.includes('maintenance') || lowerMessage.includes('unavailable')) {
      return 'Profile service is temporarily unavailable. Please try again later.';
    }

    // Handle HTTP status codes
    switch (statusCode) {
      case 400:
        if (errorData.username && Array.isArray(errorData.username)) {
          return errorData.username[0] || 'Invalid username provided. Please check the requirements.';
        }
        return 'Invalid profile information provided. Please check all fields.';
      case 401:
        return 'Your session has expired. Please sign in again to update your profile.';
      case 403:
        return 'You do not have permission to update this profile.';
      case 409:
        return 'This username is already taken. Please choose a different username.';
      case 422:
        return 'The username provided does not meet requirements. Please try a different username.';
      case 429:
        return 'Too many profile update attempts. Please wait a few minutes before trying again.';
      case 500:
        return 'Server error occurred. Please try again in a few moments.';
      case 503:
        return 'Profile service is temporarily unavailable. Please try again later.';
      default:
        if (statusCode >= 500) {
          return 'Server error occurred. Please try again later.';
        }
        // Return original message if it's user-friendly
        if (message && message.length < 200 && !lowerMessage.includes('internal') && !lowerMessage.includes('stack')) {
          return message;
        }
        return 'Failed to update profile. Please try again.';
    }
  }

  private getPasswordChangeErrorMessage(error: any): string {
    // Check for network errors first
    if (!error.error) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    const errorData = error.error;
    const statusCode = error.status;
    const message = errorData.message || errorData.detail || '';
    const lowerMessage = message.toLowerCase();

    // Handle specific password change error scenarios
    if (lowerMessage.includes('current password') && (lowerMessage.includes('incorrect') || lowerMessage.includes('wrong') || lowerMessage.includes('invalid'))) {
      return 'Current password is incorrect. Please enter your current password correctly.';
    }

    if (lowerMessage.includes('password') && (lowerMessage.includes('weak') || lowerMessage.includes('strength'))) {
      return 'New password is too weak. Please include uppercase, lowercase, numbers, and special characters.';
    }

    if (lowerMessage.includes('password') && (lowerMessage.includes('short') || lowerMessage.includes('length'))) {
      return 'New password is too short. Please use at least 8 characters.';
    }

    if (lowerMessage.includes('password') && lowerMessage.includes('common')) {
      return 'This password is too common. Please choose a more unique password.';
    }

    if (lowerMessage.includes('password') && lowerMessage.includes('match')) {
      return 'New passwords do not match. Please ensure both password fields are identical.';
    }

    if (lowerMessage.includes('password') && lowerMessage.includes('same')) {
      return 'New password cannot be the same as your current password. Please choose a different password.';
    }

    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many attempts')) {
      return 'Too many password change attempts. Please wait a few minutes before trying again.';
    }

    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('session')) {
      return 'Your session has expired. Please sign in again to change your password.';
    }

    if (lowerMessage.includes('maintenance') || lowerMessage.includes('unavailable')) {
      return 'Password change service is temporarily unavailable. Please try again later.';
    }

    // Handle HTTP status codes
    switch (statusCode) {
      case 400:
        if (errorData.current_password && Array.isArray(errorData.current_password)) {
          return errorData.current_password[0] || 'Current password is incorrect.';
        }
        if (errorData.new_password && Array.isArray(errorData.new_password)) {
          return errorData.new_password[0] || 'New password does not meet requirements.';
        }
        return 'Invalid password change information provided. Please check all fields.';
      case 401:
        return 'Current password is incorrect. Please enter your current password correctly.';
      case 403:
        return 'Your session has expired. Please sign in again to change your password.';
      case 422:
        return 'The new password provided does not meet security requirements.';
      case 429:
        return 'Too many password change attempts. Please wait a few minutes before trying again.';
      case 500:
        return 'Server error occurred. Please try again in a few moments.';
      case 503:
        return 'Password change service is temporarily unavailable. Please try again later.';
      default:
        if (statusCode >= 500) {
          return 'Server error occurred. Please try again later.';
        }
        // Return original message if it's user-friendly
        if (message && message.length < 200 && !lowerMessage.includes('internal') && !lowerMessage.includes('stack')) {
          return message;
        }
        return 'Failed to change password. Please try again.';
    }
  }

  private getImageUploadErrorMessage(error: any): string {
    const statusCode = error.status;

    // Handle specific image upload error scenarios
    switch (statusCode) {
      case 0:
        return 'Cannot connect to server. Please check your internet connection and try again.';
      case 400:
        return 'Invalid image file. Please choose a valid image format (JPG, PNG, GIF).';
      case 413:
        return 'Image file is too large. Please choose a file smaller than 5MB.';
      case 415:
        return 'Unsupported file type. Please choose a valid image format (JPG, PNG, GIF).';
      case 429:
        return 'Too many upload attempts. Please wait a few minutes before trying again.';
      case 500:
        return 'Server error occurred during upload. Please try again in a few moments.';
      case 503:
        return 'Image upload service is temporarily unavailable. Please try again later.';
      default:
        if (statusCode >= 500) {
          return 'Server error occurred. Please try again later.';
        }
        return 'Failed to upload image. Please try again with a different image.';
    }
  }

  private getProfilePictureUpdateErrorMessage(error: any): string {
    // Check for network errors first
    if (!error.error) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    const statusCode = error.status;
    const errorData = error.error;
    const message = errorData.message || errorData.detail || '';
    const lowerMessage = message.toLowerCase();

    // Handle specific profile picture update errors
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('session')) {
      return 'Your session has expired. Please refresh the page and try again.';
    }

    if (lowerMessage.includes('image') && lowerMessage.includes('invalid')) {
      return 'The uploaded image is invalid. Please try uploading a different image.';
    }

    // Handle HTTP status codes
    switch (statusCode) {
      case 401:
        return 'Your session has expired. Please refresh the page and try again.';
      case 403:
        return 'You do not have permission to update the profile picture.';
      case 422:
        return 'Invalid image data. Please try uploading the image again.';
      case 500:
        return 'Server error occurred while updating profile picture. Please try again.';
      default:
        return 'Failed to update profile picture. Please try again.';
    }
  }

  private getProfilePictureRemoveErrorMessage(error: any): string {
    // Check for network errors first
    if (!error.error) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    const statusCode = error.status;
    const errorData = error.error;
    const message = errorData.message || errorData.detail || '';
    const lowerMessage = message.toLowerCase();

    // Handle specific profile picture removal errors
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('session')) {
      return 'Your session has expired. Please refresh the page and try again.';
    }

    // Handle HTTP status codes
    switch (statusCode) {
      case 401:
        return 'Your session has expired. Please refresh the page and try again.';
      case 403:
        return 'You do not have permission to remove the profile picture.';
      case 404:
        return 'Profile picture not found. It may have already been removed.';
      case 500:
        return 'Server error occurred while removing profile picture. Please try again.';
      default:
        return 'Failed to remove profile picture. Please try again.';
    }
  }
}
