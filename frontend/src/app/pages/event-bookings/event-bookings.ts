import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventBooking, Bookings } from '../../bookings/bookings';

@Component({
  selector: 'app-event-bookings',
  imports: [RouterLink],
  templateUrl: './event-bookings.html',
  styleUrl: './event-bookings.css',
})
export class EventBookings implements OnInit {
  bookings = signal<EventBooking[]>([]);
  loading = signal(false);
  errorMessage = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly bookingsService: Bookings,
  ) {}

  ngOnInit() {
    const eventId = Number(this.route.snapshot.paramMap.get('id'));

    if (!eventId) {
      this.errorMessage.set('Invalid event id.');
      return;
    }

    this.loading.set(true);

    this.bookingsService.getForEvent(eventId).subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('failed to load event bookings:', error);
        this.errorMessage.set(
          error.error?.message ?? 'Could not load event bookings.',
        );
        this.loading.set(false);
      },
    });
  }

  formatDate(value: string) {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}