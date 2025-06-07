import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, takeUntil, Subject } from 'rxjs';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'BlogPlatform';
  shouldShowHeader = false;
  private destroy$ = new Subject<void>();
  
  constructor(private router: Router, @Inject(DOCUMENT) private document: Document) {}
  
  ngOnInit(): void {
    // Subscribe to route changes to determine when to show header
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        // Hide header on landing, login, register, forgot-password, reset-password pages
        const hideHeaderRoutes = ['/landing', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/'];
        this.shouldShowHeader = !hideHeaderRoutes.includes(event.url);
        
        // Manage body class for header spacing
        if (this.shouldShowHeader) {
          this.document.body.classList.add('has-header');
        } else {
          this.document.body.classList.remove('has-header');
        }
      });
    
    // Set initial state
    const currentUrl = this.router.url;
    const hideHeaderRoutes = ['/landing', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/'];
    this.shouldShowHeader = !hideHeaderRoutes.includes(currentUrl);
    
    // Set initial body class
    if (this.shouldShowHeader) {
      this.document.body.classList.add('has-header');
    } else {
      this.document.body.classList.remove('has-header');
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
