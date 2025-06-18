import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, pipe, timer } from 'rxjs';
import { BlogService } from '../../../../core/services/blog.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfilePictureService } from '../../../../core/services/profile-picture.service';
import { PostSummary } from '../../../../shared/interfaces/post.interface';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { InterestsComponent } from '../../../../shared/components/interests/interests.component';
import { InterestsService } from '../../../../core/services/interests.service';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule,FooterComponent,InterestsComponent, DateFormatPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  
  // Blog data
  posts: PostSummary[] = [];
  recommendedTags: string[] = [];
  trendingTags: string[] = [];
  allTags: string[] = [];
  loading = false;
  searchQuery = '';
  currentPage = 1;
  totalPages = 1;
  
  // UI state
  isAuthenticated = false;
  currentUser: any = null;
  isUserMenuOpen = false;

    // Interest popup state
  showInterestsPopup = false;
  isCheckingInterests = false;
  hasCheckedInterests = false;
  
  constructor(
    private blogService: BlogService,
    private authService: AuthService,
    private profilePictureService: ProfilePictureService,
    private router: Router,
    private interestsService:InterestsService
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
      // Check user interests only if authenticated
      if (isAuth) {
        // Delay to ensure user data is loaded
        timer(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
          this.checkUserInterests();
        });
      }
    });
    
    // Subscribe to current user
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((user: any) => {
      this.currentUser = user;
    });
  }

  getFirstName(fullName?: string): string {
    if (!fullName) return 'Unknown';
    // Return the full username as-is
    return fullName;
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
        
        // Extract and update trending tags from current posts
        this.updateTrendingTags();
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
        this.allTags = tags;
        this.updateRecommendedTags();
      },
      error: (error) => {
        console.error('Error loading tags:', error);
      }
    });
  }

  private updateTrendingTags(): void {
    // Extract all tags from current posts
    const tagCount = new Map<string, number>();
    
    this.posts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          const normalizedTag = tag.trim().toLowerCase();
          if (normalizedTag) {
            tagCount.set(normalizedTag, (tagCount.get(normalizedTag) || 0) + 1);
          }
        });
      }
    });

    // Sort tags by frequency and get the most popular ones
    this.trendingTags = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .slice(0, 10) // Take top 10
      .map(entry => entry[0]); // Get just the tag names

    console.log('🔥 Trending tags from current posts:', this.trendingTags);
    
    // Update recommended tags to combine trending and all tags
    this.updateRecommendedTags();
  }

  private updateRecommendedTags(): void {
    // Combine trending tags (from current posts) with other available tags
    const combinedTags = new Set<string>();
    
    // First, add trending tags (higher priority)
    this.trendingTags.forEach(tag => combinedTags.add(tag));
    
    // Then add other tags from all available tags, avoiding duplicates
    this.allTags.forEach(tag => {
      if (!this.trendingTags.includes(tag.toLowerCase())) {
        combinedTags.add(tag);
      }
    });
    
    // Convert to array and limit to 20 tags
    this.recommendedTags = Array.from(combinedTags).slice(0, 20);
    
    console.log('✨ Updated recommended tags:', {
      trending: this.trendingTags,
      recommended: this.recommendedTags,
      totalAvailable: this.allTags.length
    });
  }

  onSearchInput(query: string): void {
    console.log('Search input:', query);
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  private performSearch(query: string): void {
    if (!query.trim()) {
      this.loadPosts();
      return;
    }

    this.loading = true;
    this.currentPage = 1; // Reset to first page for new search
    this.blogService.searchPosts(query, 1, 10).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        console.log('Search response:', response);
        this.posts = response.posts || [];
        this.currentPage = response.page || 1;
        this.totalPages = response.total_pages || 1;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error searching posts:', error);
        this.posts = [];
        this.currentPage = 1;
        this.totalPages = 1;
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



  getPlaceholderImage(): string {
    return 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
  }
  
  getDefaultAvatar(): string {
    // Return a data URL for a simple colored circle with initials
    const name = this.currentUser?.full_name || this.currentUser?.username || 'User';
    const initials = this.getInitials(name);
    return this.generateAvatarDataUrl(initials);
  }

  getUserProfilePicture(): string | null {
    const profilePicture = this.currentUser?.profile_picture || this.currentUser?.profile_image;
    
    if (!profilePicture || profilePicture.trim() === '') {
      return null;
    }
    
    // If it's already a full URL (starts with http/https), return as is
    if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
      return profilePicture;
    }
    
    // If it's an AWS S3 key/path, ensure it's a complete URL
    if (profilePicture.startsWith('uploads/')) {
      return `https://blog-app-2025.s3.amazonaws.com/${profilePicture}`;
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

  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  private generateAvatarDataUrl(initials: string): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const size = 32;
    
    canvas.width = size;
    canvas.height = size;
    
    // Background circle
    ctx.fillStyle = '#667eea';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = `${size/2.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size/2, size/2);
    
    return canvas.toDataURL();
  }
  
  getImageUrl(imageUrl: string | undefined): string | null {
    // Use ProfilePictureService for consistent image URL handling
    return this.profilePictureService.getProfilePictureUrl(imageUrl);
  }

  // Get author profile picture URL for posts (same as blog-detail)
  getAuthorProfilePictureUrl(post: PostSummary): string | null {
    console.log('🖼️ getAuthorProfilePictureUrl called for post:', {
      postId: post.id,
      title: post.title,
      author: post.author,
      authorId: post.author_id,
      username: post.username
    });
    
    console.log('🔍 Author object detailed:', {
      hasAuthor: !!post.author,
      authorId: post.author?.id,
      authorUsername: post.author?.username,
      authorProfilePicture: post.author?.profile_picture,
      authorKeys: post.author ? Object.keys(post.author) : null
    });
    
    // If the post author is the current user, use current user's profile picture
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser && post) {
      const currentUserId = currentUser._id || currentUser.id;
      console.log('🔍 Current user check:', { currentUserId, postAuthorId: post.author_id });
      
      if (currentUserId === post.author_id) {
        // Use live current user data for own posts
        const profileUrl = this.profilePictureService.getUserProfilePictureUrl(currentUser);
        console.log('✅ Using current user profile picture:', profileUrl);
        return profileUrl;
      }
    }
    
    // For other users' posts, check if we have the profile picture in the author object
    if (post && post.author) {
      const profileUrl = this.profilePictureService.getUserProfilePictureUrl(post.author);
      if (profileUrl) {
        console.log('✅ Using post author profile picture:', profileUrl);
        return profileUrl;
      } else {
        console.log('⚠️ Author exists but no profile_picture field or it\'s null/undefined');
      }
    }
    
    console.log('❌ No profile picture found for post');
    return null;
  }

  // Get author initials for fallback
  getAuthorInitials(post: PostSummary): string {
    const authorName = post.username || 'Unknown';
    return this.profilePictureService.getUserInitials({ username: authorName });
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

  handleAvatarError(event: any): void {
    // Replace with generated avatar on error
    event.target.src = this.getDefaultAvatar();
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-dropdown')) {
      this.closeUserMenu();
    }
  }

  // Navigate to blog detail page
  navigateToBlogDetail(postId: string): void {
    this.router.navigate(['/posts/detail', postId]);
  }

  // interest page popup
  private checkUserInterests(): void {
    if (this.isCheckingInterests || this.hasCheckedInterests) {
      return;
    }
   
    this.isCheckingInterests = true;
    this.hasCheckedInterests = true;
   
    this.interestsService.getUserInterests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (interests) => {
          this.isCheckingInterests = false;
          // If user has no interests or empty interests array, show popup
          if (!interests || !interests.interests || interests.interests.length === 0) {
            // Show popup after a short delay for better UX
            timer(2000).pipe(takeUntil(this.destroy$)).subscribe(() => {
              this.showInterestsPopup = true;
            });
          }
        },
        error: (error) => {
          this.isCheckingInterests = false;
          // 404 means user has no interests yet, show popup
          if (error.status === 404) {
            timer(2000).pipe(takeUntil(this.destroy$)).subscribe(() => {
              this.showInterestsPopup = true;
            });
          } else {
            console.error('Error checking user interests:', error);
          }
        }
      });
  }
 
  // Handle interests popup completion
  onInterestsSetupCompleted(): void {
    this.showInterestsPopup = false;
  }
 
  // Handle skip interests
  onSkipInterests(): void {
    this.showInterestsPopup = false;
  }
 
  // Close interests popup
  closeInterestsPopup(): void {
    this.showInterestsPopup = false;
  }
}
