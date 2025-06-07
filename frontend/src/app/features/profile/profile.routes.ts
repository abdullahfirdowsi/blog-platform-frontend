import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const profileRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/profile.component').then(c => c.ProfileComponent),
    canActivate: [authGuard]
  }
];

