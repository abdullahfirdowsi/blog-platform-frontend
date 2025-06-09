import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take, Observable } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<any> => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Always include credentials for cookie-based refresh tokens
  let authReq = req.clone({
    withCredentials: true
  });

  // Add token to requests (except auth endpoints)
  if (token && !isAuthEndpoint(req.url)) {
    authReq = addTokenToRequest(authReq, token);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If token is expired (401) and we're not already trying to refresh
      if (error.status === 401 && !isAuthEndpoint(req.url) && !req.url.includes('/refresh')) {
        return handleTokenRefresh(authService, req, next);
      }
      return throwError(() => error);
    })
  );
};

const isRefreshing = new BehaviorSubject<boolean>(false);

function isAuthEndpoint(url: string): boolean {
  const authEndpoints = ['/auth/login', '/auth/register', '/auth/google', '/auth/forgot-password', '/auth/reset-password'];
  return authEndpoints.some(endpoint => url.includes(endpoint));
}

function addTokenToRequest(req: any, token: string) {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    },
    withCredentials: true
  });
}

function handleTokenRefresh(authService: AuthService, req: any, next: any) {
  if (!isRefreshing.value) {
    isRefreshing.next(true);
    
    return authService.refreshToken().pipe(
      switchMap((response) => {
        isRefreshing.next(false);
        // Retry the original request with new token
        const newAuthReq = addTokenToRequest(req, response.access_token);
        return next(newAuthReq);
      }),
      catchError((refreshError) => {
        isRefreshing.next(false);
        // Refresh failed, logout user
        authService.logout();
        return throwError(() => refreshError);
      })
    );
  } else {
    // Wait for refresh to complete
    return isRefreshing.pipe(
      filter(refreshing => !refreshing),
      take(1),
      switchMap(() => {
        const token = authService.getToken();
        if (token) {
          const newAuthReq = addTokenToRequest(req, token);
          return next(newAuthReq);
        } else {
          return throwError(() => new Error('No token available after refresh'));
        }
      })
    );
  }
}
