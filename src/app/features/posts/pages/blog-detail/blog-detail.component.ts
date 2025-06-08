import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BlogService } from '../../../../core/services/blog.service';
import { BlogSummary, AiSummary } from '../../../../shared/interfaces/post.interface';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { AuthService } from '../../../../core/services/auth.service';
import { AiSummaryService } from '../../../../core/services/ai-summary.service';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, FooterComponent],
  templateUrl: './blog-detail.component.html',
  styleUrl: './blog-detail.component.css'
})
export class BlogDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  blog: BlogSummary | null = null;
  loading = false;
  error: string | null = null;
  blogId: string = '';

  // AI Summary properties
  aiSummary: AiSummary | null = null;
  summaryLoading = false;
  summaryError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private blogService: BlogService,
    private authService: AuthService,
    private aiSummaryService: AiSummaryService
  ) {}

  ngOnInit(): void {
    this.blogId = this.route.snapshot.paramMap.get('id') || '';
    if (this.blogId) {
      this.loadBlog();
    } else {
      this.error = 'Blog ID not found';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBlog(): void {
    this.loading = true;
    this.error = null;
    
    this.blogService.getBlogById(this.blogId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (blog) => {
        this.blog = blog;
        this.loading = false;
        // Try to load existing AI summary if blog is published
        if (blog.published) {
          this.loadAiSummary();
        }
      },
      error: (error) => {
        console.error('Error loading blog:', error);
        this.error = 'Failed to load blog. It may have been deleted or you may not have permission to view it.';
        this.loading = false;
      }
    });
  }

  navigateBack(): void {
    this.router.navigate(['/home']);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getPlaceholderImage(): string {
    return 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
  }

  getContentBlocks(): any[] {
    if (!this.blog?.content) return [];
    
    try {
      // Parse JSON string content (block-based content)
      const blocks = JSON.parse(this.blog.content);
      if (Array.isArray(blocks) && blocks.length > 0) {
        return blocks.map(block => ({
          ...block,
          data: this.formatBlockContent(block)
        }));
      }
    } catch (error) {
      console.log('Content is not JSON, treating as plain text:', error);
      // If not valid JSON, treat as plain text
      return [{
        type: 'content',
        data: this.formatPlainTextContent(this.blog.content)
      }];
    }
    
    return [];
  }
  
  // Format block content for display
  private formatBlockContent(block: any): string {
    if (block.type === 'content' && block.data) {
      // Convert line breaks to HTML paragraphs
      return block.data.split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => `<p>${line}</p>`)
        .join('');
    }
    if (block.type === 'subtitle' && block.data) {
      // Return subtitle data as-is for proper HTML rendering
      return block.data;
    }
    return block.data || '';
  }
  
  // Format plain text content for display
  private formatPlainTextContent(content: string): string {
    if (!content) return '';
    
    // Convert line breaks to HTML paragraphs
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => `<p>${line}</p>`)
      .join('');
  }

  getDefaultAvatar(username: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=667eea&color=fff&size=40`;
  }

  // AI Summary methods
  loadAiSummary(): void {
    if (!this.blogId) return;
    
    this.summaryLoading = true;
    this.summaryError = null;
    
    this.aiSummaryService.getAiSummary(this.blogId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (summary: AiSummary) => {
        this.aiSummary = summary;
        this.summaryLoading = false;
      },
      error: (error: any) => {
        // If summary doesn't exist (404), that's normal
        if (error.status === 404) {
          this.aiSummary = null;
        } else {
          console.error('Error loading AI summary:', error);
          this.summaryError = 'Failed to load AI summary';
        }
        this.summaryLoading = false;
      }
    });
  }

  generateAiSummary(): void {
    if (!this.blogId || !this.blog?.published) return;
    
    this.summaryLoading = true;
    this.summaryError = null;
    
    this.aiSummaryService.generateAiSummary(this.blogId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (summary: AiSummary) => {
        this.aiSummary = summary;
        this.summaryLoading = false;
      },
      error: (error: any) => {
        console.error('Error generating AI summary:', error);
        this.summaryError = error.error?.detail || 'Failed to generate AI summary';
        this.summaryLoading = false;
      }
    });
  }

  deleteAiSummary(): void {
    if (!this.blogId || !this.aiSummary) return;
    
    if (confirm('Are you sure you want to delete this AI summary?')) {
      this.summaryLoading = true;
      this.summaryError = null;
      
      this.aiSummaryService.deleteAiSummary(this.blogId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.aiSummary = null;
          this.summaryLoading = false;
        },
        error: (error: any) => {
          console.error('Error deleting AI summary:', error);
          this.summaryError = 'Failed to delete AI summary';
          this.summaryLoading = false;
        }
      });
    }
  }

  canManageSummary(): boolean {
    return this.authService.isAuthenticated() && 
           this.blog?.user_id === this.authService.getCurrentUser()?._id;
  }
}

