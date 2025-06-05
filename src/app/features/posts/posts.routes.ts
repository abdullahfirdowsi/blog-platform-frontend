import { Routes } from '@angular/router';
import { PostListComponent } from './pages/post-list/post-list.component';
import { PostDetailComponent } from './pages/post-detail/post-detail.component';
import { PostEditComponent } from './pages/post-edit/post-edit.component';

export const postsRoutes: Routes = [
  {
    path: '',
    component: PostListComponent
  },
  {
    path: 'new',
    component: PostEditComponent
  },
  {
    path: ':id',
    component: PostDetailComponent
  },
  {
    path: ':id/edit',
    component: PostEditComponent
  }
];

