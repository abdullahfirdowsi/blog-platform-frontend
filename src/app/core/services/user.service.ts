import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, UpdateUserRequest } from '../../shared/interfaces';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getCurrentUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`);
  }

  getUserProfile(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`);
  }

  updateProfile(userData: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/me`, userData);
  }

  uploadProfileImage(file: File): Observable<{profile_image: string}> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{profile_image: string}>(`${environment.apiUrl}/upload/profile-image`, formData);
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/me`);
  }
}

