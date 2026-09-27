import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Category,
  EventFilters,
  EventItem,
  Events as EventsService,
} from '../../events/events';
import { Auth } from '../../auth/auth';
import { finalize } from 'rxjs';
import { AdminExport, ExportFormat } from '../../admin/admin-export';

@Component({
  selector: 'app-events-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './events.html',
  styleUrl: './events.css',
})
export class EventsPage implements OnInit {
  events = signal<EventItem[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  exporting = signal<ExportFormat | null>(null);

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