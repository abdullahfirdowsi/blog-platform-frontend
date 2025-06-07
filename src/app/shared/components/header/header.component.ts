import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../interfaces/user.interface';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLandingPage = false;
  isMobileMenuOpen = false;
  isUserMenuOpen = false;
  private subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // Subscribe to current user
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );

    // Track route changes to determine if on landing page
    this.subscription.add(
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          this.isLandingPage = event.url === '/' || event.url === '/landing';
        })
    );

    // Set initial landing page state
    this.isLandingPage = this.router.url === '/' || this.router.url === '/landing';
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleMobileMenu(): void {
    console.log('Mobile menu toggle clicked');
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.isUserMenuOpen = false;
    
    // Ensure proper event handling
    setTimeout(() => {
      console.log('Mobile menu state:', this.isMobileMenuOpen);
    }, 0);
  }

  toggleUserMenu(): void {
    console.log('User menu toggle clicked');
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isMobileMenuOpen = false;
  }

  closeMenus(): void {
    console.log('Closing menus');
    this.isMobileMenuOpen = false;
    this.isUserMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.closeMenus();
    this.router.navigate(['/']); 
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close menu if clicking outside the header component
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenus();
    }
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(): void {
    // Close menus on window resize to prevent layout issues
    this.closeMenus();
  }
}

