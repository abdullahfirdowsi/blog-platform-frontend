import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule, DatePipe, DOCUMENT } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';

// Define interfaces for type safety
interface Post {
  id: string;
  title: string;
  content: string;
  main_image_url?: string;
  published: boolean;
  author?: {
    name: string;
  };
  created_at: string;
  tags?: string[];
  likes_count?: number;
}

interface RelatedPost {
  id: string;
  title: string;
  content: string;
  main_image_url?: string;
  created_at: string;
}

@Component({
  selector: 'app-post-detail',
  imports: [HeaderComponent, FooterComponent, CommonModule, RouterModule],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.css'
})
export class PostDetailComponent implements OnInit, OnDestroy {
  // Component state
  loading = false;
  error: string | null = null;
  post: Post | null = null;
  relatedPosts: RelatedPost[] = [];
  
  // User interaction state
  isLiked = false;
  isBookmarked = false;
  isAuthenticated = false;
  canEdit = false;
  
  // Computed properties
  readingTime = 0;
  renderedContent = '';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.document.body.classList.add('has-header');
    // TODO: Load post data based on route params
    this.loadPostFromRoute();
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('has-header');
  }
  
  private loadPostFromRoute(): void {
    // TODO: Implement actual post loading logic
    // For now, set up mock data to prevent template errors
    this.loading = true;
    this.error = null;
    
    // Simulate loading
    setTimeout(() => {
      this.loading = false;
      // Mock post data - replace with actual service call
      this.post = {
        id: '1',
        title: 'Sample Post Title',
        content: 'This is sample content for the post.',
        main_image_url: '',
        published: true,
        author: {
          name: 'John Doe'
        },
        created_at: new Date().toISOString(),
        tags: ['angular', 'typescript'],
        likes_count: 0
      };
      this.renderedContent = this.post.content;
      this.calculateReadingTime();
    }, 1000);
  }
  
  loadPost(): void {
    this.loadPostFromRoute();
  }
  
  goBack(): void {
    this.location.back();
  }
  
  deletePost(): void {
    if (confirm('Are you sure you want to delete this post?')) {
      // TODO: Implement delete functionality
      console.log('Delete post');
    }
  }
  
  toggleLike(): void {
    if (!this.isAuthenticated) return;
    this.isLiked = !this.isLiked;
    // TODO: Implement like functionality
  }
  
  sharePost(): void {
    if (navigator.share && this.post) {
      navigator.share({
        title: this.post.title,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  }
  
  toggleBookmark(): void {
    if (!this.isAuthenticated) return;
    this.isBookmarked = !this.isBookmarked;
    // TODO: Implement bookmark functionality
  }
  
  getExcerpt(content: string): string {
    return content.length > 150 ? content.substring(0, 150) + '...' : content;
  }
  
  private calculateReadingTime(): void {
    if (this.post) {
      const wordsPerMinute = 200;
      const wordCount = this.post.content.split(' ').length;
      this.readingTime = Math.ceil(wordCount / wordsPerMinute);
    }
  }
}
