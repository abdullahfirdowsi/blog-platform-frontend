import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BlogStateService } from '../../../../core/services/blog-state.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfilePictureService } from '../../../../core/services/profile-picture.service';
import { Blog } from '../../../../shared/interfaces/post.interface';
import { FooterComponent } from "../../../../shared/components/footer/footer.component";
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';

@Component({
  selector: 'app-my-blogs',
  standalone: true,
  imports: [CommonModule, FooterComponent, DateFormatPipe],
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
    private authService: AuthService,
    private profilePictureService: ProfilePictureService,
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
    console.log('Editing blog:', blog);
    // Handle both API response format (id) and localStorage format (_id)
    const blogId = (blog as any).id || blog._id;
    if (!blogId || blogId === '' || blogId === 'undefined') {
      console.error('Blog ID is missing or invalid:', blog);
      console.error('Blog object structure:', JSON.stringify(blog, null, 2));
      alert('Cannot edit blog: Invalid blog ID. Please check the blog data.');
      return;
    }
    console.log('Navigating to edit blog with ID:', blogId);
    this.router.navigate(['/posts/edit', blogId]);
  }

  onDeleteBlog(blog: Blog): void {
    this.selectedBlogForDelete = blog;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.selectedBlogForDelete) {
      // Handle both API response format (id) and localStorage format (_id)
      const blogId = (this.selectedBlogForDelete as any).id || this.selectedBlogForDelete._id;
      this.blogStateService.deleteBlog(blogId).subscribe({
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


  getContentPreview(blog: Blog): string {
    // Handle both API response format (blog_body) and localStorage format (content)
    const content = (blog as any).blog_body || blog.content;
    if (!content) return 'No content';
    
    try {
      // Parse JSON string content (block-based content)
      const blocks = JSON.parse(content);
      if (Array.isArray(blocks)) {
        const textBlocks = blocks
          .filter(block => block.type === 'content' && block.data)
          .map(block => block.data)
          .join(' ');
        return textBlocks.length > 150 ? textBlocks.substring(0, 150) + '...' : textBlocks || 'No content';
      }
    } catch {
      // If not valid JSON, treat as plain text
      const plainText = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
      return plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
    }
    
    return 'No content';
  }

  navigateToWrite(): void {
    this.router.navigate(['/posts/write']);
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

  // Get processed image URL with fallback
  getImageUrl(imageUrl: string | undefined): string {
    // Return placeholder if the image URL is not available
    if (!imageUrl || imageUrl.trim() === '') {
      return this.getPlaceholderImage();
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
    return this.getPlaceholderImage();
  }

  trackByBlogId(index: number, blog: Blog): string {
    // Handle both API response format (id) and localStorage format (_id)
    return (blog as any).id || blog._id;
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = this.getPlaceholderImage();
    }
  }
}

