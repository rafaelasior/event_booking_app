import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Category,
  EventFilters,
  EventItem,
  Events,
} from '../../events/events';
import { Auth } from '../../auth/auth';
import { Recommendations } from '../../recommendations/recommendations';
import { MessagesLink } from '../../shared/messages-link/messages-link';


@Component({
  selector: 'app-welcome',
  imports: [RouterLink, FormsModule, MessagesLink],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome implements OnInit {
  events = signal<EventItem[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(false);
  errorMessage = signal('');

  recommendedEvents = signal<EventItem[]>([]);
  recommendationsLoading = signal(false);
  recommendationsError = signal('');

  filters: EventFilters = {
    search: '',
    city: '',
    eventType: '',
    categoryId: '',
    status: 'PUBLISHED',
  };

  eventTypes = [
    'Concert',
    'Workshop',
    'Seminar',
    'Conference',
    'Theater',
    'Festival',
    'Sports',
    'Other',
  ];

  constructor(
    private readonly eventsService: Events,
    public readonly auth: Auth,
    private readonly recommendationsService: Recommendations,
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadEvents();
    if (this.auth.isLoggedIn()) {
      this.loadRecommendations();
    }
  }

  logout() {
    this.auth.logout();
  }

  loadCategories() {
    this.eventsService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
      },
      error: (error) => {
        console.error('failed to load categories:', error);
      },
    });
  }

  loadEvents() {
    this.loading.set(true);
    this.errorMessage.set('');

    this.eventsService.getEvents(this.filters).subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('failed to load events:', error);
        this.errorMessage.set('Could not load events.');
        this.loading.set(false);
      },
    });
  }

  loadRecommendations() {
    this.recommendationsLoading.set(true);
    this.recommendationsError.set('');

    this.recommendationsService.getRecommendations().subscribe({
      next: (events) => {
        this.recommendedEvents.set(events);
        this.recommendationsLoading.set(false);
      },
      error: (error) => {
        console.error('failed to load recommendations:', error);
        this.recommendationsError.set('Could not load recommendations.');
        this.recommendationsLoading.set(false);
      },
    });
  }

  clearFilters() {
    this.filters = {
      search: '',
      city: '',
      eventType: '',
      categoryId: '',
      status: 'PUBLISHED',
    };

    this.loadEvents();
  }

  formatDate(value: string) {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
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