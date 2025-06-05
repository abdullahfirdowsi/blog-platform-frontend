import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { User } from './shared/interfaces';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'blog-platform';
  currentUser: User | null = null;
  isAuthenticated = false;
  showUserMenu = false;
  showMobileMenu = false;
  isLandingPage = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.isAuthenticated = !!user;
      });

    // Listen to route changes to determine if we're on the landing page
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.isLandingPage = event.url === '/landing' || event.url === '/';
      });

    // Check initial route
    this.isLandingPage = this.router.url === '/landing' || this.router.url === '/';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showMobileMenu = false;
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    this.showUserMenu = false;
  }

  closeMenus(): void {
    this.showUserMenu = false;
    this.showMobileMenu = false;
  }

  logout(): void {
    this.authService.logout();
    this.closeMenus();
    this.router.navigate(['/landing']);
  }
}
