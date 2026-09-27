import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Category,
  EventFilters,
  EventItem,
  EventPage,
  Events as EventsService,
} from '../../events/events';
import { Auth } from '../../auth/auth';
import { finalize } from 'rxjs';
import { AdminExport, ExportFormat } from '../../admin/admin-export';
import { Recommendations } from '../../recommendations/recommendations';
import { MessagesLink } from '../../shared/messages-link/messages-link';

@Component({
  selector: 'app-events-page',
  imports: [RouterLink, FormsModule, MessagesLink],
  templateUrl: './events.html',
  styleUrl: './events.css',
})
export class EventsPage implements OnInit {
  events = signal<EventItem[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  exporting = signal<ExportFormat | null>(null);
  recommendedEvents = signal<EventItem[]>([]);
  recommendationsLoading = signal(false);
  recommendationsError = signal('');
  viewMode = signal<'all' | 'recommended'>('all');
  page = signal(1);
  pageSize = 5;
  totalEvents = signal(0);
  totalPages = signal(1);

  filters: EventFilters = {
    search: '',
    city: '',
    eventType: '',
    categoryId: '',
    dateFrom: '',
    dateTo: '',
    minPrice: '',
    maxPrice: '',
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
    private readonly eventsService: EventsService,
    public readonly auth: Auth,
    private readonly adminExport: AdminExport,
    private readonly recommendationsService: Recommendations,
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadEvents();
  }

  logout() {
    this.auth.logout();
  }

  loadCategories() {
    this.eventsService.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: (error) => console.error('failed to load categories:', error),
    });
  }

  searchEvents() {
    if (this.viewMode() === 'recommended') {
      if (!this.recommendedEvents().length) {
        this.loadRecommendations();
      }

      return;
    }

    this.loadEvents(1);
  }

  loadEvents(page = this.page()) {
    this.loading.set(true);
    this.errorMessage.set('');
    this.page.set(page);

    this.eventsService.getEventsPage(this.filters, page, this.pageSize).subscribe({
      next: (result: EventPage) => {
        this.events.set(result.items);
        this.totalEvents.set(result.total);
        this.totalPages.set(result.totalPages);
        this.page.set(result.page);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('failed to load events:', error);
        this.errorMessage.set('Could not load events.');
        this.loading.set(false);
      },
    });
  }

  showAllEvents() {
    this.viewMode.set('all');
  }

  filteredRecommendedEvents() {
    return this.recommendedEvents().filter((event) => this.matchesFilters(event));
  }

  private matchesFilters(event: EventItem) {
    const search = this.filters.search?.trim().toLowerCase();
    const city = this.filters.city?.trim().toLowerCase();
    const categoryId = this.filters.categoryId ? Number(this.filters.categoryId) : null;
    const minPrice = this.filters.minPrice ? Number(this.filters.minPrice) : null;
    const maxPrice = this.filters.maxPrice ? Number(this.filters.maxPrice) : null;
    const eventDate = new Date(event.startDateTime).getTime();

    if (search) {
      const searchable = [
        event.title,
        event.description,
        event.venue,
        event.address,
        event.city,
        event.country,
      ].join(' ').toLowerCase();

      if (!searchable.includes(search)) {
        return false;
      }
    }

    if (city && !event.city.toLowerCase().includes(city)) {
      return false;
    }

    if (this.filters.eventType && event.eventType !== this.filters.eventType) {
      return false;
    }

    if (categoryId && !event.eventCategories?.some((eventCategory) => eventCategory.categoryId === categoryId)) {
      return false;
    }

    if (this.filters.dateFrom && eventDate < new Date(this.filters.dateFrom).getTime()) {
      return false;
    }

    if (this.filters.dateTo && eventDate > new Date(this.filters.dateTo).getTime()) {
      return false;
    }

    const price = this.minimumPrice(event);

    if (minPrice !== null && (price === null || price < minPrice)) {
      return false;
    }

    if (maxPrice !== null && (price === null || price > maxPrice)) {
      return false;
    }

    return true;
  }

  previousPage() {
    if (this.page() <= 1) {
      return;
    }

    this.loadEvents(this.page() - 1);
  }

  nextPage() {
    if (this.page() >= this.totalPages()) {
      return;
    }

    this.loadEvents(this.page() + 1);
  }

  showRecommendedEvents() {
    this.viewMode.set('recommended');

    if (this.recommendedEvents().length) {
      return;
    }

    this.loadRecommendations();
  }

  loadRecommendations() {
    if (!this.auth.isLoggedIn()) {
      return;
    }

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
      dateFrom: '',
      dateTo: '',
      minPrice: '',
      maxPrice: '',
      status: 'PUBLISHED',
    };

    if (this.viewMode() === 'all') {
      this.loadEvents(1);
    }
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

  eventPhotoUrl(event: EventItem) {
    const filePath = event.photos?.[0]?.filePath;

    if (!filePath) {
      return null;
    }

    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    return `https://localhost:3000${filePath.startsWith('/') ? filePath : `/${filePath}`}`;
  }

  exportEvents(format: ExportFormat) {
    if (!this.auth.isAdmin()) {
      this.errorMessage.set('Admin access only.');
      return;
    }

    this.exporting.set(format);

    this.adminExport.download(format).pipe(
      finalize(() => this.exporting.set(null)),
    ).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `events.${format}`;
        link.click();

        setTimeout(() => URL.revokeObjectURL(url));
      },
      error: () => this.errorMessage.set('Could not export events.'),
    });
  }
}