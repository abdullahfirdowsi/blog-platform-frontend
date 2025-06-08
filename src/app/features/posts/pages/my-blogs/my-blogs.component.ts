import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BlogStateService } from '../../../../core/services/blog-state.service';
import { Blog } from '../../../../shared/interfaces/post.interface';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-my-blogs',
  standalone: true,
  imports: [CommonModule, FooterComponent],
  templateUrl: './my-blogs.component.html',
  styleUrl: './my-blogs.component.css'
})
export class MyBlogsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  blogs: Blog[] = [];
  loading = false;
  error: string | null = null;
  selectedBlogForDelete: Blog | null = null;
  showDeleteModal = false;

  constructor(
    private blogStateService: BlogStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBlogs();
    
    // Subscribe to state changes
    this.blogStateService.blogs$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(blogs => {
      this.blogs = blogs;
    });

    this.blogStateService.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.loading = loading;
    });

    this.blogStateService.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.error = error;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBlogs(): void {
    this.blogStateService.loadMyBlogs().subscribe({
      next: (blogs) => {
        console.log('Loaded blogs:', blogs);
      },
      error: (error) => {
        console.error('Error loading blogs:', error);
      }
    });
  }

  onEditBlog(blog: Blog): void {
    this.router.navigate(['/posts/edit', blog._id]);
  }

  onDeleteBlog(blog: Blog): void {
    this.selectedBlogForDelete = blog;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.selectedBlogForDelete) {
      this.blogStateService.deleteBlog(this.selectedBlogForDelete._id).subscribe({
        next: () => {
          console.log('Blog deleted successfully');
          this.closeDeleteModal();
        },
        error: (error) => {
          console.error('Error deleting blog:', error);
          this.closeDeleteModal();
        }
      });
    }
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedBlogForDelete = null;
  }

  getStatusBadgeClass(published: boolean): string {
    return published ? 'status-published' : 'status-draft';
  }

  getStatusText(published: boolean): string {
    return published ? 'Published' : 'Draft';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getContentPreview(content: string): string {
    if (!content) return 'No content';
    
    try {
      // Parse JSON string content (block-based content)
      const blocks = JSON.parse(content);
      if (Array.isArray(blocks) && blocks.length > 0) {
        const textBlocks = blocks
          .filter(block => (block.type === 'content' || block.type === 'subtitle') && block.data)
          .map(block => {
            // Clean HTML tags and get plain text
            const cleanText = block.data.replace(/<[^>]*>/g, '').trim();
            return cleanText;
          })
          .filter(text => text.length > 0)
          .join(' ');
        
        if (textBlocks.length > 0) {
          return textBlocks.length > 150 ? textBlocks.substring(0, 150) + '...' : textBlocks;
        }
      }
    } catch (error) {
      console.log('Content is not JSON, treating as plain text:', error);
      // If not valid JSON, treat as plain text
      const plainText = content.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
      if (plainText) {
        return plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
      }
    }
    
    return 'No content available';
  }

  onViewBlog(blog: Blog): void {
    this.router.navigate(['/posts/view', blog._id]);
  }

  navigateToWrite(): void {
    this.router.navigate(['/write']);
  }

  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

  getPublishedCount(): number {
    return this.blogs.filter(blog => blog.published).length;
  }

  getDraftCount(): number {
    return this.blogs.filter(blog => !blog.published).length;
  }

  getPlaceholderImage(): string {
    return 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
  }

  trackByBlogId(index: number, blog: Blog): string {
    return blog._id;
  }
}

