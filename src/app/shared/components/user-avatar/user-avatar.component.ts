import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfilePictureService } from '../../../core/services/profile-picture.service';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-avatar-container" [style.width.px]="size" [style.height.px]="size">
      @if (getProfilePictureUrl()) {
        <img 
          [src]="getProfilePictureUrl()" 
          [alt]="user?.username + ' profile picture'"
          class="user-avatar"
          (error)="onImageError($event)"
        >
      } @else {
        <div class="user-avatar-placeholder" [style.width.px]="size" [style.height.px]="size" [style.font-size]="getFontSize()">
          {{ getUserInitials() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .user-avatar-container {
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    .user-avatar-placeholder {
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      border: 1px solid rgba(102, 126, 234, 0.2);
    }
  `]
})
export class UserAvatarComponent implements OnInit {
  @Input() user: any;
  @Input() size: number = 40;

  constructor(private profilePictureService: ProfilePictureService) {}

  ngOnInit(): void {}

  getProfilePictureUrl(): string | null {
    return this.profilePictureService.getUserProfilePictureUrl(this.user);
  }

  getUserInitials(): string {
    return this.profilePictureService.getUserInitials(this.user);
  }

  onImageError(event: Event): void {
    this.profilePictureService.onImageError(event);
  }

  getFontSize(): string {
    // Scale font size based on avatar size
    const fontSize = Math.max(this.size * 0.35, 12);
    return `${fontSize}px`;
  }
}

