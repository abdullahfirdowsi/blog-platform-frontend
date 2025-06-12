import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BlogStateService } from '../../../../core/services/blog-state.service';
import { BlogService } from '../../../../core/services/blog.service';
import { ImageUploadService } from '../../../../core/services/image-upload.service';
import { Blog, UpdateBlogRequest, Tag } from '../../../../shared/interfaces/post.interface';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';

export interface BlogBlock {
  id: string;
  type: 'subtitle' | 'content' | 'image';
  data: string;
  placeholder?: string;
}

@Component({
  selector: 'app-edit-blog',
  standalone: true,
  imports: [CommonModule, FormsModule, FooterComponent, DateFormatPipe],
  templateUrl: './edit-blog.component.html',
  styleUrl: './edit-blog.component.css'
})
export class EditBlogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  blogId = '';
  blog: Blog | null = null;
  blogTitle = '';
  blogBlocks: BlogBlock[] = [];
  originalContent = '';
  originalMainImage = '';
  originalTags: string[] = [];
  
  // UI state
  loading = false;
  saving = false;
  hasChanges = false;
  showAddMenu = false;
  currentBlockId: string | null = null;
  showUnsavedChangesModal = false;
  pendingNavigation: string | null = null;
  isUploadingImage = false;
  
  // Republish modal state
  showRepublishModal = false;
  isRepublishing = false;
  isUploadingMainImage = false;
  mainImageUrl = '';
  selectedTags: string[] = [];
  newTagInput = '';
  availableTags: Tag[] = [];
  isLoadingTags = false;
  
  // Message container
  showMessage = false;
  messageText = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  
  // Menu options
  blockTypes: { type: BlogBlock['type'], label: string, icon: string }[] = [
    { type: 'subtitle', label: 'Subtitle', icon: 'H2' },
    { type: 'content', label: 'Content', icon: 'P' },
    { type: 'image', label: 'Image', icon: 'IMG' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private blogStateService: BlogStateService,
    private blogService: BlogService,
    private imageUploadService: ImageUploadService
  ) {}

  ngOnInit(): void {
    this.blogId = this.route.snapshot.paramMap.get('id') || '';
    if (this.blogId) {
      this.loadBlog();
    } else {
      this.router.navigate(['/posts']);
    }
    
    this.loadAvailableTags();

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
    this.originalMainImage = blog.main_image_url || '';
    this.originalTags = blog.tags || [];  // Use tags instead of tag_ids
    
    // Initialize edit modal values
    this.mainImageUrl = blog.main_image_url || '';
    
    // Fix tags initialization - use tag names from tags array
    if (blog.tags && blog.tags.length > 0) {
      // If we have tags array, use it directly (they are strings in the API response)
      this.selectedTags = [...blog.tags];
    } else {
      this.selectedTags = [];
    }
    
    console.log('Initializing edit form with tags:', {
      blogTags: blog.tags,
      selectedTags: this.selectedTags
    });
    
    try {
      // Parse JSON content into blocks
      const blocks = JSON.parse(blog.content);
      if (Array.isArray(blocks)) {
        this.blogBlocks = blocks.map(block => ({
          ...block,
          placeholder: this.getPlaceholder(block.type)
        }));
      } else {
        // If content is not in block format, create a single content block
        this.blogBlocks = [{
          id: this.generateId(),
          type: 'content',
          data: blog.content,
          placeholder: 'Enter your content...'
        }];
      }
    } catch {
      // If content is not valid JSON, create a single content block
      this.blogBlocks = [{
        id: this.generateId(),
        type: 'content',
        data: blog.content,
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

  checkForChanges(): void {
    const currentContent = JSON.stringify(this.blogBlocks);
    const titleChanged = this.blogTitle !== this.blog?.title;
    const contentChanged = currentContent !== this.originalContent;
    const mainImageChanged = this.mainImageUrl !== (this.originalMainImage || '');
    const tagsChanged = JSON.stringify(this.selectedTags.sort()) !== JSON.stringify(this.originalTags.sort());
    
    this.hasChanges = titleChanged || contentChanged || mainImageChanged || tagsChanged;
    
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
      this.showMessageContainer('No changes to save.', 'info');
      return;
    }

    if (!this.blogTitle.trim()) {
      this.showMessageContainer('Please enter a blog title', 'error');
      return;
    }

    if (this.blogBlocks.length === 0) {
      this.showMessageContainer('Please add some content blocks', 'error');
      return;
    }

    // Open republish modal to edit main image and tags
    this.showRepublishModal = true;
  }
  
  // Perform the actual save operation
  performSave(): void {
    this.saving = true;
    this.isRepublishing = true;
    
    const updateData: UpdateBlogRequest = {
      title: this.blogTitle,
      content: JSON.stringify(this.blogBlocks),
      main_image_url: this.mainImageUrl,
      tags: this.selectedTags  // Changed from tag_ids to tags
    };

    // Use blogService.updateBlog directly to ensure MongoDB update
    this.blogService.updateBlog(this.blogId, updateData).subscribe({
      next: (updatedBlog) => {
        this.saving = false;
        this.isRepublishing = false;
        this.originalContent = JSON.stringify(this.blogBlocks);
        this.originalMainImage = updatedBlog.main_image_url || '';
        this.originalTags = updatedBlog.tags || [];  // Changed from tag_ids to tags
        this.hasChanges = false;
        this.showRepublishModal = false;
        console.log('Blog updated successfully in MongoDB');
        
        // Show success message in UI
        this.showMessageContainer('Blog updated successfully!', 'success');
        
        // Update the blog state
        this.blog = updatedBlog;
        
        // Navigate back to My Blogs after a short delay
        setTimeout(() => {
          this.router.navigate(['/posts']);
        }, 2000); // 2 second delay to show the success message
      },
      error: (error) => {
        console.error('Error updating blog in MongoDB:', error);
        this.saving = false;
        this.isRepublishing = false;
        
        // Show error message in UI instead of alert
        let errorMessage = 'Error updating blog. Please try again.';
        
        if (error.status === 404) {
          errorMessage = 'Blog not found. It may have been deleted.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to edit this blog.';
        } else if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your connection.';
        } else if (error.error?.detail) {
          errorMessage = error.error.detail;
        }
        
        this.showMessageContainer(errorMessage, 'error');
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


  // S3 Image Upload Functionality
  
  // Handle image file selection
  onImageFileSelect(event: Event, blockId: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showMessageContainer('Please select a valid image file', 'error');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showMessageContainer('Image size should be less than 5MB', 'error');
      return;
    }
    
    this.uploadImageToS3(file, blockId);
  }
  
  // Upload image to AWS S3
  private uploadImageToS3(file: File, blockId: string): void {
    const block = this.blogBlocks.find(b => b.id === blockId);
    if (!block) return;
    
    this.isUploadingImage = true;
    
    this.imageUploadService.uploadImage(file).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        console.log('Full upload response:', response);
        if (response && response.imageUrl) {
          block.data = response.imageUrl;
          console.log('Image uploaded to S3 successfully:', response.imageUrl);
          this.showMessageContainer('Image uploaded successfully!', 'success');
          this.isUploadingImage = false;
          this.checkForChanges(); // Mark as changed
        } else {
          console.error('Invalid response format:', response);
          this.showMessageContainer('Invalid response from server. Please try again.', 'error');
          this.isUploadingImage = false;
        }
      },
      error: (error) => {
        console.error('Error uploading image:', error);
        let errorMessage = 'Failed to upload image. Please try again.';
        
        if (error.status === 413) {
          errorMessage = 'Image file is too large. Please choose a smaller file.';
        } else if (error.status === 400) {
          errorMessage = 'Invalid image file. Please choose a valid image.';
        } else if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your connection.';
        }
        
        this.showMessageContainer(errorMessage, 'error');
        this.isUploadingImage = false;
      }
    });
  }
  
  // Trigger file input for image upload
  selectImageFile(blockId: string): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => this.onImageFileSelect(event!, blockId);
    input.click();
  }

  // Message container methods
  showMessageContainer(text: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.messageText = text;
    this.messageType = type;
    this.showMessage = true;
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      this.hideMessage();
    }, 5000);
  }

  hideMessage(): void {
    this.showMessage = false;
    this.messageText = '';
  }

  // Handle image load event
  onImageLoad(event: Event, blockId: string): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.style.display = 'block';
    }
  }

  // Handle image error event
  onImageError(event: Event, blockId?: string): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = this.getDefaultImage();
    }
  }

  // Get default image placeholder
  getDefaultImage(): string {
    return 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
  }
  
  // Load available tags
  private loadAvailableTags(): void {
    this.isLoadingTags = true;
    this.blogService.getTags().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (tags) => {
        this.availableTags = tags;
        this.isLoadingTags = false;
      },
      error: (error) => {
        console.error('Error loading tags:', error);
        this.isLoadingTags = false;
        // Fallback to some default tags
        this.availableTags = [
          { _id: '1', name: 'Technology', created_at: new Date().toISOString() },
          { _id: '2', name: 'Programming', created_at: new Date().toISOString() },
          { _id: '3', name: 'Web Development', created_at: new Date().toISOString() },
          { _id: '4', name: 'JavaScript', created_at: new Date().toISOString() },
          { _id: '5', name: 'Angular', created_at: new Date().toISOString() },
          { _id: '6', name: 'Tutorial', created_at: new Date().toISOString() }
        ];
      }
    });
  }

  // Handle main image file selection
  onMainImageFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showMessageContainer('Please select a valid image file', 'error');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showMessageContainer('Image size should be less than 5MB', 'error');
      return;
    }
    
    this.uploadMainImageToS3(file);
  }

  // Upload main image to AWS S3
  private uploadMainImageToS3(file: File): void {
    this.isUploadingMainImage = true;
    
    this.imageUploadService.uploadImage(file).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.mainImageUrl = response.imageUrl;
        console.log('Main image uploaded to S3:', response.imageUrl);
        this.showMessageContainer('Main image uploaded successfully!', 'success');
        this.isUploadingMainImage = false;
        this.checkForChanges();
      },
      error: (error) => {
        console.error('Error uploading main image:', error);
        this.showMessageContainer('Failed to upload main image. Please try again.', 'error');
        this.isUploadingMainImage = false;
      }
    });
  }

  // Select main image file
  selectMainImageFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => this.onMainImageFileSelect(event!);
    input.click();
  }

  // Remove main image
  removeMainImage(): void {
    this.mainImageUrl = '';
    this.checkForChanges();
  }

  // Add custom tag
  addCustomTag(): void {
    const tagName = this.newTagInput.trim();
    
    if (!tagName) {
      this.showMessageContainer('Please enter a tag name', 'error');
      return;
    }
    
    if (this.selectedTags.includes(tagName)) {
      this.showMessageContainer('Tag already added', 'error');
      return;
    }
    
    if (this.selectedTags.length >= 10) {
      this.showMessageContainer('Maximum 10 tags allowed', 'error');
      return;
    }
    
    this.selectedTags.push(tagName);
    this.newTagInput = '';
    this.checkForChanges();
  }

  // Remove tag from selected
  removeTag(tagName: string): void {
    const index = this.selectedTags.indexOf(tagName);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
      this.checkForChanges();
    }
  }

  // Add tag from recommended list
  addRecommendedTag(tagName: string): void {
    if (!this.selectedTags.includes(tagName)) {
      if (this.selectedTags.length >= 10) {
        this.showMessageContainer('Maximum 10 tags allowed', 'error');
        return;
      }
      this.selectedTags.push(tagName);
      this.checkForChanges();
    }
  }

  // Close republish modal
  closeRepublishModal(): void {
    this.showRepublishModal = false;
    // Reset to original values
    this.mainImageUrl = this.originalMainImage || '';
    
    // Reset tags - restore the original tags
    this.selectedTags = [...this.originalTags];
    
    this.newTagInput = '';
  }

  // Handle main image error event
  onMainImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = this.getDefaultImage();
      this.showMessageContainer('Failed to load main image. Using default image.', 'error');
    }
  }
}

