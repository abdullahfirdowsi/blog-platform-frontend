import { Routes } from '@angular/router';

export const landingRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing.component').then(c => c.LandingComponent)
  }
];

