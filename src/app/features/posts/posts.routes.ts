import { Routes } from '@angular/router';
import { PostListComponent } from './pages/post-list/post-list.component';
import { PostDetailComponent } from './pages/post-detail/post-detail.component';
import { PostEditComponent } from './pages/post-edit/post-edit.component';
import { authGuard } from '../../core/guards/auth.guard';

export const postsRoutes: Routes = [
  {
    path: '',
    component: PostListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'create',
    component: PostEditComponent,
    canActivate: [authGuard]
  },
  {
    path: 'new',
    redirectTo: 'create',
    pathMatch: 'full'
  },
  {
    path: ':id',
    component: PostDetailComponent,
    canActivate: [authGuard]
  },
  {
    path: ':id/edit',
    component: PostEditComponent,
    canActivate: [authGuard]
  }
];

