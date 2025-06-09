import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { BlogService } from '../../../../core/services/blog.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PostSummary } from '../../../../shared/interfaces/post.interface';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HttpClientModule,FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();//used to clean up subscription when the component is destroyed
  private searchSubject = new Subject<string>();//emits search terms from the user input (debouncing)
  
  // Blog data
  posts: PostSummary[] = [];
  recommendedTags: string[] = [];
  loading = false;
  searchQuery = '';
  currentPage = 1;
  totalPages = 1;
  
  // UI state
  isAuthenticated = false;
  currentUser: any = null;
  isUserMenuOpen = false;
  
  constructor(
    private blogService: BlogService,
    private authService: AuthService
  ) {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  ngOnInit(): void {
    this.checkAuthStatus();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkAuthStatus(): void {
    this.authService.isAuthenticated$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((isAuth: boolean) => {
      this.isAuthenticated = isAuth;
    });
    
    // Subscribe to current user
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((user: any) => {
      this.currentUser = user;
    });
  }

  private loadInitialData(): void {
    this.loadPosts();
    this.loadRecommendedTags();
  }

  private loadPosts(page = 1): void {
    this.loading = true;
    
    const filters = {
      page,
      limit: 10,
      status: 'published' as const
    };

    this.blogService.getPosts(filters).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.posts = response.posts;
        this.currentPage = response.page;
        this.totalPages = response.total_pages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading posts:', error);
        this.loading = false;
      }
    });
  }

  private loadRecommendedTags(): void {
    this.blogService.getTagNames().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (tags) => {
        this.recommendedTags = tags.slice(0, 20); // Limit to 20 tags
      },
      error: (error) => {
        console.error('Error loading tags:', error);
      }
    });
  }

  onSearchInput(query: string): void {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  private performSearch(query: string): void {
    if (!query.trim()) {
      this.loadPosts();
      return;
    }

    this.loading = true;
    this.blogService.searchPosts(query, 1, 10).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.posts = response.posts;
        this.currentPage = response.page;
        this.totalPages = response.total_pages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error searching posts:', error);
        this.loading = false;
      }
    });
  }

  onTagClick(tag: string): void {
    this.loading = true;
    this.blogService.getPostsByTag(tag, 1, 10).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.posts = response.posts;
        this.currentPage = response.page;
        this.totalPages = response.total_pages;
        this.loading = false;
        this.searchQuery = '';
      },
      error: (error) => {
        console.error('Error loading posts by tag:', error);
        this.loading = false;
      }
    });
  }

  onPageChange(page: number): void {
    if (this.searchQuery.trim()) {
      this.blogService.searchPosts(this.searchQuery, page, 10).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (response) => {
          this.posts = response.posts;
          this.currentPage = response.page;
          this.totalPages = response.total_pages;
        },
        error: (error) => {
          console.error('Error loading page:', error);
        }
      });
    } else {
      this.loadPosts(page);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getPlaceholderImage(): string {
    return 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
  }
  
  getDefaultAvatar(): string {
    const name = this.currentUser?.full_name || this.currentUser?.username || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=32`;
  }
  
  getImageUrl(imageUrl: string | undefined): string | null {
    // Return null if the image URL is not available
    if (!imageUrl || imageUrl.trim() === '') {
      return null;
    }
    
    // If it's already a full URL (starts with http/https), return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If it's an AWS S3 key/path, ensure it's a complete URL
    if (imageUrl.startsWith('uploads/')) {
      // Construct the full S3 URL if only the path is provided
      return `https://blog-app-2025.s3.amazonaws.com/${imageUrl}`;
    }
    
    // If it contains amazonaws.com, it's already a complete S3 URL
    if (imageUrl.includes('amazonaws.com')) {
      return imageUrl;
    }
    
    // If it's a data URL (base64), return as is
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }
    
    // Default fallback for other cases
    return null;
  }
  
  onImageError(event: any): void {
    // Set fallback image when S3 image fails to load
    event.target.src = this.getPlaceholderImage();
  }
  
  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }
  
  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }
  
  logout(): void {
    this.authService.logout();
    this.closeUserMenu();
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-dropdown')) {
      this.closeUserMenu();
    }
  }
}

