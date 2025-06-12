import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Backend response interface (what actually comes from the API)
interface BackendImageUploadResponse {
  success: boolean;
  imageUrl: string;
  message?: string;
}

// Frontend interface (what components expect)
interface ImageUploadResponse {
  imageUrl: string;
  url: string; // alias for compatibility
}

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  uploadImage(file: File): Observable<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<BackendImageUploadResponse>(`${this.apiUrl}/images/upload`, formData)
      .pipe(
        map(response => ({
          imageUrl: response.imageUrl,
          url: response.imageUrl // provide both for compatibility
        }))
      );
  }
}

