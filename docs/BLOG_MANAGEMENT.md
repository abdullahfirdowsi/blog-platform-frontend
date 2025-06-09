# Blog Management System Documentation

## Overview

This documentation describes the complete blog management system implemented for the frontend application. The system includes state management, user blog listing, editing, and deletion functionality with proper change detection.

## Features Implemented

### 1. State Management Service (`BlogStateService`)

**Location:** `src/app/core/services/blog-state.service.ts`

**Purpose:** Centralized state management for blog operations with fallback to localStorage when API is unavailable.

**Key Features:**
- Reactive state management using BehaviorSubject
- Automatic fallback to localStorage when API fails
- Change detection for unsaved modifications
- CRUD operations with optimistic updates

**State Structure:**
```typescript
interface BlogState {
  blogs: Blog[];
  loading: boolean;
  error: string | null;
  selectedBlog: Blog | null;
  hasChanges: boolean;
  originalContent: string | null;
}
```

**Public Methods:**
- `loadMyBlogs()` - Load user's blogs from API/localStorage
- `getBlogById(id)` - Get single blog for editing
- `updateBlog(id, data)` - Update blog with optimistic updates
- `deleteBlog(id)` - Delete blog from storage
- `updateSelectedBlogContent(content)` - Track content changes
- `resetChanges()` - Reset change tracking
- `clearSelectedBlog()` - Clear selected blog state

### 2. My Blogs Component (`MyBlogsComponent`)

**Location:** `src/app/features/posts/pages/my-blogs/`

**Purpose:** Display user's blogs with edit and delete functionality.

**Features:**
- **Grid Layout:** Responsive card-based blog display
- **Status Badges:** Visual indicators for published/draft status
- **Statistics:** Show counts of published and draft blogs
- **Content Preview:** Extract and display blog content preview from JSON blocks
- **Actions:** Edit and delete buttons for each blog
- **Delete Confirmation:** Modal to confirm blog deletion
- **Empty State:** Helpful message when no blogs exist
- **Error Handling:** Display error states with retry options

**Key Methods:**
- `onEditBlog(blog)` - Navigate to edit page
- `onDeleteBlog(blog)` - Show delete confirmation modal
- `confirmDelete()` - Execute blog deletion
- `getContentPreview(content)` - Extract preview from JSON blocks
- `getPublishedCount()` / `getDraftCount()` - Calculate statistics

### 3. Edit Blog Component (`EditBlogComponent`)

**Location:** `src/app/features/posts/pages/edit-blog/`

**Purpose:** Full-featured blog editor with change detection and unsaved changes warning.

**Features:**
- **Block-Based Editor:** Support for subtitle, content, and image blocks
- **Change Detection:** Real-time tracking of modifications
- **Unsaved Changes Warning:** Browser and modal warnings for unsaved changes
- **Block Operations:** Add, remove, reorder blocks
- **Auto-Save Indicators:** Visual feedback for unsaved changes
- **Created Date Preservation:** Maintains original creation date on updates

**Change Detection System:**
```typescript
private checkForChanges(): void {
  const currentContent = JSON.stringify(this.blogBlocks);
  const titleChanged = this.blogTitle !== this.blog?.title;
  const contentChanged = currentContent !== this.originalContent;
  
  this.hasChanges = titleChanged || contentChanged;
  
  if (contentChanged) {
    this.blogStateService.updateSelectedBlogContent(currentContent);
  }
}
```

**Browser Warning for Unsaved Changes:**
```typescript
@HostListener('window:beforeunload', ['$event'])
unloadNotification($event: any): void {
  if (this.hasChanges) {
    $event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
}
```

### 4. Routing Configuration

**Posts Routes:** `src/app/features/posts/posts.routes.ts`
```typescript
export const postsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/my-blogs/my-blogs.component').then(c => c.MyBlogsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./pages/edit-blog/edit-blog.component').then(c => c.EditBlogComponent),
    canActivate: [authGuard]
  }
];
```

**App Routes Integration:** `src/app/app.routes.ts`
```typescript
{
  path: 'posts',
  loadChildren: () => import('./features/posts/posts.routes').then(m => m.postsRoutes)
}
```

### 5. Data Structure

**Blog Database Schema:**
```javascript
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."),
  "title": "My AI Journey",
  "content": "[{\"id\":\"block_1\",\"type\":\"content\",\"data\":\"I used ChatGPT to...\"}]", // JSON string
  "tag_ids": ["ai", "ml", "react"],
  "main_image_url": "...",
  "published": false,
  "created_at": "2025-06-04T11:00:00Z",
  "updated_at": "2025-06-04T11:05:00Z"
}
```

**Block Structure (within content JSON):**
```typescript
interface BlogBlock {
  id: string;
  type: 'subtitle' | 'content' | 'image';
  data: string;
  placeholder?: string;
}
```

### 6. Navigation Integration

**Home Component Update:**
Updated the "My Blogs" button in the home component to navigate to `/posts` instead of `/dashboard`:

```html
<button class="action-btn" routerLink="/posts">
  <svg>...</svg>
  My Blogs
</button>
```

## Key Implementation Details

### Change Detection Algorithm

1. **Content Tracking:** Convert blog blocks to JSON string for comparison
2. **Title Tracking:** Direct string comparison with original title
3. **Real-time Updates:** Track changes on every input event
4. **State Synchronization:** Update state service with current content
5. **Browser Warning:** Prevent accidental navigation with unsaved changes

### Content Preview Generation

```typescript
getContentPreview(content: string): string {
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
    // Fallback to plain text
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
  }
  
  return 'No content';
}
```

### LocalStorage Fallback Strategy

1. **Primary:** Try API call first
2. **Fallback:** Use localStorage when API fails
3. **Optimistic Updates:** Update localStorage immediately
4. **Sync:** Attempt API sync in background
5. **Consistency:** Maintain data consistency across browser sessions

## User Experience Features

### 1. Visual Feedback
- **Loading States:** Spinners during data operations
- **Change Indicators:** Visual cues for unsaved changes
- **Status Badges:** Clear published/draft indicators
- **Error States:** User-friendly error messages with retry options

### 2. Responsive Design
- **Mobile-First:** Optimized for all screen sizes
- **Touch-Friendly:** Large buttons and touch targets
- **Adaptive Layout:** Grid adjusts to screen size

### 3. Accessibility
- **Keyboard Navigation:** Full keyboard support
- **Screen Reader Support:** Proper ARIA labels
- **High Contrast:** Accessible color schemes
- **Focus Management:** Clear focus indicators

## Usage Instructions

### 1. Accessing My Blogs
1. Navigate to home page
2. Click "My Blogs" button in header
3. View all your blogs in grid layout

### 2. Editing a Blog
1. Click "Edit" button on any blog card
2. Modify title or content blocks
3. Save changes or discard with warning
4. Navigate back to blogs list

### 3. Deleting a Blog
1. Click "Delete" button on blog card
2. Confirm deletion in modal
3. Blog removed from list immediately

### 4. Change Detection
- Edit any content to see "Unsaved changes" indicator
- Try to navigate away to see browser warning
- Save changes to clear indicators

## Future Enhancements

1. **Bulk Operations:** Select multiple blogs for bulk delete/publish
2. **Advanced Filtering:** Filter by status, date, tags
3. **Search:** Search within user's blogs
4. **Sorting:** Sort by date, title, status
5. **Draft Auto-Save:** Automatic saving of drafts
6. **Version History:** Track blog edit history
7. **Collaboration:** Share drafts with other users
8. **Analytics:** View blog performance metrics

## Technical Notes

- **State Management:** Uses RxJS BehaviorSubject for reactive state
- **Change Detection:** OnPush strategy for performance
- **Memory Management:** Proper subscription cleanup with takeUntil
- **Error Handling:** Comprehensive error handling with user feedback
- **Performance:** Lazy loading for large blog lists
- **SEO:** Proper meta tags and structured data

This implementation provides a robust, user-friendly blog management system with proper state management, change detection, and responsive design.

