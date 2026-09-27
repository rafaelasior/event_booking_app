import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventItem, Events } from '../../events/events';
import { Auth } from '../../auth/auth';

@Component({
  selector: 'app-my-events',
  imports: [RouterLink],
  templateUrl: './my-events.html',
  styleUrl: './my-events.css',
})
export class MyEvents implements OnInit {
  events = signal<EventItem[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  busyId = signal<number | null>(null);

  constructor(
    private readonly eventsService: Events,
    public readonly auth: Auth,
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
        return;
    }

    this.loadEvents();
    }



  loadEvents() {
    this.loading.set(true);
    this.errorMessage.set('');

    this.eventsService.getMyEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('failed to load my events:', error);
        this.errorMessage.set('Could not load your events.');
        this.loading.set(false);
      },
    });
  }

  publish(event: EventItem) {
    this.busyId.set(event.id);

    this.eventsService.publishEvent(event.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.loadEvents();
      },
      error: (error) => {
        console.error('failed to publish event:', error);
        this.errorMessage.set('Could not publish event.');
        this.busyId.set(null);
      },
    });
  }

  cancel(event: EventItem) {
    this.busyId.set(event.id);

    this.eventsService.cancelEvent(event.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.loadEvents();
      },
      error: (error) => {
        console.error('failed to cancel event:', error);
        this.errorMessage.set('Could not cancel event.');
        this.busyId.set(null);
      },
    });
  }

  delete(event: EventItem) {
    const confirmed = confirm(`Delete "${event.title}"?`);

    if (!confirmed) {
      return;
    }

    this.busyId.set(event.id);

    this.eventsService.deleteEvent(event.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.loadEvents();
      },
      error: (error) => {
        console.error('failed to delete event:', error);
        this.errorMessage.set(
          error.error?.message ?? 'Could not delete event.',
        );
        this.busyId.set(null);
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