import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const postsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/my-blogs/my-blogs.component').then(c => c.MyBlogsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'write',
    loadComponent: () => import('./pages/blog-writer/blog-writer.component').then(c => c.BlogWriterComponent),
    canActivate: [authGuard]
  },
  {
    path: 'detail/:id',
    loadComponent: () => import('./pages/blog-detail/blog-detail.component').then(c => c.BlogDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./pages/edit-blog/edit-blog.component').then(c => c.EditBlogComponent),
    canActivate: [authGuard]
  }
];

