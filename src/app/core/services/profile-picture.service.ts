import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfilePictureService {
  private readonly s3BaseUrl = 'https://blog-app-2025.s3.amazonaws.com';

  constructor() {}

  /**
   * Get the full URL for a profile picture
   * @param profilePicture - The profile picture field from user/blog object
   * @returns The full URL or null if no valid picture
   */
  getProfilePictureUrl(profilePicture: string | undefined | null): string | null {
    if (!profilePicture || profilePicture.trim() === '') {
      return null;
    }
    
    // If it's already a full URL (starts with http/https), return as is
    if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
      return profilePicture;
    }
    
    // If it's an AWS S3 key/path, ensure it's a complete URL
    if (profilePicture.startsWith('uploads/')) {
      return `${this.s3BaseUrl}/${profilePicture}`;
    }
    
    // If it contains amazonaws.com, it's already a complete S3 URL
    if (profilePicture.includes('amazonaws.com')) {
      return profilePicture;
    }
    
    // If it's a data URL (base64), return as is
    if (profilePicture.startsWith('data:')) {
      return profilePicture;
    }
    
    return null;
  }

  /**
   * Get profile picture URL from a user object
   * Handles different property names (profile_picture, profile_image)
   */
  getUserProfilePictureUrl(user: any): string | null {
    if (!user) {
      return null;
    }
    
    const profilePicture = user.profile_picture || user.profile_image;
    return this.getProfilePictureUrl(profilePicture);
  }

  /**
   * Get user initials as fallback
   * @param user - User object with username
   * @returns User initial (first letter only)
   */
  getUserInitials(user: any): string {
    if (!user) return 'U';
    
    // Use username (which is now always available after registration fix)
    const name = user.username || user.name || 'U';
    
    // Take first character only and make uppercase
    return name.slice(0, 1).toUpperCase();
  }

  /**
   * Handle image error events - hide the image element
   */
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.style.display = 'none';
    }
  }

  /**
   * Generate a default avatar URL using external service
   * @param name - Name to use for avatar generation
   * @param size - Avatar size (default: 40)
   * @returns URL for generated avatar
   */
  getDefaultAvatarUrl(name: string, size: number = 40): string {
    const encodedName = encodeURIComponent(name || 'User');
    return `https://ui-avatars.com/api/?name=${encodedName}&background=667eea&color=fff&size=${size}`;
  }
}

