import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type EventCategory = {
  eventId: number;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
};

export type EventPhoto = {
  id: number;
  eventId: number;
  filePath: string;
};

export type TicketType = {
  id: number;
  eventId: number;
  name: string;
  price: string;
  quantity: number;
  available: number;
};

export type EventItem = {
  id: number;
  title: string;
  eventType: string;
  venue: string;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  reservedSeats: number;
  status: string;
  description: string;
  organizerId: number;
  createdAt: string;
  updatedAt: string;
  organizer?: {
    id: number;
    username: string;
  };
  ticketTypes?: TicketType[];
  photos?: EventPhoto[];
  eventCategories?: EventCategory[];
};

export type EventFilters = {
  status?: string;
  city?: string;
  eventType?: string;
  search?: string;
  categoryId?: string;
};

export type Category = {
  id: number;
  name: string;
};

@Injectable({
  providedIn: 'root',
})
export class Events {
  private readonly apiUrl = 'http://localhost:3000/events';

  constructor(private readonly http: HttpClient) {}

  getEvents(filters: EventFilters = {}): Observable<EventItem[]> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        params = params.set(key, value);
      }
    }

    return this.http.get<EventItem[]>(this.apiUrl, { params });
  }

  getEvent(id: number): Observable<EventItem> {
    return this.http.get<EventItem>(`${this.apiUrl}/${id}`);
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }
}