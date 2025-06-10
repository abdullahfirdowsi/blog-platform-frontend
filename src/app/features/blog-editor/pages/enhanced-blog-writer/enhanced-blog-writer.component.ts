import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { BlogService } from '../../../../core/services/blog.service';
import { ImageUploadService } from '../../../../core/services/image-upload.service';
import { FooterComponent } from "../../../../shared/components/footer/footer.component";
import { Tag } from '../../../../shared/interfaces/post.interface';


export interface BlogBlock {
  id: string;
  type: 'subtitle' | 'content' | 'image' | 'quote' | 'divider';
  data: string;
  placeholder?: string;
  metadata?: any;
}

export interface BlockType {
  type: string;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-enhanced-blog-writer',
  standalone: true,
  imports: [CommonModule, FormsModule, FooterComponent],
  templateUrl: './enhanced-blog-writer.component.html',
  styleUrl: './enhanced-blog-writer.component.css'
})
export class EnhancedBlogWriterComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('mainImageFileInput') mainImageFileInput!: ElementRef<HTMLInputElement>;
  
  private destroy$ = new Subject<void>();
  
  // Blog data
  blogTitle = '';
  blogSubtitle = '';
  blogBlocks: BlogBlock[] = [];
  
  // UI state
  showAddMenu = false;
  currentBlockId: string | null = null;
  isAuthenticated = false;
  isSaving = false;
  isUploadingImage = false;
  hasChanges = false;
  wordCount = 0;
  estimatedReadTime = 0;
  
  // Publish modal state
  showPublishModal = false;
  isPublishing = false;
  isUploadingMainImage = false;
  mainImageUrl = '';
  selectedTags: string[] = [];
  newTagInput = '';
  availableTags: Tag[] = [];
  isLoadingTags = false;
  
  // Message container
  showMessage = false;
  messageType: 'success' | 'error' | 'info' = 'info';
  messageText = '';
  
  // Auto-save
  private autoSaveInterval: any;
  private lastSaveTime: Date | null = null;
  
  // Block types with enhanced options
  blockTypes: BlockType[] = [
    {
      type: 'subtitle',
      label: 'Heading',
      icon: '📝',
      description: 'Add a section heading'
    },
    {
      type: 'content',
      label: 'Paragraph',
      icon: '📄',
      description: 'Write your content'
    },
    {
      type: 'image',
      label: 'Image',
      icon: '🖼️',
      description: 'Add an image'
    },
    {
      type: 'quote',
      label: 'Quote',
      icon: '💬',
      description: 'Add a quote or highlight'
    },
    {
      type: 'divider',
      label: 'Divider',
      icon: '➖',
      description: 'Add a section break'
    }
  ];
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private blogService: BlogService,
    private imageUploadService: ImageUploadService
  ) {}
  
  ngOnInit(): void {
    this.checkAuthStatus();
    this.loadAvailableTags();
    this.setupAutoSave();
    this.loadDraft();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }
  
  checkAuthStatus(): void {
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        this.isAuthenticated = isAuth;
        if (!isAuth) {
          this.router.navigate(['/auth/login']);
        }
      });
  }
  
  loadAvailableTags(): void {
    this.isLoadingTags = true;
    this.blogService.getTags()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tags) => {
          this.availableTags = tags;
          this.isLoadingTags = false;
        },
        error: (error) => {
          console.error('Error loading tags:', error);
          this.isLoadingTags = false;
          // Fallback to default tags
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
  
  setupAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      if (this.hasChanges && this.blogTitle.trim()) {
        this.autoSaveDraft();
      }
    }, 30000); // Auto-save every 30 seconds
  }
  
  loadDraft(): void {
    const draft = localStorage.getItem('blog_draft');
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        this.blogTitle = parsedDraft.title || '';
        this.blogSubtitle = parsedDraft.subtitle || '';
        this.blogBlocks = parsedDraft.blocks || [];
        this.selectedTags = parsedDraft.tags || [];
        this.mainImageUrl = parsedDraft.mainImage || '';
        this.updateWordCount();
        this.showMessage = true;
        this.messageType = 'info';
        this.messageText = 'Draft restored from local storage';
        setTimeout(() => this.hideMessage(), 3000);
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }
  
  saveDraft(): void {
    const draft = {
      title: this.blogTitle,
      subtitle: this.blogSubtitle,
      blocks: this.blogBlocks,
      tags: this.selectedTags,
      mainImage: this.mainImageUrl,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem('blog_draft', JSON.stringify(draft));
    this.lastSaveTime = new Date();
    this.hasChanges = false;
  }
  
  autoSaveDraft(): void {
    this.saveDraft();
    this.showMessage = true;
    this.messageType = 'info';
    this.messageText = 'Draft auto-saved';
    setTimeout(() => this.hideMessage(), 2000);
  }
  
  onTitleChange(): void {
    this.hasChanges = true;
    this.updateWordCount();
  }
  
  onSubtitleChange(): void {
    this.hasChanges = true;
  }
  
  updateWordCount(): void {
    let totalWords = 0;
    
    // Count title words
    if (this.blogTitle) {
      totalWords += this.blogTitle.trim().split(/\s+/).length;
    }
    
    // Count subtitle words
    if (this.blogSubtitle) {
      totalWords += this.blogSubtitle.trim().split(/\s+/).length;
    }
    
    // Count content words
    this.blogBlocks.forEach(block => {
      if (block.type === 'content' || block.type === 'subtitle' || block.type === 'quote') {
        if (block.data && block.data.trim()) {
          totalWords += block.data.trim().split(/\s+/).length;
        }
      }
    });
    
    this.wordCount = totalWords;
    this.estimatedReadTime = Math.ceil(totalWords / 200); // Average reading speed
  }
  
  // Block management methods
  generateBlockId(): string {
    return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  toggleAddMenu(blockId: string | null = null): void {
    if (this.currentBlockId === blockId && this.showAddMenu) {
      this.showAddMenu = false;
      this.currentBlockId = null;
    } else {
      this.showAddMenu = true;
      this.currentBlockId = blockId;
    }
  }
  
  addBlock(type: string): void {
    const newBlock: BlogBlock = {
      id: this.generateBlockId(),
      type: type as any,
      data: '',
      placeholder: this.getPlaceholderText(type)
    };
    
    if (type === 'divider') {
      newBlock.data = '---';
    }
    
    if (this.currentBlockId === null) {
      // Add to end
      this.blogBlocks.push(newBlock);
    } else {
      // Add after current block
      const index = this.blogBlocks.findIndex(b => b.id === this.currentBlockId);
      this.blogBlocks.splice(index + 1, 0, newBlock);
    }
    
    this.hasChanges = true;
    this.showAddMenu = false;
    this.currentBlockId = null;
    
    // Focus the new block
    setTimeout(() => {
      const element = document.getElementById('block-' + newBlock.id);
      if (element) {
        element.focus();
      }
    }, 100);
  }
  
  getPlaceholderText(type: string): string {
    switch (type) {
      case 'subtitle': return 'Enter section heading...';
      case 'content': return 'Write your content here...';
      case 'image': return 'Paste image URL or upload file';
      case 'quote': return 'Enter quote or highlighted text...';
      default: return 'Enter content...';
    }
  }
  
  onBlockChange(blockId: string, value: string): void {
    const block = this.blogBlocks.find(b => b.id === blockId);
    if (block) {
      block.data = value;
      this.hasChanges = true;
      this.updateWordCount();
    }
  }
  
  removeBlock(blockId: string): void {
    this.blogBlocks = this.blogBlocks.filter(b => b.id !== blockId);
    this.hasChanges = true;
    this.updateWordCount();
  }
  
  moveBlockUp(blockId: string): void {
    const index = this.blogBlocks.findIndex(b => b.id === blockId);
    if (index > 0) {
      [this.blogBlocks[index], this.blogBlocks[index - 1]] = 
      [this.blogBlocks[index - 1], this.blogBlocks[index]];
      this.hasChanges = true;
    }
  }
  
  moveBlockDown(blockId: string): void {
    const index = this.blogBlocks.findIndex(b => b.id === blockId);
    if (index < this.blogBlocks.length - 1) {
      [this.blogBlocks[index], this.blogBlocks[index + 1]] = 
      [this.blogBlocks[index + 1], this.blogBlocks[index]];
      this.hasChanges = true;
    }
  }
  
  // Image handling
  selectImageFile(blockId: string): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.uploadImage(file, blockId);
      }
    };
    fileInput.click();
  }
  
  uploadImage(file: File, blockId: string): void {
    this.isUploadingImage = true;
    
    this.imageUploadService.uploadImage(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Handle different response formats
          const imageUrl = response.imageUrl || response.url;
          this.onBlockChange(blockId, imageUrl);
          this.isUploadingImage = false;
          this.showMessage = true;
          this.messageType = 'success';
          this.messageText = 'Image uploaded successfully!';
          setTimeout(() => this.hideMessage(), 3000);
        },
        error: (error) => {
          console.error('Image upload failed:', error);
          this.isUploadingImage = false;
          this.showMessage = true;
          this.messageType = 'error';
          this.messageText = 'Failed to upload image. Please try again.';
          setTimeout(() => this.hideMessage(), 5000);
        }
      });
  }
  
  onImageError(event: any, blockId: string): void {
    event.target.src = 'assets/images/placeholder-image.jpg';
    console.error('Image load error for block:', blockId);
  }
  
  onImageLoad(event: any, blockId: string): void {
    // Image loaded successfully
    console.log('Image loaded for block:', blockId);
  }
  
  // Main image handling
  selectMainImageFile(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.uploadMainImage(file);
      }
    };
    fileInput.click();
  }
  
  uploadMainImage(file: File): void {
    this.isUploadingMainImage = true;
    
    this.imageUploadService.uploadImage(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Handle different response formats
          this.mainImageUrl = response.imageUrl || response.url;
          this.isUploadingMainImage = false;
          this.hasChanges = true;
        },
        error: (error) => {
          console.error('Main image upload failed:', error);
          this.isUploadingMainImage = false;
          this.showMessage = true;
          this.messageType = 'error';
          this.messageText = 'Failed to upload main image';
          setTimeout(() => this.hideMessage(), 5000);
        }
      });
  }
  
  removeMainImage(): void {
    this.mainImageUrl = '';
    this.hasChanges = true;
  }
  
  onMainImageError(event: any): void {
    event.target.src = 'assets/images/placeholder-image.jpg';
  }
  
  // Tag management
  addCustomTag(): void {
    const tagName = this.newTagInput.trim().toLowerCase();
    if (tagName && !this.selectedTags.includes(tagName) && this.selectedTags.length < 10) {
      this.selectedTags.push(tagName);
      this.newTagInput = '';
      this.hasChanges = true;
    }
  }
  
  addRecommendedTag(tagName: string): void {
    if (!this.selectedTags.includes(tagName) && this.selectedTags.length < 10) {
      this.selectedTags.push(tagName);
      this.hasChanges = true;
    }
  }
  
  removeTag(tagName: string): void {
    this.selectedTags = this.selectedTags.filter(tag => tag !== tagName);
    this.hasChanges = true;
  }
  
  // Modal management
  openPublishModal(): void {
    this.showPublishModal = true;
  }
  
  closePublishModal(): void {
    this.showPublishModal = false;
  }
  
  // Publishing
  publishBlog(): void {
    if (!this.blogTitle.trim() || this.blogBlocks.length === 0) {
      this.showMessage = true;
      this.messageType = 'error';
      this.messageText = 'Please add a title and content before publishing';
      setTimeout(() => this.hideMessage(), 5000);
      return;
    }
    
    this.isPublishing = true;
    
    const blogData = {
      title: this.blogTitle.trim(),
      content: JSON.stringify(this.blogBlocks), // Convert blocks to JSON string
      tag_ids: this.selectedTags, // Use tag_ids instead of tags
      main_image_url: this.mainImageUrl, // Use main_image_url instead of mainImage
      published: true
    };
    
    console.log('Sending blog data to backend:', blogData);
    
    this.blogService.createBlog(blogData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isPublishing = false;
          this.showPublishModal = false;
          localStorage.removeItem('blog_draft');
          this.showMessage = true;
          this.messageType = 'success';
          this.messageText = 'Blog published successfully!';
          setTimeout(() => {
            this.router.navigate(['/posts']);
          }, 2000);
        },
        error: (error) => {
          console.error('Publishing failed:', error);
          this.isPublishing = false;
          this.showMessage = true;
          this.messageType = 'error';
          this.messageText = 'Failed to publish blog. Please try again.';
          setTimeout(() => this.hideMessage(), 5000);
        }
      });
  }
  
  // Save as draft
  saveAsDraft(): void {
    if (!this.blogTitle.trim()) {
      this.showMessage = true;
      this.messageType = 'error';
      this.messageText = 'Please add a title before saving';
      setTimeout(() => this.hideMessage(), 3000);
      return;
    }
    
    this.isSaving = true;
    
    const blogData = {
      title: this.blogTitle.trim(),
      content: JSON.stringify(this.blogBlocks), // Convert blocks to JSON string
      tag_ids: this.selectedTags, // Use tag_ids instead of tags
      main_image_url: this.mainImageUrl, // Use main_image_url instead of mainImage
      published: false
    };
    
    console.log('Sending blog draft data to backend:', blogData);
    
    this.blogService.createBlog(blogData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSaving = false;
          this.hasChanges = false;
          localStorage.removeItem('blog_draft');
          this.showMessage = true;
          this.messageType = 'success';
          this.messageText = 'Draft saved successfully!';
          setTimeout(() => this.hideMessage(), 3000);
        },
        error: (error) => {
          console.error('Save failed:', error);
          this.isSaving = false;
          this.showMessage = true;
          this.messageType = 'error';
          this.messageText = 'Failed to save draft. Please try again.';
          setTimeout(() => this.hideMessage(), 5000);
        }
      });
  }
  
  // Navigation
  navigateBack(): void {
    if (this.hasChanges) {
      const confirmLeave = confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmLeave) {
        return;
      }
    }
    this.router.navigate(['/posts']);
  }
  
  // Preview
  previewBlog(): void {
    this.saveDraft();
    // Implement preview functionality
    console.log('Preview functionality to be implemented');
  }
  
  // Message handling
  hideMessage(): void {
    this.showMessage = false;
  }
  
  // Auto resize textarea
  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
  
  // Document click handler
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.add-menu-container')) {
      this.showAddMenu = false;
      this.currentBlockId = null;
    }
  }
  
  // Track by function for ngFor
  trackByBlockId(index: number, block: BlogBlock): string {
    return block.id;
  }
  
  // Keyboard shortcuts
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          event.preventDefault();
          this.saveDraft();
          break;
        case 'Enter':
          if (event.shiftKey) {
            event.preventDefault();
            this.publishBlog();
          }
          break;
      }
    }
  }
}

