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

export type CreateEventRequest = {
  title: string;
  eventType: string;
  venue: string;
  address: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  description: string;
};

export type Category = {
  id: number;
  name: string;
};

export type UpdateEventRequest = Partial<CreateEventRequest>;

export type CreateTicketTypeRequest = {
  name: string;
  price: number;
  quantity: number;
};

export type UpdateTicketTypeRequest = Partial<CreateTicketTypeRequest>;

export type SetEventCategoriesRequest = {
  categoryIds: number[];
};

export type CreatePhotoRequest = {
  filePath: string;
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

  createEvent(data: CreateEventRequest): Observable<EventItem> {
    return this.http.post<EventItem>(this.apiUrl, data);
  }

  getEvent(id: number): Observable<EventItem> {
    return this.http.get<EventItem>(`${this.apiUrl}/${id}`);
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }

  getMyEvents(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(`${this.apiUrl}/my`);
  }

  publishEvent(id: number): Observable<EventItem> {
    return this.http.patch<EventItem>(`${this.apiUrl}/${id}/publish`, {});
  }

  cancelEvent(id: number): Observable<EventItem> {
    return this.http.patch<EventItem>(`${this.apiUrl}/${id}/cancel`, {});
  }

  deleteEvent(id: number): Observable<EventItem> {
    return this.http.delete<EventItem>(`${this.apiUrl}/${id}`);
  }

  updateEvent(id: number, data: UpdateEventRequest): Observable<EventItem> {
    return this.http.patch<EventItem>(`${this.apiUrl}/${id}`, data);
  }

  createTicketType(
    eventId: number,
    data: CreateTicketTypeRequest,
  ): Observable<TicketType> {
    return this.http.post<TicketType>(
      `${this.apiUrl}/${eventId}/ticket-types`,
      data,
    );
  }

  updateTicketType(
    eventId: number,
    ticketTypeId: number,
    data: UpdateTicketTypeRequest,
  ): Observable<TicketType> {
    return this.http.patch<TicketType>(
      `${this.apiUrl}/${eventId}/ticket-types/${ticketTypeId}`,
      data,
    );
  }

  deleteTicketType(eventId: number, ticketTypeId: number): Observable<TicketType> {
    return this.http.delete<TicketType>(
      `${this.apiUrl}/${eventId}/ticket-types/${ticketTypeId}`,
    );
  }

  setEventCategories(
    eventId: number,
    data: SetEventCategoriesRequest,
  ): Observable<EventItem> {
    return this.http.post<EventItem>(`${this.apiUrl}/${eventId}/categories`, data);
  }

  uploadPhoto(eventId: number, file: File): Observable<EventPhoto> {
  const formData = new FormData();
  formData.append('photo', file);   // ίδιο όνομα με το FileInterceptor('photo')
  return this.http.post<EventPhoto>(`${this.apiUrl}/${eventId}/photos/upload`, formData);
  }


  addPhoto(eventId: number, data: CreatePhotoRequest): Observable<EventPhoto> {
    return this.http.post<EventPhoto>(`${this.apiUrl}/${eventId}/photos`, data);
  }

  deletePhoto(eventId: number, photoId: number): Observable<EventPhoto> {
    return this.http.delete<EventPhoto>(
      `${this.apiUrl}/${eventId}/photos/${photoId}`,
    );
  }
}