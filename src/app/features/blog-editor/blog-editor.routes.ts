import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const blogEditorRoutes: Routes = [
  {
    path: '',
    redirectTo: 'write',
    pathMatch: 'full'
  },
  {
    path: 'write',
    loadComponent: () => import('./pages/blog-writer/blog-writer.component').then(c => c.BlogWriterComponent),
    canActivate: [authGuard]
  }
];

