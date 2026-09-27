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

  constructor(
    private readonly eventsService: Events,
    public readonly auth: Auth,
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
        this.errorMessage.set('Please sign in to view your events.');
        this.loading.set(false);
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


  formatDate(value: string) {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}