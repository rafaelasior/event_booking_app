import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Ίδια πεδία με το userSummary του backend.
export type UserSummary = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
};

// Ένα μήνυμα όπως το επιστρέφει το backend (με sender, receiver, event).
export type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  eventId: number | null;
  bookingId: number | null;
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: UserSummary;
  receiver: UserSummary;
  event: { id: number; title: string } | null;
};

// Ίδια δομή με το Contact του backend (GET /messages/contacts).
export type Contact = {
  user: UserSummary;
  event: { id: number; title: string };
  role: 'organizer' | 'attendee'; // ο ρόλος του ΑΛΛΟΥ χρήστη
};

export type SendMessageRequest = {
  receiverId: number;
  eventId?: number;
  subject: string;
  content: string;
};

export type AnnouncementRequest = {
  subject: string;
  content: string;
};

@Injectable({
  providedIn: 'root',
})
export class Messages {
  private readonly apiUrl = 'http://localhost:3000/messages';

  // Πλήθος αδιάβαστων. Το service είναι ένα για όλη την εφαρμογή (providedIn: 'root'),
  // άρα όποιο component διαβάζει αυτό το signal βλέπει την ίδια τιμή.
  readonly unreadCount = signal(0);

  constructor(private readonly http: HttpClient) {}

  // GET /messages/inbox
  getInbox(): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/inbox`);
  }

  // GET /messages/sent
  getSent(): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/sent`);
  }

  // GET /messages/:id
  getMessage(id: number): Observable<Message> {
    return this.http.get<Message>(`${this.apiUrl}/${id}`);
  }

  // GET /messages/contacts
  getContacts(): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.apiUrl}/contacts`);
  }

  // POST /messages
  send(data: SendMessageRequest): Observable<Message> {
    return this.http.post<Message>(this.apiUrl, data);
  }

  // PATCH /messages/:id/read
  markAsRead(id: number): Observable<Message> {
    return this.http.patch<Message>(`${this.apiUrl}/${id}/read`, {});
  }

  // DELETE /messages/:id
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // POST /messages/events/:eventId/announcement
  // Έτοιμο για τη σελίδα ακύρωσης event της partner σου.
  sendAnnouncement(eventId: number, data: AnnouncementRequest): Observable<{ recipients: number }> {
    return this.http.post<{ recipients: number }>(
      `${this.apiUrl}/events/${eventId}/announcement`,
      data,
    );
  }

  // GET /messages/unread-count και ενημέρωση του signal.
  refreshUnreadCount() {
    this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).subscribe({
      next: (response) => this.unreadCount.set(response.count),
      error: () => this.unreadCount.set(0),
    });
  }
}
