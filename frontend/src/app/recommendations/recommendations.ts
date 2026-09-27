import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventItem } from '../events/events';

@Injectable({
  providedIn: 'root',
})
export class Recommendations {
  private readonly apiUrl = 'https://localhost:3000/recommendations';

  constructor(private readonly http: HttpClient) {}

  getRecommendations(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(this.apiUrl);
  }
}