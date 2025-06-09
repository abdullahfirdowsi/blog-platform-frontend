import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const homeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(c => c.HomeComponent),
    canActivate: [authGuard]
  }
];

