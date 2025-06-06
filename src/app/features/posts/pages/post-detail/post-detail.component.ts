import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule, DatePipe, DOCUMENT } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { PostsService } from '../../../../core/services/posts.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
    private location: Location,
    private postsService: PostsService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.document.body.classList.add('has-header');
    this.checkAuthStatus();
    this.loadPostFromRoute();
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('has-header');
  }
  
  private loadPostFromRoute(): void {
    const postId = this.route.snapshot.paramMap.get('id');
    if (!postId) {
      this.error = 'Post ID not found';
      return;
    }

    this.loading = true;
    this.error = null;
    
    this.postsService.getPost(postId).subscribe({
      next: (response) => {
        this.post = response;
        this.renderContentBlocks();
        this.calculateReadingTime();
        this.checkCanEdit();
        this.checkLikedStatus();
        this.loadRelatedPosts();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading post:', err);
        this.error = 'Failed to load post. Please try again.';
        this.loading = false;
      }
    });
  }
  
  loadPost(): void {
    this.loadPostFromRoute();
  }
  
  goBack(): void {
    this.location.back();
  }
  
  deletePost(): void {
    if (!this.post) return;
    
    if (confirm('Are you sure you want to delete this post?')) {
      this.postsService.deletePost(this.post.id).subscribe({
        next: () => {
          console.log('Post deleted successfully');
          this.router.navigate(['/posts']);
        },
        error: (err) => {
          console.error('Error deleting post:', err);
          alert('Failed to delete post. Please try again.');
        }
      });
    }
  }
  
  toggleLike(): void {
    if (!this.isAuthenticated || !this.post) return;
    
    if (this.isLiked) {
      // Unlike the post
      this.postsService.unlikePost(this.post.id).subscribe({
        next: () => {
          this.isLiked = false;
          if (this.post) {
            this.post.likes_count = (this.post.likes_count || 1) - 1;
          }
        },
        error: (err) => {
          console.error('Error unliking post:', err);
        }
      });
    } else {
      // Like the post
      this.postsService.likePost(this.post.id).subscribe({
        next: () => {
          this.isLiked = true;
          if (this.post) {
            this.post.likes_count = (this.post.likes_count || 0) + 1;
          }
        },
        error: (err) => {
          console.error('Error liking post:', err);
        }
      });
    }
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
      // Get word count from rendered content (without HTML tags)
      const textContent = this.renderedContent.replace(/<[^>]*>/g, '');
      const wordCount = textContent.split(' ').filter(word => word.length > 0).length;
      this.readingTime = Math.ceil(wordCount / wordsPerMinute) || 1;
    }
  }

  private checkAuthStatus(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
  }

  private checkCanEdit(): void {
    if (!this.isAuthenticated || !this.post) {
      this.canEdit = false;
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (currentUser && this.post.author) {
      // Check if current user is the author
      this.canEdit = currentUser.id === (this.post.author as any).id || 
                     currentUser.email === (this.post.author as any).email;
    }
  }

  private checkLikedStatus(): void {
    if (!this.isAuthenticated || !this.post) {
      this.isLiked = false;
      return;
    }

    // Check if user has liked this post
    this.postsService.getBlogLikes(this.post.id).subscribe({
      next: (likes) => {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && likes.likes) {
          this.isLiked = likes.likes.some((like: any) => 
            like.user_id === currentUser.id || like.user_email === currentUser.email
          );
        }
      },
      error: (err) => {
        console.error('Error checking like status:', err);
        this.isLiked = false;
      }
    });
  }

  private loadRelatedPosts(): void {
    if (!this.post) return;

    // TODO: Implement related posts loading
    this.relatedPosts = [];
  }

  private renderContentBlocks(): void {
    if (!this.post) return;

    try {
      // Check if content is in JSON block format
      if (this.post.content && this.post.content.trim().startsWith('[')) {
        const blocks = JSON.parse(this.post.content);
        this.renderedContent = this.convertBlocksToHtml(blocks);
      } else {
        // Legacy content - treat as plain text/HTML
        this.renderedContent = this.post.content || '';
      }
    } catch (error) {
      console.error('Error parsing content blocks:', error);
      // Fallback to treating content as plain text
      this.renderedContent = this.post.content || '';
    }
  }

  private convertBlocksToHtml(blocks: any[]): string {
    return blocks.map(block => {
      switch (block.type) {
        case 'content':
          return `<p class=\"content-paragraph\">${this.escapeHtml(block.data)}</p>`;
        
        case 'subtitle':
          return `<h2 class=\"content-subtitle\">${this.escapeHtml(block.data)}</h2>`;
        
        case 'imageUrl':
        case 'image':
          if (block.data && block.data.trim()) {
            return `<div class=\"content-image-wrapper\">\n                      <img src=\"${this.escapeHtml(block.data)}\" alt=\"Content image\" class=\"content-image\" />\n                    </div>`;
          }
          return '';
        
        default:
          return `<div class=\"content-block\">${this.escapeHtml(block.data || '')}</div>`;
      }
    }).filter(html => html.trim() !== '').join('\n');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
