import { Component, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Booking, Bookings } from '../../bookings/bookings';

@Component({
  selector: 'app-my-bookings',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './my-bookings.html',
  styleUrl: './my-bookings.css',
})
export class MyBookings implements OnInit {
  bookings = signal<Booking[]>([]);
  loaded = signal(false);
  errorMessage = signal('');

  constructor(private readonly bookingsService: Bookings) {}

  ngOnInit() {
    this.bookingsService.getMine().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loaded.set(true);
      },
      error: (error) => {
        if (error.status === 401) this.errorMessage.set('Please log in.');
        else this.errorMessage.set('Could not load bookings.');
      },
    });
  }

  // Αν ακυρώθηκε το event, η κράτηση δεν ισχύει πια, ακόμα κι αν λέει CONFIRMED.
  displayStatus(booking: Booking): string {
    return booking.event.status === 'CANCELLED' ? 'CANCELLED' : booking.status;
  }
}
