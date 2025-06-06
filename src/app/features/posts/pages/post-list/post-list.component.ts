import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { PostsService } from '../../../../core/services/posts.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, CommonModule, FormsModule, RouterModule],
  templateUrl: './post-list.component.html',
  styleUrl: './post-list.component.css'
})
export class PostListComponent implements OnInit, OnDestroy {
  blogs: any[] = [];
  loading = false;
  error = '';
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;
  tags: any[] = [];
  selectedTagId = '';
  showPublishedOnly = true;
  isAuthenticated = false;
  currentUser: any = null;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private postsService: PostsService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.document.body.classList.add('has-header');
    this.checkAuthStatus();
    this.loadTags();
    this.loadBlogs();
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('has-header');
  }

  checkAuthStatus(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.currentUser = this.authService.getCurrentUser();
    }
  }

  loadTags(): void {
    this.postsService.getTags().subscribe({
      next: (tags) => this.tags = tags,
      error: (err) => console.error('Error loading tags:', err)
    });
  }

  loadBlogs(): void {
    this.loading = true;
    this.error = '';
    
    const filters = {
      page: this.currentPage,
      page_size: this.pageSize,
      published_only: this.showPublishedOnly,
      tag_id: this.selectedTagId || undefined
    };

    this.postsService.getPosts(filters).subscribe({
      next: (response) => {
        this.blogs = response.blogs || [];
        this.totalCount = response.total_count || 0;
        this.totalPages = response.total_pages || 0;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load blogs. Please try again.';
        this.loading = false;
        console.error('Error loading blogs:', err);
      }
    });
  }

  onTagChange(): void {
    this.currentPage = 1;
    this.loadBlogs();
  }

  togglePublishedOnly(): void {
    this.currentPage = 1;
    this.loadBlogs();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadBlogs();
    }
  }

  likeBlog(blog: any): void {
    if (!this.isAuthenticated) {
      alert('Please login to like posts');
      return;
    }

    if (blog.is_liked) {
      this.postsService.unlikePost(blog.blog.id).subscribe({
        next: () => {
          blog.is_liked = false;
          blog.blog.likes_count = (blog.blog.likes_count || 1) - 1;
        },
        error: (err) => console.error('Error unliking blog:', err)
      });
    } else {
      this.postsService.likePost(blog.blog.id).subscribe({
        next: () => {
          blog.is_liked = true;
          blog.blog.likes_count = (blog.blog.likes_count || 0) + 1;
        },
        error: (err) => console.error('Error liking blog:', err)
      });
    }
  }

  truncateContent(content: string, maxLength: number = 200): string {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  getPages(): number[] {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getActiveAuthors(): number {
    if (!this.blogs || this.blogs.length === 0) {
      return 0;
    }
    
    // Count unique authors from the current blogs
    const uniqueAuthors = new Set();
    this.blogs.forEach(blogItem => {
      if (blogItem.blog && blogItem.blog.author) {
        uniqueAuthors.add(blogItem.blog.author.id || blogItem.blog.author.name);
      }
    });
    
    return uniqueAuthors.size;
  }
}
