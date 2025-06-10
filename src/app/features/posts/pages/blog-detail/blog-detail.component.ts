import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BlogService } from '../../../../core/services/blog.service';
import { BlogSummary, AiSummary } from '../../../../shared/interfaces/post.interface';
import { CommentResponse, CommentCreate } from '../../../../shared/interfaces/comment.interface';
import { LikeResponse } from '../../../../shared/interfaces/like.interface';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { AuthService } from '../../../../core/services/auth.service';
import { AiSummaryService } from '../../../../core/services/ai-summary.service';
import { CommentService } from '../../../../core/services/comment.service';
import { LikeService } from '../../../../core/services/like.service';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, FooterComponent],
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

  // Comment properties
  comments: CommentResponse[] = [];
  commentsLoading = false;
  commentsError: string | null = null;
  newCommentText = '';
  addingComment = false;
  showComments = false;
  editingCommentId: string | null = null;
  editingCommentText = '';

  // Like properties
  isLiked = false;
  likesCount = 0;
  commentCount = 0;
  likesLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private blogService: BlogService,
    private authService: AuthService,
    private aiSummaryService: AiSummaryService,
    private commentService: CommentService,
    private likeService: LikeService
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
        // Initialize counts from blog data
        this.likesCount = blog.likes_count || 0;
        this.commentCount = blog.comment_count || 0;
        // Try to load existing AI summary if blog is published
        if (blog.published) {
          this.loadAiSummary();
        }
        // Load like status for authenticated users
        this.loadLikeStatus();
        // Load blog likes count from API to ensure accuracy
        this.loadBlogLikesCount();
        // Load comments to get accurate count
        this.loadComments();
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
    if (!this.blogId || !this.blog?.published || !this.blog?.title || !this.blog?.content) return;
    
    this.summaryLoading = true;
    this.summaryError = null;
    
    this.aiSummaryService.generateAiSummary(
      this.blogId,
      this.blog.title,
      this.blog.content
    ).pipe(
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
    // All authenticated users can generate summaries
    return this.authService.isAuthenticated();
  }

  canDeleteSummary(): boolean {
    // Only the blog author can delete summaries
    return this.authService.isAuthenticated() && 
           this.blog?.user_id === this.authService.getCurrentUser()?._id;
  }

  // Helper method to get tag name (handles both string and object types)
  getTagName(tag: any): string {
    return typeof tag === 'string' ? tag : tag?.name || '';
  }

  // Get tags as an array for template iteration
  getTags(): any[] {
    return this.blog?.tags ? [...this.blog.tags] : [];
  }

  // Comment methods
  toggleComments(): void {
    this.showComments = !this.showComments;
    if (this.showComments && this.comments.length === 0) {
      this.loadComments();
    }
  }

  loadComments(): void {
    if (!this.blogId) return;
    
    this.commentsLoading = true;
    this.commentsError = null;
    
    this.commentService.getBlogComments(this.blogId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (comments: CommentResponse[]) => {
        this.comments = comments;
        // Update comment count based on actual loaded comments
        this.commentCount = comments.length;
        console.log('Updated comment count:', this.commentCount);
        if (this.blog) {
          this.blog.comment_count = this.commentCount;
        }
        this.commentsLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading comments:', error);
        this.commentsError = 'Failed to load comments';
        this.commentsLoading = false;
      }
    });
  }

  addComment(): void {
    if (!this.newCommentText.trim() || !this.blogId || this.addingComment) return;
    
    this.addingComment = true;
    const commentData: CommentCreate = {
      text: this.newCommentText.trim()
    };
    
    this.commentService.createComment(this.blogId, commentData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (comment: CommentResponse) => {
        this.comments.unshift(comment);
        this.newCommentText = '';
        this.addingComment = false;
        // Update blog comment count
        this.commentCount = this.commentCount + 1;
        console.log('After adding comment, count:', this.commentCount);
        if (this.blog) {
          this.blog.comment_count = this.commentCount;
        }
      },
      error: (error: any) => {
        console.error('Error adding comment:', error);
        this.addingComment = false;
      }
    });
  }

  startEditComment(comment: CommentResponse): void {
    this.editingCommentId = comment._id;
    this.editingCommentText = comment.text;
  }

  cancelEditComment(): void {
    this.editingCommentId = null;
    this.editingCommentText = '';
  }

  updateComment(): void {
    if (!this.editingCommentId || !this.editingCommentText.trim()) return;
    
    const commentData: CommentCreate = {
      text: this.editingCommentText.trim()
    };
    
    this.commentService.updateComment(this.editingCommentId, commentData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (updatedComment: CommentResponse) => {
        const index = this.comments.findIndex(c => c._id === this.editingCommentId);
        if (index !== -1) {
          this.comments[index] = updatedComment;
        }
        this.cancelEditComment();
      },
      error: (error: any) => {
        console.error('Error updating comment:', error);
      }
    });
  }

  deleteComment(commentId: string): void {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    this.commentService.deleteComment(commentId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c._id !== commentId);
        // Update blog comment count
        this.commentCount = Math.max(this.commentCount - 1, 0);
        if (this.blog) {
          this.blog.comment_count = this.commentCount;
        }
      },
      error: (error: any) => {
        console.error('Error deleting comment:', error);
      }
    });
  }

  canEditComment(comment: CommentResponse): boolean {
    return this.authService.isAuthenticated() && 
           comment.user_id === this.authService.getCurrentUser()?._id;
  }

  // Like methods
  loadLikeStatus(): void {
    if (!this.blogId || !this.authService.isAuthenticated()) return;
    
    this.likeService.getMyLikeForBlog(this.blogId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (like: LikeResponse) => {
        this.isLiked = !!like._id;
      },
      error: (error: any) => {
        // 404 means user hasn't liked this blog
        if (error.status === 404) {
          this.isLiked = false;
        }
      }
    });
  }

  loadBlogLikesCount(): void {
    if (!this.blogId) return;
    
    this.likeService.getBlogLikesCount(this.blogId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (count: number) => {
        this.likesCount = count;
        // Update blog object if it exists
        if (this.blog) {
          this.blog.likes_count = count;
        }
      },
      error: (error: any) => {
        console.error('Error loading likes count:', error);
      }
    });
  }

  toggleLike(): void {
    if (!this.blogId || this.likesLoading || !this.authService.isAuthenticated()) return;
    
    this.likesLoading = true;
    
    this.likeService.toggleLike(this.blogId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: LikeResponse) => {
        // Handle unlike response (message object)
        if (response.message && response.message.includes('removed')) {
          this.isLiked = false;
          this.likesCount = Math.max(this.likesCount - 1, 0);
          if (this.blog) {
            this.blog.likes_count = this.likesCount;
          }
        } 
        // Handle like response (LikeResponse object with _id)
        else if (response._id) {
          this.isLiked = true;
          this.likesCount = this.likesCount + 1;
          if (this.blog) {
            this.blog.likes_count = this.likesCount;
          }
        }
        this.likesLoading = false;
        
        // Reload likes count to ensure accuracy
        this.loadBlogLikesCount();
      },
      error: (error: any) => {
        console.error('Error toggling like:', error);
        this.likesLoading = false;
      }
    });
  }

  canComment(): boolean {
    return this.authService.isAuthenticated();
  }

  canLike(): boolean {
    return this.authService.isAuthenticated();
  }
}
