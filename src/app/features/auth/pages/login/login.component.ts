import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { finalize, takeUntil, Subject } from 'rxjs';

declare global {
  interface Window {
    google: any;
  }
}

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('googleButton', { static: false }) googleButton!: ElementRef;
  
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  returnUrl = '/';
  showPassword = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Get return url from route parameters or default to '/home'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
    
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }

    // Subscribe to auth loading state
    this.authService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });
  }

  ngAfterViewInit(): void {
    // Initialize Google Sign-In button with proper timing and error handling
    this.initializeGoogleButton();
  }

  private initializeGoogleButton(): void {
    if (!this.googleButton) return;

    // Wait for Google script to be loaded with retry mechanism
    this.waitForGoogleScript().then(() => {
      this.renderGoogleButtonWithRetry();
    }).catch(error => {
      console.error('Failed to load Google Sign-In:', error);
      // Hide the Google section if it fails to load
      const googleSection = this.googleButton.nativeElement.closest('.google-section');
      if (googleSection) {
        googleSection.style.display = 'none';
      }
    });
  }

  private waitForGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      
      const checkGoogle = () => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkGoogle, 100);
        } else {
          reject(new Error('Google Sign-In script failed to load'));
        }
      };
      
      checkGoogle();
    });
  }

  private renderGoogleButtonWithRetry(): void {
    try {
      this.authService.renderGoogleButton(this.googleButton.nativeElement, this.returnUrl);
    } catch (error) {
      console.error('Failed to render Google button:', error);
      // Retry once after a short delay
      setTimeout(() => {
        try {
          this.authService.renderGoogleButton(this.googleButton.nativeElement, this.returnUrl);
        } catch (retryError) {
          console.error('Failed to render Google button on retry:', retryError);
          // Hide the Google section if rendering fails
          const googleSection = this.googleButton.nativeElement.closest('.google-section');
          if (googleSection) {
            googleSection.style.display = 'none';
          }
        }
      }, 500);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.errorMessage = '';

      const credentials = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      this.authService.login(credentials)
        .subscribe({
          next: (response) => {
            this.router.navigate([this.returnUrl]);
          },
          error: (error) => {
            console.error('Login error:', error);
            this.errorMessage = error.error?.message || 
                              error.error?.detail || 
                              'Login failed. Please check your credentials.';
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        return `Password must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
    }
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }
}
