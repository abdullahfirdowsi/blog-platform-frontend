import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { PostsService } from '../../../../core/services/posts.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-post-edit',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, CommonModule, FormsModule, ReactiveFormsModule],
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

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private postsService: PostsService,
    private authService: AuthService
  ) {
    this.blogForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
      content: ['', [Validators.required, Validators.minLength(1)]],
      main_image_url: [''],
      published: [false]
    });
  }

  ngOnInit(): void {
    this.document.body.classList.add('has-header');
    this.checkAuthStatus();
    this.loadTags();
    
    // Check if we're in edit mode
    this.blogId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.blogId;
    
    if (this.isEditMode && this.blogId) {
      this.loadBlog(this.blogId);
    }
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('has-header');
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
      next: (tags) => this.tags = tags,
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
          content: blog.content,
          main_image_url: blog.main_image_url || '',
          published: blog.published
        });
        this.selectedTags = blog.tag_ids || [];
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
      ...this.blogForm.value,
      tag_ids: this.selectedTags
    };

    const request = this.isEditMode 
      ? this.postsService.updatePost(this.blogId!, formData)
      : this.postsService.createPost(formData);

    request.subscribe({
      next: (response) => {
        this.saving = false;
        const blogId = this.isEditMode ? this.blogId : response.id;
        this.router.navigate(['/posts', blogId]);
      },
      error: (err) => {
        this.error = this.isEditMode ? 'Failed to update blog post' : 'Failed to create blog post';
        this.saving = false;
        console.error('Error saving blog:', err);
      }
    });
  }

  saveDraft(): void {
    if (this.blogForm.get('title')?.invalid || this.blogForm.get('content')?.invalid) {
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
}
