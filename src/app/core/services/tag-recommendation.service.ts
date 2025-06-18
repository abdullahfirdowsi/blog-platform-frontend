import { Injectable } from '@angular/core';
import { Observable, combineLatest, map, catchError, of } from 'rxjs';
import { BlogService } from './blog.service';
import { AuthService } from './auth.service';
import { InterestsService } from './interests.service';
import { Tag } from '../../shared/interfaces/post.interface';
import { normalizeTag, areTagsEqual } from '../../shared/utils/tag-utils';

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

  constructor(
    private blogService: BlogService,
    private authService: AuthService,
    private interestsService: InterestsService
  ) {}

  /**
   * Get comprehensive tag recommendations using hybrid approach
   */
  getRecommendedTags(config: Partial<RecommendationConfig> = {}): Observable<TagRecommendation[]> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    return combineLatest([
      this.getTrendingTags(),
      this.getPersonalizedTags(),
      this.getPopularTags(),
      this.getRelatedTags(),
      this.getNewTags()
    ]).pipe(
      map(([trending, personalized, popular, related, newTags]) => {
        return this.combineAndRankRecommendations(
          trending,
          personalized,
          popular,
          related,
          newTags,
          finalConfig
        );
      }),
      catchError(error => {
        console.error('Error getting tag recommendations:', error);
        return this.getFallbackRecommendations();
      })
    );
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
        
        // Create a set of available tag names for quick lookup using normalized tags
        const availableTagNames = new Set(availableTags.map(tag => normalizeTag(tag.name)));
        
        // Add tags from user interests only if they exist in the blog system
        if (interests && interests.interests) {
          interests.interests.forEach((interest: string) => {
            // Check if the interest matches any existing tag using normalized comparison
            const matchingTag = availableTags.find(tag => 
              areTagsEqual(tag.name, interest) ||
              normalizeTag(tag.name).includes(normalizeTag(interest)) ||
              normalizeTag(interest).includes(normalizeTag(tag.name))
            );
            
            if (matchingTag) {
              personalizedTags.push({
                tag: matchingTag.name, // Use the actual tag name from the blog system
                score: 0.9,
                reason: 'personalized',
                category: 'user-interest'
              });
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

