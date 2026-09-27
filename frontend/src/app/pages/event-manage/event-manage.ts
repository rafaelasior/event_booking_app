import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../auth/auth';
import {
  Category,
  EventItem,
  Events,
  TicketType,
} from '../../events/events';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MessagesLink } from '../../shared/messages-link/messages-link';


@Component({
  selector: 'app-event-manage',
  imports: [RouterLink, FormsModule, MessagesLink],
  templateUrl: './event-manage.html',
  styleUrl: './event-manage.css',
})
export class EventManage implements OnInit {
  event = signal<EventItem | null>(null);
  categories = signal<Category[]>([]);
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  locationLoading = signal(false);
  locationMessage = signal('');


  detailsForm = {
    title: '',
    eventType: '',
    venue: '',
    address: '',
    city: '',
    country: '',
    latitude: '',
    longitude: '',
    capacity: 1,
    startDateTime: '',
    endDateTime: '',
    description: '',
  };

  ticketForm = {
    name: '',
    price: 0,
    quantity: 1,
  };

  selectedCategoryIds: Record<number, boolean> = {};

  photoForm = {
    filePath: '',
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
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly eventsService: Events,
    public readonly auth: Auth,
    private readonly sanitizer: DomSanitizer,

  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.loadCategories();

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.errorMessage.set('Invalid event id.');
      return;
    }

    this.loadEvent(id);
  }

  loadCategories() {
    this.eventsService.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: (error) => console.error('failed to load categories:', error),
    });
  }

  loadEvent(id: number) {
    this.loading.set(true);
    this.errorMessage.set('');

    this.eventsService.getEvent(id).subscribe({
      next: (event) => {
        this.event.set(event);
        this.fillForms(event);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('failed to load event:', error);
        this.errorMessage.set('Could not load event.');
        this.loading.set(false);
      },
    });
  }

  fillForms(event: EventItem) {
    this.detailsForm = {
      title: event.title,
      eventType: event.eventType,
      venue: event.venue,
      address: event.address,
      city: event.city,
      country: event.country,
      latitude: event.latitude !== null ? String(event.latitude) : '',
      longitude: event.longitude !== null ? String(event.longitude) : '',
      capacity: event.capacity,
      startDateTime: this.toDateTimeLocal(event.startDateTime),
      endDateTime: this.toDateTimeLocal(event.endDateTime),
      description: event.description,
    };

    this.selectedCategoryIds = {};

    for (const eventCategory of event.eventCategories ?? []) {
      this.selectedCategoryIds[eventCategory.categoryId] = true;
    }
  }

  toDateTimeLocal(value: string) {
    const date = new Date(value);
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  }

  refreshCurrentEvent() {
    const event = this.event();

    if (event) {
      this.loadEvent(event.id);
    }
  }

    findLocation() {
    this.locationMessage.set('');

    const query = [
      this.detailsForm.address,
      this.detailsForm.city,
      this.detailsForm.country,
    ]
      .filter(Boolean)
      .join(', ');

    if (!query) {
      this.locationMessage.set('Fill address, city or country first.');
      return;
    }

    this.locationLoading.set(true);

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

    fetch(url, { headers: { Accept: 'application/json' } })
      .then((response) => response.json())
      .then((results) => {
        if (!results.length) {
          this.locationMessage.set('Location was not found. Try a more specific address.');
          return;
        }

        this.detailsForm.latitude = results[0].lat;
        this.detailsForm.longitude = results[0].lon;
        this.locationMessage.set('Location found. Press "Save details" to keep it.');
      })
      .catch((error) => {
        console.error('failed to find location:', error);
        this.locationMessage.set('Could not find location.');
      })
      .finally(() => this.locationLoading.set(false));
  }

  mapPreviewUrl(): SafeResourceUrl | null {
    if (!this.detailsForm.latitude || !this.detailsForm.longitude) {
      return null;
    }

    const lat = Number(this.detailsForm.latitude);
    const lon = Number(this.detailsForm.longitude);
    const delta = 0.01;

    const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].join(',');

    const url =
      `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}` +
      `&layer=mapnik&marker=${lat},${lon}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }


  setSuccess(message: string) {
    this.successMessage.set(message);
    this.errorMessage.set('');
  }

  setError(error: unknown, fallback: string) {
    console.error(fallback, error);

    const maybeError = error as { error?: { message?: string | string[] } };
    const backendMessage = maybeError.error?.message;

    this.errorMessage.set(
      Array.isArray(backendMessage)
        ? backendMessage.join(', ')
        : backendMessage ?? fallback,
    );

    this.successMessage.set('');
  }

  saveDetails() {
    const event = this.event();

    if (!event) {
      return;
    }

    this.saving.set(true);

    this.eventsService.updateEvent(event.id, {
      title: this.detailsForm.title,
      eventType: this.detailsForm.eventType,
      venue: this.detailsForm.venue,
      address: this.detailsForm.address,
      city: this.detailsForm.city,
      country: this.detailsForm.country,
      latitude: this.detailsForm.latitude ? Number(this.detailsForm.latitude) : undefined,
      longitude: this.detailsForm.longitude ? Number(this.detailsForm.longitude) : undefined,
      capacity: Number(this.detailsForm.capacity),
      startDateTime: new Date(this.detailsForm.startDateTime).toISOString(),
      endDateTime: new Date(this.detailsForm.endDateTime).toISOString(),
      description: this.detailsForm.description,
    }).subscribe({
      next: (updatedEvent) => {
        this.event.set(updatedEvent);
        this.fillForms(updatedEvent);
        this.setSuccess('Event details updated.');
        this.saving.set(false);
      },
      error: (error) => {
        this.setError(error, 'Could not update event.');
        this.saving.set(false);
      },
    });
  }

  publish() {
    const event = this.event();

    if (!event) {
      return;
    }

    this.eventsService.publishEvent(event.id).subscribe({
      next: () => {
        this.setSuccess('Event published.');
        this.refreshCurrentEvent();
      },
      error: (error) => this.setError(error, 'Could not publish event.'),
    });
  }

  cancel() {
    const event = this.event();

    if (!event) {
      return;
    }

    const confirmed = confirm(`Cancel "${event.title}"?`);

    if (!confirmed) {
      return;
    }

    this.eventsService.cancelEvent(event.id).subscribe({
      next: () => {
        this.setSuccess('Event cancelled. All attendees have been notified.');
        this.refreshCurrentEvent();
      },
      error: (error) => this.setError(error, 'Could not cancel event.'),
    });
  }

  deleteEvent() {
    const event = this.event();

    if (!event) {
      return;
    }

    const confirmed = confirm(`Delete "${event.title}"?`);

    if (!confirmed) {
      return;
    }

    this.eventsService.deleteEvent(event.id).subscribe({
      next: () => this.router.navigateByUrl('/events/my'),
      error: (error) => this.setError(error, 'Could not delete event.'),
    });
  }

  addTicketType() {
    const event = this.event();

    if (!event) {
      return;
    }

    this.eventsService.createTicketType(event.id, {
      name: this.ticketForm.name,
      price: Number(this.ticketForm.price),
      quantity: Number(this.ticketForm.quantity),
    }).subscribe({
      next: () => {
        this.ticketForm = {
          name: '',
          price: 0,
          quantity: 1,
        };

        this.setSuccess('Ticket type added.');
        this.refreshCurrentEvent();
      },
      error: (error) => this.setError(error, 'Could not add ticket type.'),
    });
  }

  ticketQuantityTotal() {
    const event = this.event();

    if (!event?.ticketTypes) {
      return 0;
    }

    return event.ticketTypes.reduce(
      (total, ticket) => total + Number(ticket.quantity),
      0,
    );
  }

  deleteTicketType(ticketType: TicketType) {
    const event = this.event();

    if (!event) {
      return;
    }

    const confirmed = confirm(`Delete ticket type "${ticketType.name}"?`);

    if (!confirmed) {
      return;
    }

    this.eventsService.deleteTicketType(event.id, ticketType.id).subscribe({
      next: () => {
        this.setSuccess('Ticket type deleted.');
        this.refreshCurrentEvent();
      },
      error: (error) => this.setError(error, 'Could not delete ticket type.'),
    });
  }

  saveCategories() {
    const event = this.event();

    if (!event) {
      return;
    }

    const categoryIds = Object.entries(this.selectedCategoryIds)
      .filter(([, selected]) => selected)
      .map(([categoryId]) => Number(categoryId));

    this.eventsService.setEventCategories(event.id, { categoryIds }).subscribe({
      next: (updatedEvent) => {
        this.event.set(updatedEvent);
        this.fillForms(updatedEvent);
        this.setSuccess('Categories updated.');
      },
      error: (error) => this.setError(error, 'Could not update categories.'),
    });
  }

  addPhoto() {
    const event = this.event();

    if (!event) {
      return;
    }

    this.eventsService.addPhoto(event.id, {
      filePath: this.photoForm.filePath,
    }).subscribe({
      next: () => {
        this.photoForm.filePath = '';
        this.setSuccess('Photo added.');
        this.refreshCurrentEvent();
      },
      error: (error) => this.setError(error, 'Could not add photo.'),
    });
  }

  deletePhoto(photoId: number) {
    const event = this.event();

    if (!event) {
      return;
    }

    this.eventsService.deletePhoto(event.id, photoId).subscribe({
      next: () => {
        this.setSuccess('Photo deleted.');
        this.refreshCurrentEvent();
      },
      error: (error) => this.setError(error, 'Could not delete photo.'),
    });
  }

}