import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/landing',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'reset-password',
    redirectTo: '/auth/reset-password',
    pathMatch: 'full'
  },
  {
    path: 'landing',
    loadChildren: () => import('./features/landing/landing.routes').then(m => m.landingRoutes)
  },
  {
    path: 'home',
    loadChildren: () => import('./features/home/home.routes').then(m => m.homeRoutes)
  },
  {
    path: 'write',
    redirectTo: '/posts/write',
    pathMatch: 'full'
  },
  {
    path: 'posts',
    loadChildren: () => import('./features/posts/posts.routes').then(m => m.postsRoutes)
  },
  {
    path: 'profile',
    loadChildren: () => import('./features/profile/profile.routes').then(m => m.profileRoutes)
  },
  {
    path: '**',
    redirectTo: '/landing'
  }
];
