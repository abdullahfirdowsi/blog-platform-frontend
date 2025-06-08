import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BlogStateService } from '../../../../core/services/blog-state.service';
import { Blog, UpdateBlogRequest } from '../../../../shared/interfaces/post.interface';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';

export interface BlogBlock {
  id: string;
  type: 'subtitle' | 'content' | 'image';
  data: string;
  placeholder?: string;
}

@Component({
  selector: 'app-edit-blog',
  standalone: true,
  imports: [CommonModule, FormsModule, FooterComponent],
  templateUrl: './edit-blog.component.html',
  styleUrl: './edit-blog.component.css'
})
export class EditBlogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  blogId: string = '';
  blog: Blog | null = null;
  blogTitle = '';
  blogBlocks: BlogBlock[] = [];
  originalContent = '';
  
  // UI state
  loading = false;
  saving = false;
  hasChanges = false;
  showAddMenu = false;
  currentBlockId: string | null = null;
  showUnsavedChangesModal = false;
  pendingNavigation: string | null = null;
  
  // Menu options
  blockTypes: { type: BlogBlock['type'], label: string, icon: string }[] = [
    { type: 'subtitle', label: 'Subtitle', icon: 'H2' },
    { type: 'content', label: 'Content', icon: 'P' },
    { type: 'image', label: 'Image', icon: 'IMG' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private blogStateService: BlogStateService
  ) {}

  ngOnInit(): void {
    this.blogId = this.route.snapshot.paramMap.get('id') || '';
    if (this.blogId) {
      this.loadBlog();
    } else {
      this.router.navigate(['/posts']);
    }

    // Subscribe to blog state changes
    this.blogStateService.selectedBlog$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(blog => {
      if (blog) {
        this.blog = blog;
        this.initializeEditForm(blog);
      }
    });

    this.blogStateService.hasChanges$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(hasChanges => {
      this.hasChanges = hasChanges;
    });
  }

  ngOnDestroy(): void {
    this.blogStateService.clearSelectedBlog();
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.hasChanges) {
      $event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  }

  private loadBlog(): void {
    this.loading = true;
    this.blogStateService.getBlogById(this.blogId).subscribe({
      next: (blog) => {
        this.loading = false;
        if (!blog) {
          this.router.navigate(['/posts']);
        }
      },
      error: (error) => {
        console.error('Error loading blog:', error);
        this.loading = false;
        this.router.navigate(['/posts']);
      }
    });
  }

  private initializeEditForm(blog: Blog): void {
    this.blogTitle = blog.title;
    this.originalContent = blog.content;
    
    try {
      // Parse JSON content into blocks
      const blocks = JSON.parse(blog.content);
      if (Array.isArray(blocks) && blocks.length > 0) {
        this.blogBlocks = blocks.map(block => ({
          ...block,
          id: block.id || this.generateId(),
          placeholder: this.getPlaceholder(block.type)
        }));
      } else {
        // If content is not in block format, create a single content block
        this.blogBlocks = [{
          id: this.generateId(),
          type: 'content',
          data: blog.content || '',
          placeholder: 'Enter your content...'
        }];
      }
    } catch (error) {
      console.log('Content is not JSON, treating as plain text:', error);
      // If content is not valid JSON, create a single content block
      this.blogBlocks = [{
        id: this.generateId(),
        type: 'content',
        data: blog.content || '',
        placeholder: 'Enter your content...'
      }];
    }

    // Reset change tracking
    this.blogStateService.resetChanges();
  }

  private generateId(): string {
    return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private getPlaceholder(type: string): string {
    switch (type) {
      case 'subtitle': return 'Enter subtitle...';
      case 'content': return 'Start writing your content...';
      case 'image': return 'Enter image URL...';
      default: return 'Enter text...';
    }
  }

  onTitleChange(): void {
    this.checkForChanges();
  }

  onBlockChange(blockId: string, value: string): void {
    const block = this.blogBlocks.find(b => b.id === blockId);
    if (block) {
      block.data = value;
      this.checkForChanges();
    }
  }

  private checkForChanges(): void {
    const currentContent = JSON.stringify(this.blogBlocks);
    const titleChanged = this.blogTitle !== this.blog?.title;
    const contentChanged = currentContent !== this.originalContent;
    
    this.hasChanges = titleChanged || contentChanged;
    
    // Update state service
    if (contentChanged) {
      this.blogStateService.updateSelectedBlogContent(currentContent);
    }
  }

  // Toggle add menu
  toggleAddMenu(blockId?: string): void {
    this.currentBlockId = blockId || null;
    this.showAddMenu = !this.showAddMenu;
  }

  // Close add menu
  closeAddMenu(): void {
    this.showAddMenu = false;
    this.currentBlockId = null;
  }

  // Add new block
  addBlock(type: BlogBlock['type']): void {
    const newBlock: BlogBlock = {
      id: this.generateId(),
      type,
      data: '',
      placeholder: this.getPlaceholder(type)
    };

    if (this.currentBlockId) {
      // Insert after current block
      const index = this.blogBlocks.findIndex(block => block.id === this.currentBlockId);
      this.blogBlocks.splice(index + 1, 0, newBlock);
    } else {
      // Add to end
      this.blogBlocks.push(newBlock);
    }

    this.closeAddMenu();
    this.checkForChanges();
    
    // Focus on the new block after a short delay
    setTimeout(() => {
      const element = document.getElementById(`block-${newBlock.id}`);
      if (element) {
        element.focus();
      }
    }, 100);
  }

  // Remove block
  removeBlock(blockId: string): void {
    const index = this.blogBlocks.findIndex(block => block.id === blockId);
    if (index > -1) {
      this.blogBlocks.splice(index, 1);
      this.checkForChanges();
    }
  }

  // Move block up
  moveBlockUp(blockId: string): void {
    const index = this.blogBlocks.findIndex(block => block.id === blockId);
    if (index > 0) {
      const block = this.blogBlocks[index];
      this.blogBlocks.splice(index, 1);
      this.blogBlocks.splice(index - 1, 0, block);
      this.checkForChanges();
    }
  }

  // Move block down
  moveBlockDown(blockId: string): void {
    const index = this.blogBlocks.findIndex(block => block.id === blockId);
    if (index < this.blogBlocks.length - 1) {
      const block = this.blogBlocks[index];
      this.blogBlocks.splice(index, 1);
      this.blogBlocks.splice(index + 1, 0, block);
      this.checkForChanges();
    }
  }

  // Auto-resize textarea
  autoResize(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }

  saveChanges(): void {
    if (!this.hasChanges) {
      alert('No changes to save.');
      return;
    }

    if (!this.blogTitle.trim()) {
      alert('Please enter a blog title');
      return;
    }

    if (this.blogBlocks.length === 0) {
      alert('Please add some content blocks');
      return;
    }

    this.saving = true;
    
    const updateData: UpdateBlogRequest = {
      title: this.blogTitle,
      content: JSON.stringify(this.blogBlocks)
    };

    this.blogStateService.updateBlog(this.blogId, updateData).subscribe({
      next: (updatedBlog) => {
        this.saving = false;
        this.originalContent = updatedBlog.content;
        this.hasChanges = false;
        console.log('Blog updated successfully');
        // Show success message or navigate back
        alert('Blog updated successfully!');
      },
      error: (error) => {
        console.error('Error updating blog:', error);
        this.saving = false;
        alert('Error updating blog. Please try again.');
      }
    });
  }

  discardChanges(): void {
    if (this.hasChanges) {
      this.showUnsavedChangesModal = true;
      this.pendingNavigation = '/posts';
    } else {
      this.router.navigate(['/posts']);
    }
  }

  confirmDiscardChanges(): void {
    this.hasChanges = false;
    this.showUnsavedChangesModal = false;
    
    if (this.pendingNavigation) {
      this.router.navigate([this.pendingNavigation]);
    }
  }

  cancelDiscardChanges(): void {
    this.showUnsavedChangesModal = false;
    this.pendingNavigation = null;
  }

  // Handle click outside to close menu
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.add-menu-container')) {
      this.closeAddMenu();
    }
  }

  trackByBlockId(index: number, block: BlogBlock): string {
    return block.id;
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
}

