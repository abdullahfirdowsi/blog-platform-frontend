import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    map(user => {
      if (user) {
        // Check if user is admin based on email or username
        const isAdmin = 
          user.email === 'blogplatform.live@gmail.com' ||
          user.email?.endsWith('@admin.com') ||
          user.username?.toLowerCase().includes('admin');
        
        if (isAdmin) {
          return true;
        }
      }
      
      // Redirect to home if not admin
      router.navigate(['/home']);
      return false;
    })
  );
};

