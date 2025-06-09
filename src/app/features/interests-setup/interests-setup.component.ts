import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntil, Subject } from 'rxjs';
import { InterestsService } from '../../core/services/interests.service';
import { AuthService } from '../../core/services/auth.service';
import { InterestsComponent } from '../../shared/components/interests/interests.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-interests-setup',
  standalone: true,
  imports: [CommonModule, InterestsComponent, FooterComponent],
  templateUrl: './interests-setup.component.html',
  styleUrl: './interests-setup.component.css'
})
export class InterestsSetupComponent implements OnInit, OnDestroy {
  selectedInterests: string[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private interestsService: InterestsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user already has interests
    this.interestsService.getUserInterests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (interests) => {
          // User already has interests, redirect to home
          if (interests && interests.interests.length > 0) {
            this.router.navigate(['/home']);
          }
        },
        error: (error) => {
          // 404 is expected if user has no interests yet
          if (error.status !== 404) {
            console.error('Error checking user interests:', error);
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInterestsSelected(interests: string[]): void {
    this.selectedInterests = interests;
  }

  onSetupCompleted(): void {
    // Redirect to home page after successful setup
    this.router.navigate(['/home']);
  }

  skipSetup(): void {
    // Allow user to skip interests setup
    this.router.navigate(['/home']);
  }

  logout(): void {
    this.authService.logout();
  }
}

