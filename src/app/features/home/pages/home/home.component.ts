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
import { TagRecommendationService, TagRecommendation } from '../../../../core/services/tag-recommendation.service';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';
import { 
  normalizeTag, 
  areTagsEqual, 
  getTagDisplayText,
  getTagTooltipText,
  getTagCssClasses,
  getRecommendationExplanation 
} from '../../../../shared/utils/tag-utils';

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
  recommendedTags: TagRecommendation[] = [];
  tagStrings: string[] = []; // For backward compatibility with template
  loading = false;
  searchQuery = '';
  currentPage = 1;
  totalPages = 1;
  
  // Recommendation state
  recommendationLoading = false;
  
  // UI state
  isAuthenticated = false;
  currentUser: any = null;
  isUserMenuOpen = false;
  activeTag: string | null = null; // Store normalized active tag

    // Interest popup state
  showInterestsPopup = false;
  isCheckingInterests = false;
  hasCheckedInterests = false;
  
  constructor(
    private blogService: BlogService,
    private authService: AuthService,
    private profilePictureService: ProfilePictureService,
    private router: Router,
    private interestsService: InterestsService,
    private tagRecommendationService: TagRecommendationService
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
    
    // Subscribe to interests changes for immediate recommendation updates
    this.interestsService.interestsUpdated$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((action) => {
      console.log('🔔 HomeComponent detected interests update:', action);
      // Automatically refresh recommendations when interests change
      this.refreshRecommendations();
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

  private loadPosts(page = 1, clearActiveTag = true): void {
    this.loading = true;
    
    // Only clear active tag if explicitly requested (for initial load or clear filter)
    if (clearActiveTag) {
      this.activeTag = null;
    }
    
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
        
        // Posts loaded - recommendations may need refresh based on new content
      },
      error: (error) => {
        console.error('Error loading posts:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Load enhanced tag recommendations using the new hybrid system
   */
  private loadRecommendedTags(): void {
    this.recommendationLoading = true;
    
    // Configuration for different user scenarios
    const config = {
      maxTags: 20,
      trendingWeight: this.isAuthenticated ? 0.3 : 0.5, // Higher trending weight for non-authenticated users
      personalizedWeight: this.isAuthenticated ? 0.4 : 0, // Only for authenticated users
      popularWeight: 0.2,
      diversityThreshold: 0.7,
      includeNewTags: true
    };
    
    this.tagRecommendationService.getRecommendedTags(config).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recommendations) => {
        // Sort recommendations by priority: personalized > trending > popular > new
        const sortedRecommendations = this.sortRecommendationsByPriority(recommendations);
        this.recommendedTags = sortedRecommendations;
        // Extract strings for template compatibility
        this.tagStrings = sortedRecommendations.map(r => r.tag);
        this.recommendationLoading = false;
        
        console.log('🎯 Enhanced tag recommendations loaded:', {
          total: sortedRecommendations.length,
          byReason: this.groupByReason(sortedRecommendations),
          topRecommendations: sortedRecommendations.slice(0, 5),
          personalizedCount: this.groupByReason(sortedRecommendations)['personalized'] || 0,
          isAuthenticated: this.isAuthenticated
        });
      },
      error: (error) => {
        console.error('Error loading enhanced tag recommendations:', error);
        this.loadFallbackTags();
        this.recommendationLoading = false;
      }
    });
  }
  
  /**
   * Fallback to simple tag loading if enhanced system fails
   */
  private loadFallbackTags(): void {
    this.blogService.getTagNames().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (tags) => {
        // Convert to TagRecommendation format
        this.recommendedTags = tags.slice(0, 20).map(tag => ({
          tag,
          score: 0.5,
          reason: 'popular' as const
        }));
        this.tagStrings = tags.slice(0, 20);
        
        console.log('📋 Fallback tags loaded:', this.tagStrings.length);
      },
      error: (error) => {
        console.error('Error loading fallback tags:', error);
        this.recommendedTags = [];
        this.tagStrings = [];
      }
    });
  }
  
  /**
   * Trigger recommendation refresh (e.g., after user interests change)
   */
  refreshRecommendations(): void {
    console.log('🔄 Refreshing tag recommendations...');
    this.tagRecommendationService.forceRefresh();
    this.loadRecommendedTags();
  }
  
  /**
   * Sort recommendations by priority: personalized > trending > popular > new
   */
  private sortRecommendationsByPriority(recommendations: TagRecommendation[]): TagRecommendation[] {
    const priorityOrder = {
      'personalized': 1,
      'trending': 2,
      'popular': 3,
      'new': 4,
      'related': 5 // fallback for any other reason
    };
    
    return recommendations.sort((a, b) => {
      const aPriority = priorityOrder[a.reason as keyof typeof priorityOrder] || 5;
      const bPriority = priorityOrder[b.reason as keyof typeof priorityOrder] || 5;
      
      // If same priority, sort by score (higher score first)
      if (aPriority === bPriority) {
        return b.score - a.score;
      }
      
      return aPriority - bPriority;
    });
  }
  
  /**
   * Group recommendations by reason for analytics
   */
  groupByReason(recommendations: TagRecommendation[]): Record<string, number> {
    return recommendations.reduce((acc, rec) => {
      acc[rec.reason] = (acc[rec.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  /**
   * Get recommendation reason for display (optional enhancement)
   */
  getTagReason(tag: string): string {
    const recommendation = this.recommendedTags.find(r => r.tag === tag);
    return recommendation?.reason || 'unknown';
  }
  
  /**
   * Get recommendation score for display (optional enhancement)
   */
  getTagScore(tag: string): number {
    const recommendation = this.recommendedTags.find(r => r.tag === tag);
    return recommendation?.score || 0;
  }

  // =============================================================================
  // ENHANCED TAG DISPLAY METHODS
  // =============================================================================

  /**
   * Get display text for a tag (shows exact blog post tag)
   */
  getTagDisplayText(tag: string): string {
    return tag; // Show exact tag as it exists in blog posts
  }

  /**
   * Get tooltip text for a tag showing abbreviation info
   */
  getTagTooltip(tag: string): string | null {
    const tooltip = getTagTooltipText(tag);
    
    // Add recommendation reason if available
    const recommendation = this.recommendedTags.find(r => r.tag === tag);
    if (recommendation && tooltip) {
      return `${tooltip}\n\nRecommended: ${this.getReasonDisplayText(recommendation.reason)}`;
    } else if (recommendation) {
      return `Recommended: ${this.getReasonDisplayText(recommendation.reason)}`;
    }
    
    return tooltip;
  }

  /**
   * Get CSS classes for a tag based on its properties
   */
  getTagClasses(tag: string): string[] {
    const baseClasses = getTagCssClasses(tag, 'tag-button');
    
    // Add recommendation reason class
    const recommendation = this.recommendedTags.find(r => r.tag === tag);
    if (recommendation) {
      baseClasses.push(`tag-${recommendation.reason}`);
    }
    
    return baseClasses;
  }

  /**
   * Get human-readable text for recommendation reason
   */
  private getReasonDisplayText(reason: string): string {
    const reasonMap: Record<string, string> = {
      'personalized': 'For You (based on your interests)',
      'trending': 'Trending Now',
      'popular': 'Popular',
      'related': 'Related to your activity',
      'new': 'New & Emerging'
    };
    return reasonMap[reason] || reason;
  }

  /**
   * Get explanation for why a tag was recommended
   */
  getRecommendationExplanation(tag: string): string | null {
    const recommendation = this.recommendedTags.find(r => r.tag === tag);
    if (!recommendation) {
      return null;
    }

    // For personalized recommendations, try to find the matching user interest
    if (recommendation.reason === 'personalized' && this.isAuthenticated) {
      // This would require storing the original interest mapping in the recommendation
      // For now, provide a generic explanation
      return `Recommended based on your interests`;
    }

    return this.getReasonDisplayText(recommendation.reason);
  }

  /**
   * Check if a tag is currently active (case-insensitive comparison)
   */
  isTagActive(tag: string): boolean {
    if (!this.activeTag) return false;
    return normalizeTag(tag) === this.activeTag;
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
    this.activeTag = null; // Clear active tag when searching
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
    const normalizedTag = normalizeTag(tag);
    
    // If clicking the same tag that's already active, deselect it (show all posts)
    if (this.activeTag === normalizedTag) {
      this.clearTagFilter();
      return;
    }
    
    this.loading = true;
    this.activeTag = normalizedTag;
    this.blogService.getPostsByTag(normalizedTag, 1, 10).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.posts = response.posts;
        this.currentPage = response.page;
        this.totalPages = response.total_pages;
        this.loading = false;
        this.searchQuery = ''; // Clear search query when filtering by tag
      },
      error: (error) => {
        console.error('Error loading posts by tag:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Clear tag filter and show all posts
   */
  private clearTagFilter(): void {
    this.activeTag = null;
    this.searchQuery = '';
    this.loadPosts(1);
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
    } else if (this.activeTag) {
      // If filtering by tag, maintain the normalized tag filter across pages
      this.blogService.getPostsByTag(this.activeTag, page, 10).pipe(
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
      this.loadPosts(page, false); // Don't clear active tag when just changing pages
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
    // Use event-driven cache invalidation for immediate updates
    console.log('🎯 Interests setup completed, triggering immediate cache update');
    this.tagRecommendationService.onInterestsUpdated();
    // Refresh recommendations immediately - cache will be empty so fresh data loads
    this.refreshRecommendations();
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
