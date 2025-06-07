import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { BlogService } from '../../../../core/services/blog.service';
import { FooterComponent } from "../../../../shared/components/footer/footer.component";
import { Tag } from '../../../../shared/interfaces/post.interface';

export interface BlogBlock {
  id: string;
  type: 'subtitle' | 'content' | 'image';
  data: string;
  placeholder?: string;
}

@Component({
  selector: 'app-blog-writer',
  standalone: true,
  imports: [CommonModule, FormsModule, FooterComponent],
  templateUrl: './blog-writer.component.html',
  styleUrl: './blog-writer.component.css'
})
export class BlogWriterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Blog data
  blogTitle = '';
  blogBlocks: BlogBlock[] = [];
  
  // UI state
  showAddMenu = false;
  currentBlockId: string | null = null;
  isAuthenticated = false;
  isSaving = false;
  isUploadingImage = false;
  
  // Publish modal state
  showPublishModal = false;
  isPublishing = false;
  isUploadingMainImage = false;
  mainImageUrl = '';
  selectedTags: string[] = [];
  newTagInput = '';
  availableTags: Tag[] = [];
  isLoadingTags = false;
  
  // Menu options
  blockTypes: { type: BlogBlock['type'], label: string, icon: string }[] = [
    { type: 'subtitle', label: 'Subtitle', icon: 'H2' },
    { type: 'content', label: 'Content', icon: 'P' },
    { type: 'image', label: 'Image', icon: 'IMG' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private blogService: BlogService
  ) {}

  ngOnInit(): void {
    this.checkAuthStatus();
    this.loadAvailableTags();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkAuthStatus(): void {
    this.authService.isAuthenticated$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((isAuth: boolean) => {
      this.isAuthenticated = isAuth;
      if (!isAuth) {
        this.router.navigate(['/auth/login']);
      }
    });
  }

  // Generate unique ID for blocks
  private generateId(): string {
    return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
    
    // Focus on the new block after a short delay
    setTimeout(() => {
      const element = document.getElementById(`block-${newBlock.id}`);
      if (element) {
        element.focus();
      }
    }, 100);
  }

  // Get placeholder text for block type
  private getPlaceholder(type: string): string {
    switch (type) {
      case 'subtitle': return 'Enter subtitle...';
      case 'content': return 'Start writing your content...';
      case 'image': return 'Enter image URL...';
      default: return 'Enter text...';
    }
  }

  // Remove block
  removeBlock(blockId: string): void {
    const index = this.blogBlocks.findIndex(block => block.id === blockId);
    if (index > -1) {
      this.blogBlocks.splice(index, 1);
    }
  }

  // Move block up
  moveBlockUp(blockId: string): void {
    const index = this.blogBlocks.findIndex(block => block.id === blockId);
    if (index > 0) {
      const block = this.blogBlocks[index];
      this.blogBlocks.splice(index, 1);
      this.blogBlocks.splice(index - 1, 0, block);
    }
  }

  // Move block down
  moveBlockDown(blockId: string): void {
    const index = this.blogBlocks.findIndex(block => block.id === blockId);
    if (index < this.blogBlocks.length - 1) {
      const block = this.blogBlocks[index];
      this.blogBlocks.splice(index, 1);
      this.blogBlocks.splice(index + 1, 0, block);
    }
  }

  // Handle block content change
  onBlockChange(blockId: string, value: string): void {
    const block = this.blogBlocks.find(b => b.id === blockId);
    if (block) {
      block.data = value;
    }
  }

  // Auto-resize textarea
  autoResize(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }

  // Preview blog content
  previewBlog(): void {
    const blogData = {
      title: this.blogTitle,
      blocks: this.blogBlocks
    };
    console.log('Blog Preview:', blogData);
    
    // Here you could open a preview modal or navigate to preview page
    alert('Preview feature will be implemented. Check console for blog data.');
  }

  // Save blog as draft
  saveBlog(): void {
    if (!this.blogTitle.trim()) {
      alert('Please enter a blog title');
      return;
    }

    if (this.blogBlocks.length === 0) {
      alert('Please add some content blocks');
      return;
    }

    this.isSaving = true;

    // Convert blocks to JSON string for storage
    const contentJsonString = JSON.stringify(this.blogBlocks);

    // Create minimal blog data - only title and content
    const blogData = {
      _id: this.generateBlogId(),
      title: this.blogTitle,
      content: contentJsonString, // JSON stringified blocks
      published: false // Save as draft
    };

    console.log('Saving blog draft to localStorage:', blogData);
    console.log('Content (JSON string):', contentJsonString);

    try {
      // Save to localStorage
      this.saveBlogToLocalStorage(blogData);
      
      setTimeout(() => {
        this.isSaving = false;
        alert('Blog draft saved successfully!');
      }, 1000);
    } catch (error) {
      console.error('Error saving blog:', error);
      this.isSaving = false;
      alert('Error saving blog. Please try again.');
    }
  }

  // Open publish modal
  openPublishModal(): void {
    if (!this.blogTitle.trim()) {
      alert('Please enter a blog title');
      return;
    }

    if (this.blogBlocks.length === 0) {
      alert('Please add some content blocks');
      return;
    }

    this.showPublishModal = true;
  }

  // Handle image file selection
  onImageFileSelect(event: Event, blockId: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image size should be less than 5MB');
      return;
    }
    
    this.uploadImageToS3(file, blockId);
  }

  // Handle image loading error
  onImageError(event: Event, blockId: string): void {
    const target = event.target as HTMLImageElement;
    const block = this.blogBlocks.find(b => b.id === blockId);
    
    if (block && target) {
      // Hide the broken image
      target.style.display = 'none';
      
      // Show error message to user
      console.error('Failed to load image:', block.data);
      
      // Optionally clear the invalid URL
      if (confirm('The image failed to load. Would you like to clear the URL and try again?')) {
        block.data = '';
      }
    }
  }
  
  // Upload image to AWS S3
  private async uploadImageToS3(file: File, blockId: string): Promise<void> {
    const block = this.blogBlocks.find(b => b.id === blockId);
    if (!block) return;
    
    this.isUploadingImage = true;
    
    try {
      // Simulate S3 upload with a placeholder
      await new Promise(resolve => setTimeout(resolve, 2000));
      const timestamp = Date.now();
      const fileName = file.name.replace(/\s+/g, '_');
      const mockS3Url = `https://your-bucket.s3.amazonaws.com/blog-images/${timestamp}_${fileName}`;
      block.data = mockS3Url;
      console.log('Image uploaded to S3:', mockS3Url);
      alert('Image uploaded successfully!');
      
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      this.isUploadingImage = false;
    }
  }
  
  // Trigger file input for image upload
  selectImageFile(blockId: string): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => this.onImageFileSelect(event!, blockId);
    input.click();
  }

  // Generate unique blog ID
  private generateBlogId(): string {
    return 'blog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get current user ID (you might need to implement this based on your auth service)
  private getCurrentUserId(): string {
    // For now, return a placeholder. You should get this from your auth service
    return 'user_' + Date.now().toString();
  }

  // Save blog data to localStorage
  private saveBlogToLocalStorage(blogData: any): void {
    // Get existing blogs from localStorage
    const existingBlogs = this.getBlogsFromLocalStorage();
    
    // Add new blog to the list
    existingBlogs.push(blogData);
    
    // Save back to localStorage
    localStorage.setItem('user_blogs', JSON.stringify(existingBlogs));
    
    console.log('Blog saved to localStorage. Total blogs:', existingBlogs.length);
  }

  // Get blogs from localStorage
  private getBlogsFromLocalStorage(): any[] {
    try {
      const blogsJson = localStorage.getItem('user_blogs');
      return blogsJson ? JSON.parse(blogsJson) : [];
    } catch (error) {
      console.error('Error reading blogs from localStorage:', error);
      return [];
    }
  }

  // Discard changes and go back
  discardChanges(): void {
    if (this.blogTitle || this.blogBlocks.length > 0) {
      if (confirm('Are you sure you want to discard all changes?')) {
        this.router.navigate(['/home']);
      }
    } else {
      this.router.navigate(['/home']);
    }
  }

  // Handle click outside to close menu
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.add-menu-container')) {
      this.closeAddMenu();
    }
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
      alert('Please select a valid image file');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image size should be less than 5MB');
      return;
    }
    
    this.uploadMainImageToS3(file);
  }

  // Upload main image to AWS S3
  private async uploadMainImageToS3(file: File): Promise<void> {
    this.isUploadingMainImage = true;
    
    try {
      // Simulate S3 upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      const timestamp = Date.now();
      const fileName = file.name.replace(/\s+/g, '_');
      const mockS3Url = `https://your-bucket.s3.amazonaws.com/blog-main-images/${timestamp}_${fileName}`;
      this.mainImageUrl = mockS3Url;
      console.log('Main image uploaded to S3:', mockS3Url);
      
    } catch (error) {
      console.error('Error uploading main image:', error);
      alert('Failed to upload main image. Please try again.');
    } finally {
      this.isUploadingMainImage = false;
    }
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
  }

  // Add custom tag
  addCustomTag(): void {
    const tagName = this.newTagInput.trim();
    
    if (!tagName) {
      alert('Please enter a tag name');
      return;
    }
    
    if (this.selectedTags.includes(tagName)) {
      alert('Tag already added');
      return;
    }
    
    if (this.selectedTags.length >= 10) {
      alert('Maximum 10 tags allowed');
      return;
    }
    
    this.selectedTags.push(tagName);
    this.newTagInput = '';
  }

  // Remove tag from selected
  removeTag(tagName: string): void {
    const index = this.selectedTags.indexOf(tagName);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    }
  }

  // Add tag from recommended list
  addRecommendedTag(tagName: string): void {
    if (!this.selectedTags.includes(tagName)) {
      if (this.selectedTags.length >= 10) {
        alert('Maximum 10 tags allowed');
        return;
      }
      this.selectedTags.push(tagName);
    }
  }

  // Close publish modal
  closePublishModal(): void {
    this.showPublishModal = false;
    this.mainImageUrl = '';
    this.selectedTags = [];
    this.newTagInput = '';
  }

  // Publish blog
  publishBlog(): void {
    this.isPublishing = true;

    // Convert blocks to content string
    const contentJsonString = JSON.stringify(this.blogBlocks);

    // Create blog data for saving
    const blogData = {
      _id: this.generateBlogId(),
      user_id: this.getCurrentUserId(),
      title: this.blogTitle,
      content: contentJsonString,
      tags: this.selectedTags,
      main_image_url: this.mainImageUrl,
      published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Publishing blog:', blogData);

    // Simulate API call
    setTimeout(() => {
      try {
        // Save to localStorage
        this.saveBlogToLocalStorage(blogData);
        
        this.isPublishing = false;
        this.closePublishModal();
        alert('Blog published successfully!');
        
        // Navigate to home or blog list
        this.router.navigate(['/home']);
      } catch (error) {
        console.error('Error publishing blog:', error);
        this.isPublishing = false;
        alert('Error publishing blog. Please try again.');
      }
    }, 2000);
  }

  // Track by function for ngFor optimization
  trackByBlockId(index: number, block: BlogBlock): string {
    return block.id;
  }
}

