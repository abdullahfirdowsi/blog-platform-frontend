import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BlogService } from '../../../../core/services/blog.service';
import { BlogSummary } from '../../../../shared/interfaces/post.interface';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private blogService: BlogService
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
      if (Array.isArray(blocks)) {
        return blocks;
      }
    } catch {
      // If not valid JSON, treat as plain text
      return [{
        type: 'content',
        data: this.blog.content
      }];
    }
    
    return [];
  }

  getDefaultAvatar(username: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=667eea&color=fff&size=40`;
  }
}

