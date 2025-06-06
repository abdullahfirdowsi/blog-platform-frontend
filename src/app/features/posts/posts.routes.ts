import { Routes } from '@angular/router';
import { PostListComponent } from './pages/post-list/post-list.component';
import { PostDetailComponent } from './pages/post-detail/post-detail.component';
import { PostEditComponent } from './pages/post-edit/post-edit.component';
import { authGuard } from '../../core/guards/auth.guard';

export const postsRoutes: Routes = [
  {
    path: '',
    component: PostListComponent
    // No auth guard - public access to view posts
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
    component: PostDetailComponent
    // No auth guard - public access to view posts
  },
  {
    path: ':id/edit',
    component: PostEditComponent,
    canActivate: [authGuard]
  }
];

