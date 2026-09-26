import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Events, EventItem } from '../../events/events';

@Component({
  selector: 'app-event-details',
  imports: [RouterLink],
  templateUrl: './event-details.html',
  styleUrl: './event-details.css',
})
export class EventDetails implements OnInit {
  event = signal<EventItem | null>(null);
  loading = signal(false);
  errorMessage = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly eventsService: Events,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.errorMessage.set('Invalid event id.');
      return;
    }

    this.loadEvent(id);
  }

  loadEvent(id: number) {
    this.loading.set(true);
    this.errorMessage.set('');

    this.eventsService.getEvent(id).subscribe({
      next: (event) => {
        this.event.set(event);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('failed to load event:', error);
        this.errorMessage.set('Could not load event.');
        this.loading.set(false);
      },
    });
  }

  formatDate(value: string) {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  categoryNames(event: EventItem) {
    return event.eventCategories
      ?.map((eventCategory) => eventCategory.category.name)
      .join(' · ');
  }

  availableSeats(event: EventItem) {
    return event.capacity - event.reservedSeats;
  }

  minimumPrice(event: EventItem) {
    if (!event.ticketTypes?.length) {
      return null;
    }

    return Math.min(
      ...event.ticketTypes.map((ticketType) => Number(ticketType.price)),
    );
  }
}