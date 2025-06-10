import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const blogEditorRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/enhanced-blog-writer/enhanced-blog-writer.component').then(c => c.EnhancedBlogWriterComponent),
    canActivate: [authGuard]
  }
];

