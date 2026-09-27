import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Όπως την επιστρέφει το backend (bookingInclude).
// Τα Decimal της Prisma (price, totalCost) έρχονται ως string στο JSON.
export type Booking = {
  id: number;
  eventId: number;
  ticketTypeId: number;
  attendeeId: number;
  time: string;
  numberOfTickets: number;
  totalCost: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  ticketType: { id: number; name: string; price: string };
  event: {
    id: number;
    title: string;
    venue: string;
    city: string;
    startDateTime: string;
    status: string;
    organizer: { id: number; username: string; firstName: string; lastName: string };
  };
};

export type EventBooking = {
  id: number;
  eventId: number;
  ticketTypeId: number;
  attendeeId: number;
  time: string;
  numberOfTickets: number;
  totalCost: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  ticketType: { id: number; name: string; price: string };
  attendee: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
};

export type CreateBookingRequest = {
  eventId: number;
  ticketTypeId: number;
  numberOfTickets: number;
};

@Injectable({
  providedIn: 'root',
})
export class Bookings {
  private readonly apiUrl = 'https://localhost:3000/bookings';

  constructor(private readonly http: HttpClient) {}

  // POST /bookings
  create(data: CreateBookingRequest): Observable<Booking> {
    return this.http.post<Booking>(this.apiUrl, data);
  }

  // GET /bookings/my
  getMine(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/my`);
  }

  getForEvent(eventId: number): Observable<EventBooking[]> {
    return this.http.get<EventBooking[]>(`${this.apiUrl}/event/${eventId}`);
  }
}
