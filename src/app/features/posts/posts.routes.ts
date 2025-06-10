import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

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

