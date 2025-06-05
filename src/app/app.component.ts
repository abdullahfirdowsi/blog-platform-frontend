import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { User } from './shared/interfaces/user.interface';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'BlogPlatform';
  
  // Navigation state
  isLandingPage = false;
  showMobileMenu = false;
  showUserMenu = false;
  
  // Authentication state
  isAuthenticated = false;
  currentUser: User | null = null;
  
  private subscription = new Subscription();
  
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}
  
  ngOnInit() {
    // Listen to route changes to determine if we're on landing page
    this.subscription.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        this.isLandingPage = event.url === '/' || event.url === '/landing';
        // Close menus on route change
        this.closeMenus();
      })
    );
    
    // Subscribe to authentication state
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.isAuthenticated = !!user;
      })
    );
    
    // Set initial landing page state
    this.isLandingPage = this.router.url === '/' || this.router.url === '/landing';
  }
  
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  
  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
    if (this.showMobileMenu) {
      this.showUserMenu = false;
    }
  }
  
  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    if (this.showUserMenu) {
      this.showMobileMenu = false;
    }
  }
  
  closeMenus() {
    this.showMobileMenu = false;
    this.showUserMenu = false;
  }
  
  logout() {
    this.authService.logout();
    this.closeMenus();
    this.router.navigate(['/']);
  }
}
