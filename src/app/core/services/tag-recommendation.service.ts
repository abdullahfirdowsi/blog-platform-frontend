import { Injectable } from '@angular/core';
import { Observable, combineLatest, map, catchError, of, BehaviorSubject, timer, Subject } from 'rxjs';
import { BlogService } from './blog.service';
import { AuthService } from './auth.service';
import { InterestsService } from './interests.service';
import { Tag } from '../../shared/interfaces/post.interface';
import { 
  normalizeTag, 
  areTagsEqual, 
  findBestTagMatch, 
  getPreferredTagFormat, 
  areTagsEquivalent,
  TagMatchResult 
} from '../../shared/utils/tag-utils';

export interface TagRecommendation {
  tag: string;
  score: number;
  reason: 'trending' | 'personalized' | 'popular' | 'related' | 'new';
  category?: string;
}

export interface TagWithStats extends Tag {
  count?: number;
  usage_count?: number;
  similarity_score?: number;
  category?: string;
}

export interface UserInterests {
  interests: string[];
}

export interface ReadingHistory {
  tags: string[];
}

export interface RecommendationConfig {
  maxTags: number;
  trendingWeight: number;
  personalizedWeight: number;
  popularWeight: number;
  diversityThreshold: number;
  includeNewTags: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TagRecommendationService {
  private readonly defaultConfig: RecommendationConfig = {
    maxTags: 20,
    trendingWeight: 0.4,
    personalizedWeight: 0.3,
    popularWeight: 0.2,
    diversityThreshold: 0.7,
    includeNewTags: true
  };

  // Cache for recommendations
  private recommendationsCache: TagRecommendation[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly SHORT_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for authenticated users
  private currentUserId: string | null = null;
  private cacheKey: string = '';
  private lastInterestsCheck: number = 0;
  private lastBlogCountCheck: number = 0;
  private cachedBlogCount: number = 0;
  
  // Event-driven cache invalidation
  private cacheInvalidationEvent$ = new Subject<string>();

  constructor(
    private blogService: BlogService,
    private authService: AuthService,
    private interestsService: InterestsService
  ) {
    // Subscribe to interests changes for automatic cache invalidation
    this.interestsService.interestsUpdated$.subscribe((action) => {
      console.log('🔔 Interests updated detected, action:', action);
      this.onInterestsUpdated();
    });
  }

  /**
   * Get comprehensive tag recommendations using hybrid approach with caching
   */
  getRecommendedTags(config: Partial<RecommendationConfig> = {}): Observable<TagRecommendation[]> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const currentUser = this.authService.getCurrentUser();
    const newUserId = currentUser?._id || currentUser?.id || 'anonymous';
    const newCacheKey = `${newUserId}_${JSON.stringify(finalConfig)}`;
    
    // Check if we have valid cached data
    if (this.isCacheValid(newCacheKey)) {
      console.log('🚀 Using cached tag recommendations');
      return of(this.recommendationsCache!);
    }
    
    console.log('🔄 Fetching fresh tag recommendations...');
    
    return combineLatest([
      this.getTrendingTags(),
      this.getPersonalizedTags(),
      this.getPopularTags(),
      this.getRelatedTags(),
      this.getNewTags()
    ]).pipe(
      map(([trending, personalized, popular, related, newTags]) => {
        const recommendations = this.combineAndRankRecommendations(
          trending,
          personalized,
          popular,
          related,
          newTags,
          finalConfig
        );
        
        // Cache the results
        this.cacheRecommendations(recommendations, newCacheKey);
        
        return recommendations;
      }),
      catchError(error => {
        console.error('Error getting tag recommendations:', error);
        return this.getFallbackRecommendations();
      })
    );
  }

  /**
   * Check if cache is valid with intelligent invalidation
   */
  private isCacheValid(newCacheKey: string): boolean {
    const now = Date.now();
    const isAuthenticated = this.authService.isAuthenticated();
    
    // Basic cache validity checks
    if (!this.recommendationsCache || this.cacheKey !== newCacheKey) {
      return false;
    }
    
    // Use shorter cache duration for authenticated users (more dynamic content)
    const cacheDuration = isAuthenticated ? this.SHORT_CACHE_DURATION : this.CACHE_DURATION;
    
    // Check if cache has expired
    if ((now - this.cacheTimestamp) >= cacheDuration) {
      console.log('🕐 Cache expired due to time');
      return false;
    }
    
    // For authenticated users, also check for content and interest changes
    if (isAuthenticated) {
      return this.checkContentFreshness();
    }
    
    return true;
  }
  
  /**
   * Check if content has changed since cache was created
   * Only validates on-demand to reduce background polling
   */
  private checkContentFreshness(): boolean {
    const now = Date.now();
    
    // Only check blog count if cache is older than 5 minutes (reduce frequent checks)
    if ((now - this.lastBlogCountCheck) > 5 * 60 * 1000) {
      this.validateBlogCount();
      this.lastBlogCountCheck = now;
    }
    
    // Only check user interests if cache is older than 5 minutes
    if ((now - this.lastInterestsCheck) > 5 * 60 * 1000) {
      this.validateUserInterests();
      this.lastInterestsCheck = now;
    }
    
    return true; // Return true for now, async validation will clear cache if needed
  }
  
  /**
   * Validate if blog count has changed (indicates new content)
   */
  private validateBlogCount(): void {
    this.blogService.getPosts({ limit: 1, status: 'published' }).subscribe({
      next: (response) => {
        const currentBlogCount = response.total || 0;
        
        if (this.cachedBlogCount === 0) {
          // First time, just store the count
          this.cachedBlogCount = currentBlogCount;
        } else if (currentBlogCount !== this.cachedBlogCount) {
          // Blog count changed, clear cache
          console.log('📝 New blogs detected, clearing cache');
          this.clearCache();
          this.cachedBlogCount = currentBlogCount;
        }
      },
      error: (error) => {
        console.warn('Could not check blog count:', error);
      }
    });
  }
  
  /**
   * Validate if user interests have changed
   */
  private validateUserInterests(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }
    
    this.interestsService.getUserInterests().subscribe({
      next: (interests) => {
        const currentInterests = interests?.interests || [];
        const interestsHash = this.hashInterests(currentInterests);
        const cachedInterestsHash = localStorage.getItem('cached_interests_hash');
        
        if (cachedInterestsHash && cachedInterestsHash !== interestsHash) {
          console.log('👤 User interests changed, clearing cache');
          this.clearCache();
        }
        
        // Update stored hash
        localStorage.setItem('cached_interests_hash', interestsHash);
      },
      error: (error) => {
        // 404 is expected if user has no interests yet
        if (error.status !== 404) {
          console.warn('Could not check user interests:', error);
        }
      }
    });
  }
  
  /**
   * Create a hash of user interests for comparison
   */
  private hashInterests(interests: string[]): string {
    return interests.sort().join('|');
  }
  
  /**
   * Force refresh recommendations (useful for manual refresh)
   */
  forceRefresh(): void {
    console.log('🔄 Force refreshing tag recommendations');
    this.clearCache();
    this.lastInterestsCheck = 0;
    this.lastBlogCountCheck = 0;
  }
  
  /**
   * Event-driven cache invalidation for when a new blog is published
   * Call this method from BlogService when a blog is published
   */
  onBlogPublished(): void {
    console.log('📝 Blog published, clearing cache immediately');
    this.clearCache();
    this.cachedBlogCount = 0; // Reset to force recheck
    this.cacheInvalidationEvent$.next('blog_published');
  }
  
  /**
   * Event-driven cache invalidation for when user interests are updated
   * Call this method from InterestsService when interests are saved
   */
  onInterestsUpdated(): void {
    console.log('👤 User interests updated, clearing cache immediately');
    this.clearCache();
    this.lastInterestsCheck = 0; // Reset to force recheck
    localStorage.removeItem('cached_interests_hash'); // Clear stored hash
    this.cacheInvalidationEvent$.next('interests_updated');
  }

  /**
   * Cache recommendations
   */
  private cacheRecommendations(recommendations: TagRecommendation[], cacheKey: string): void {
    this.recommendationsCache = recommendations;
    this.cacheTimestamp = Date.now();
    this.cacheKey = cacheKey;
    console.log('💾 Cached tag recommendations:', recommendations.length);
  }

  /**
   * Clear cache (useful when user interests change)
   */
  clearCache(): void {
    this.recommendationsCache = null;
    this.cacheTimestamp = 0;
    this.cacheKey = '';
    console.log('🗑️ Tag recommendations cache cleared');
  }

  /**
   * Get trending tags based on recent activity
   */
  private getTrendingTags(): Observable<TagRecommendation[]> {
    // Since getTrendingTags doesn't exist, use getTags as fallback
    return this.blogService.getTags().pipe(
      map((tags: Tag[]) => tags.slice(0, 10).map((tag: Tag) => ({
        tag: tag.name,
        score: 0.8, // Static score since we don't have count data
        reason: 'trending' as const,
        category: 'general'
      }))),
      catchError(() => of([]))
    );
  }

  /**
   * Get personalized tags based on user interests and reading history
   * Only recommends tags that exist in actual blog posts
   */
  private getPersonalizedTags(): Observable<TagRecommendation[]> {
    if (!this.authService.isAuthenticated()) {
      return of([]);
    }

    return combineLatest([
      this.interestsService.getUserInterests(),
      this.blogService.getTags()
    ]).pipe(
      map(([interests, availableTags]: [UserInterests, Tag[]]) => {
        const personalizedTags: TagRecommendation[] = [];
        
        // Only match tags that exist in actual blog posts
        if (interests && interests.interests) {
          const availableTagNames = availableTags.map(tag => tag.name);
          
          interests.interests.forEach((interest: string) => {
            console.log(`🔍 Looking for exact matches for interest: "${interest}"`);
            
            // Find exact matches only - only recommend tags that exist in blog posts
            const exactMatches = availableTagNames.filter(tagName => {
              // Check for exact match (case-insensitive)
              if (normalizeTag(tagName) === normalizeTag(interest)) {
                return true;
              }
              
              // Check if the blog tag is contained in the interest or vice versa
              const normalizedTag = normalizeTag(tagName).toLowerCase();
              const normalizedInterest = normalizeTag(interest).toLowerCase();
              
              return normalizedTag.includes(normalizedInterest) || 
                     normalizedInterest.includes(normalizedTag);
            });
            
            exactMatches.forEach(matchedTag => {
              console.log(`✅ Found exact match for "${interest}": "${matchedTag}"`);
              
              // Check if we already have this tag to avoid duplicates
              const existingTag = personalizedTags.find(tag => 
                normalizeTag(tag.tag) === normalizeTag(matchedTag)
              );
              
              if (!existingTag) {
                personalizedTags.push({
                  tag: matchedTag, // Use the exact tag from blog posts
                  score: 0.9, // High score for personalized matches
                  reason: 'personalized',
                  category: 'user-interest'
                });
              }
            });
            
            if (exactMatches.length === 0) {
              console.log(`❌ No exact match found for interest: "${interest}"`);
            }
          });
        }
        
        return personalizedTags;
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Get globally popular tags
   */
  private getPopularTags(): Observable<TagRecommendation[]> {
    // Since getPopularTags doesn't exist, use getTags as fallback
    return this.blogService.getTags().pipe(
      map((tags: Tag[]) => tags.slice(0, 15).map((tag: Tag) => ({
        tag: tag.name,
        score: 0.7, // Static score since we don't have usage count data
        reason: 'popular' as const,
        category: 'general'
      }))),
      catchError(() => of([]))
    );
  }

  /**
   * Get tags related to current user's recent activity
   */
  private getRelatedTags(): Observable<TagRecommendation[]> {
    // Since getRelatedTags doesn't exist, use getTags as fallback
    return this.blogService.getTags().pipe(
      map((tags: Tag[]) => tags.slice(5, 15).map((tag: Tag) => ({
        tag: tag.name,
        score: 0.6, // Static score since we don't have similarity data
        reason: 'related' as const,
        category: 'general'
      }))),
      catchError(() => of([]))
    );
  }

  /**
   * Get new/emerging tags to promote discovery
   */
  private getNewTags(): Observable<TagRecommendation[]> {
    // Since getNewTags doesn't exist, use getTags as fallback
    return this.blogService.getTags().pipe(
      map((tags: Tag[]) => tags.slice(-10).map((tag: Tag) => ({
        tag: tag.name,
        score: 0.3, // Lower score for discovery
        reason: 'new' as const,
        category: 'emerging'
      }))),
      catchError(() => of([]))
    );
  }

  /**
   * Combine and rank all recommendations using weighted scoring
   */
  private combineAndRankRecommendations(
    trending: TagRecommendation[],
    personalized: TagRecommendation[],
    popular: TagRecommendation[],
    related: TagRecommendation[],
    newTags: TagRecommendation[],
    config: RecommendationConfig
  ): TagRecommendation[] {
    const tagScores = new Map<string, TagRecommendation>();
    
    // Apply weighted scoring
    this.applyWeightedScoring(trending, config.trendingWeight, tagScores);
    this.applyWeightedScoring(personalized, config.personalizedWeight, tagScores);
    this.applyWeightedScoring(popular, config.popularWeight, tagScores);
    this.applyWeightedScoring(related, 0.1, tagScores); // Lower weight for related
    
    if (config.includeNewTags) {
      this.applyWeightedScoring(newTags, 0.1, tagScores);
    }
    
    // Convert to array and sort by score
    let recommendations = Array.from(tagScores.values())
      .sort((a, b) => b.score - a.score);
    
    // Apply diversity filter
    if (config.diversityThreshold > 0) {
      recommendations = this.applyDiversityFilter(recommendations, config.diversityThreshold);
    }
    
    // Limit results
    return recommendations.slice(0, config.maxTags);
  }

  /**
   * Apply weighted scoring to tag recommendations
   */
  private applyWeightedScoring(
    tags: TagRecommendation[],
    weight: number,
    tagScores: Map<string, TagRecommendation>
  ): void {
    tags.forEach(tag => {
      const normalizedKey = normalizeTag(tag.tag);
      const existing = tagScores.get(normalizedKey);
      const weightedScore = tag.score * weight;
      
      if (existing) {
        existing.score += weightedScore;
        // Keep the highest priority reason
        if (this.getReasonPriority(tag.reason) > this.getReasonPriority(existing.reason)) {
          existing.reason = tag.reason;
          // Update to the new tag format if it has higher priority, preserving original casing
          existing.tag = tag.tag;
        }
      } else {
        tagScores.set(normalizedKey, {
          ...tag,
          score: weightedScore
        });
      }
    });
  }

  /**
   * Apply diversity filter to avoid similar tags
   */
  private applyDiversityFilter(
    recommendations: TagRecommendation[],
    threshold: number
  ): TagRecommendation[] {
    const diverseRecommendations: TagRecommendation[] = [];
    const selectedTags = new Set<string>();
    
    for (const rec of recommendations) {
      let isDiverse = true;
      const normalizedTag = normalizeTag(rec.tag);
      
      // Check similarity with already selected tags using normalized forms
      for (const selected of selectedTags) {
        if (this.calculateTagSimilarity(normalizedTag, selected) > threshold) {
          isDiverse = false;
          break;
        }
      }
      
      if (isDiverse) {
        diverseRecommendations.push(rec);
        selectedTags.add(normalizedTag);
      }
    }
    
    return diverseRecommendations;
  }

  /**
   * Calculate similarity between two tags (simple string similarity)
   * Note: tags should already be normalized when passed to this method
   */
  private calculateTagSimilarity(tag1: string, tag2: string): number {
    const words1 = tag1.split(/[\s-_]+/);
    const words2 = tag2.split(/[\s-_]+/);
    
    let commonWords = 0;
    words1.forEach(word1 => {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        commonWords++;
      }
    });
    
    return commonWords / Math.max(words1.length, words2.length);
  }

  /**
   * Get reason priority for ranking
   */
  private getReasonPriority(reason: string): number {
    const priorities: Record<string, number> = {
      'personalized': 4,
      'trending': 3,
      'popular': 2,
      'related': 1,
      'new': 0
    };
    return priorities[reason] || 0;
  }

  /**
   * Extract tags from user's reading history
   */
  private extractTagsFromHistory(history: ReadingHistory[]): TagRecommendation[] {
    const tagFrequency = new Map<string, { count: number, originalTag: string }>();
    
    history.forEach((item: ReadingHistory) => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => {
          const normalizedKey = normalizeTag(tag);
          const existing = tagFrequency.get(normalizedKey);
          if (existing) {
            existing.count += 1;
            // Keep the original tag format, or update if current one seems more canonical
          } else {
            tagFrequency.set(normalizedKey, { count: 1, originalTag: tag });
          }
        });
      }
    });
    
    return Array.from(tagFrequency.entries()).map(([normalizedKey, { count, originalTag }]) => ({
      tag: originalTag, // Preserve original casing
      score: Math.min(count / 10, 1), // Normalize frequency
      reason: 'personalized' as const,
      category: 'reading-history'
    }));
  }

  /**
   * Fallback recommendations when main system fails
   */
  private getFallbackRecommendations(): Observable<TagRecommendation[]> {
    return this.blogService.getTagNames().pipe(
      map(tags => tags.slice(0, 10).map(tag => ({
        tag,
        score: 0.5,
        reason: 'popular' as const
      }))),
      catchError(() => of([]))
    );
  }
}

