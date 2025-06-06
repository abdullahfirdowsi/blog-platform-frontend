import { Component, OnInit, OnDestroy, Inject } from '@angular/core';import { CommonModule } from '@angular/common';import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';import { ActivatedRoute, Router } from '@angular/router';import { HeaderComponent } from '../../../../shared/components/header/header.component';import { FooterComponent } from '../../../../shared/components/footer/footer.component';import { PostsService } from '../../../../core/services/posts.service';import { AuthService } from '../../../../core/services/auth.service';import { DOCUMENT } from '@angular/common';import { Editor, NgxEditorModule, Toolbar } from 'ngx-editor';import { marked } from 'marked';import { DomSanitizer, SafeHtml } from '@angular/platform-browser';import { Subscription, interval } from 'rxjs';import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-post-edit',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, CommonModule, FormsModule, ReactiveFormsModule, NgxEditorModule],
  templateUrl: './post-edit.component.html',
  styleUrl: './post-edit.component.css'
})
export class PostEditComponent implements OnInit, OnDestroy {
  blogForm: FormGroup;
  isEditMode = false;
  blogId: string | null = null;
  loading = false;
  saving = false;
  error = '';
  tags: any[] = [];
  selectedTags: string[] = [];
  newTagName = '';
  showTagInput = false;
  isAuthenticated = false;
  currentUser: any = null;
  
  // Rich text editor properties
  editor!: Editor;
  toolbar: Toolbar = [
    ['bold', 'italic'],
    ['underline', 'strike'],
    ['code', 'blockquote'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['link', 'image'],
    ['text_color', 'background_color'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
  ];
  
  // Block-based editor properties
  contentBlocks: any[] = [];
  showBlockMenu = false;
  
  // Auto-save properties
  autoSaveStatus = '';
  private autoSaveSubscription?: Subscription;
  
  // Block types
  blockTypes = [
    { type: 'subtitle', label: 'Subtitle', icon: '📝' },
    { type: 'content', label: 'Content', icon: '📄' },
    { type: 'imageUrl', label: 'Image', icon: '🖼️' }
  ];

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private postsService: PostsService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {
    this.blogForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
      content: [''], // This will store the JSON string of blocks
      main_image_url: [''],
      published: [false]
    });
  }

  ngOnInit(): void {
    this.document.body.classList.add('has-header');
    this.checkAuthStatus();
    this.loadTags();
    
    // Initialize the rich text editor
    this.editor = new Editor();
    
    // Check if we're in edit mode
    this.blogId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.blogId;
    
    if (this.isEditMode && this.blogId) {
      this.loadBlog(this.blogId);
    }
    
    // Initialize content blocks
    this.initializeContentBlocks();
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('has-header');
    // Destroy the editor instance
    this.editor.destroy();
    // Clean up auto-save subscription
    if (this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
    }
  }

  checkAuthStatus(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (!this.isAuthenticated) {
      this.router.navigate(['/auth/login']);
      return;
    }
    
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      console.error('No current user found');
      this.router.navigate(['/auth/login']);
    }
  }

  loadTags(): void {
    this.postsService.getTags().subscribe({
      next: (tags) => {
        console.log('DEBUG: Loaded tags:', tags);
        this.tags = tags;
      },
      error: (err) => console.error('Error loading tags:', err)
    });
  }

  loadBlog(id: string): void {
    this.loading = true;
    this.error = '';
    
    this.postsService.getPost(id).subscribe({
      next: (blog) => {
        this.blogForm.patchValue({
          title: blog.title,
          content: blog.blog_body,
          main_image_url: blog.main_image_url || '',
          published: blog.published
        });
        console.log('DEBUG: Blog tag_ids from backend:', blog.tag_ids);
        this.selectedTags = (blog.tag_ids || []).filter((tag: any) => tag !== null && tag !== undefined && tag !== '');
        console.log('DEBUG: Selected tags after filtering:', this.selectedTags);
        console.log('DEBUG: Available tags for comparison:', this.tags.map(t => t.id));
        this.loadContentBlocks(blog.blog_body);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load blog post';
        this.loading = false;
        console.error('Error loading blog:', err);
      }
    });
  }

  toggleTag(tagId: string): void {
    const index = this.selectedTags.indexOf(tagId);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tagId);
    }
  }

  isTagSelected(tagId: string): boolean {
    return this.selectedTags.includes(tagId);
  }

  getTagName(tagId: string): string {
    const tag = this.tags.find(t => t.id === tagId);
    if (!tag) {
      console.log('DEBUG: Could not find tag for ID:', tagId, 'Available tags:', this.tags.map(t => t.id));
    }
    return tag ? tag.name : '';
  }

  createTag(): void {
    if (!this.newTagName.trim()) return;
    
    this.postsService.createTag(this.newTagName.trim()).subscribe({
      next: (tag) => {
        this.tags.push(tag);
        this.selectedTags.push(tag.id);
        this.newTagName = '';
        this.showTagInput = false;
      },
      error: (err) => {
        console.error('Error creating tag:', err);
        alert('Failed to create tag');
      }
    });
  }

  onSubmit(): void {
    if (this.blogForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    this.error = '';

    const formData = {
      title: this.blogForm.value.title,
      content: this.serializeContentBlocks(),
      main_image_url: this.blogForm.value.main_image_url,
      published: this.blogForm.value.published,
      tag_ids: this.selectedTags.filter((tag: any) => tag !== null && tag !== undefined && tag !== '')
    };

    // Debug: Test what we're sending
    console.log('DEBUG: Form data being sent:', JSON.stringify(formData, null, 2));
    
    const request = this.isEditMode 
      ? this.postsService.updatePost(this.blogId!, formData)
      : this.postsService.createPost(formData);

    request.subscribe({
      next: (response) => {
        this.saving = false;
        // Handle both id and _id fields from the response
        const blogId = this.isEditMode ? this.blogId : (response.id || response._id);
        console.log('DEBUG: Response received:', response);
        console.log('DEBUG: Extracted blogId:', blogId);
        if (blogId) {
          this.router.navigate(['/posts', blogId]);
        } else {
          console.error('No blog ID found in response:', response);
          this.error = 'Unable to navigate to the post after saving';
        }
      },
      error: (err) => {
        this.error = this.isEditMode ? 'Failed to update blog post' : 'Failed to create blog post';
        this.saving = false;
        console.error('Error saving blog:', err);
      }
    });
  }

  saveDraft(): void {
    if (this.blogForm.get('title')?.invalid || this.contentBlocks.length === 0) {
      return;
    }

    this.blogForm.patchValue({ published: false });
    this.onSubmit();
  }

  publish(): void {
    this.blogForm.patchValue({ published: true });
    this.onSubmit();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.blogForm.controls).forEach(key => {
      const control = this.blogForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.blogForm.get(fieldName);
    if (field?.errors && field?.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} is too short`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
    }
    return '';
  }

  goBack(): void {
    if (this.isEditMode) {
      this.router.navigate(['/posts', this.blogId]);
    } else {
      this.router.navigate(['/posts']);
    }
  }
  
  // Block editor helper methods for form integration
  onContentChange(content: string): void {
    this.blogForm.patchValue({ content });
  }
  
  // Method to handle editor content changes (renamed from onEditorContentChange)
  onEditorContentChange(content: string): void {
    this.onContentChange(content);
  }
  
  
  // Method to get word count
  getWordCount(): number {
    let totalWords = 0;
    this.contentBlocks.forEach(block => {
      if (block.type === 'content' || block.type === 'subtitle') {
        const words = block.data.trim().split(/\s+/).filter((word: string) => word.length > 0);
        totalWords += words.length;
      }
    });
    return totalWords;
  }
  
  // Block editor methods
  initializeContentBlocks(): void {
    const existingContent = this.blogForm.get('content')?.value;
    if (existingContent) {
      this.loadContentBlocks(existingContent);
    } else {
      // Start with one content block
      this.contentBlocks = [{ type: 'content', data: '' }];
    }
  }
  
  loadContentBlocks(content: string): void {
    try {
      if (content && content.trim().startsWith('[')) {
        // Content is already in block format
        this.contentBlocks = JSON.parse(content);
      } else {
        // Legacy content - convert to single content block
        this.contentBlocks = [{ type: 'content', data: content || '' }];
      }
    } catch (error) {
      console.error('Error parsing content blocks:', error);
      this.contentBlocks = [{ type: 'content', data: content || '' }];
    }
  }
  
  serializeContentBlocks(): string {
    return JSON.stringify(this.contentBlocks);
  }
  
  addBlock(type: string): void {
    const newBlock = {
      type: type,
      data: type === 'imageUrl' ? '' : ''
    };
    this.contentBlocks.push(newBlock);
    this.showBlockMenu = false;
    this.updateFormContent();
  }
  
  removeBlock(index: number): void {
    if (this.contentBlocks.length > 1) {
      this.contentBlocks.splice(index, 1);
      this.updateFormContent();
    }
  }
  
  moveBlockUp(index: number): void {
    if (index > 0) {
      const temp = this.contentBlocks[index];
      this.contentBlocks[index] = this.contentBlocks[index - 1];
      this.contentBlocks[index - 1] = temp;
      this.updateFormContent();
    }
  }
  
  moveBlockDown(index: number): void {
    if (index < this.contentBlocks.length - 1) {
      const temp = this.contentBlocks[index];
      this.contentBlocks[index] = this.contentBlocks[index + 1];
      this.contentBlocks[index + 1] = temp;
      this.updateFormContent();
    }
  }
  
  updateBlockData(index: number, data: string): void {
    this.contentBlocks[index].data = data;
    this.updateFormContent();
  }
  
  updateFormContent(): void {
    const serializedContent = this.serializeContentBlocks();
    this.blogForm.patchValue({ content: serializedContent });
  }
  
  toggleBlockMenu(): void {
    this.showBlockMenu = !this.showBlockMenu;
  }
  
  getBlockTypeIcon(type: string): string {
    const blockType = this.blockTypes.find(bt => bt.type === type);
    return blockType ? blockType.icon : '📄';
  }
  
  getBlockTypeLabel(type: string): string {
    const blockType = this.blockTypes.find(bt => bt.type === type);
    return blockType ? blockType.label : 'Content';
  }
}
