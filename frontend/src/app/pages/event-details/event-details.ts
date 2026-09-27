import { Component, OnInit, signal, HostListener } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Events, EventItem } from '../../events/events';
import { Auth } from '../../auth/auth';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MessagesLink } from '../../shared/messages-link/messages-link';

@Component({
  selector: 'app-event-details',
  imports: [RouterLink, MessagesLink],
  templateUrl: './event-details.html',
  styleUrl: './event-details.css',
})
export class EventDetails implements OnInit {
  event = signal<EventItem | null>(null);
  loading = signal(false);
  errorMessage = signal('');
  selectedPhoto = signal<string | null>(null);


  constructor(
    private readonly route: ActivatedRoute,
    private readonly eventsService: Events,
    public readonly auth: Auth,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.errorMessage.set('Invalid event id.');
      return;
    }

    this.loadEvent(id);
  }

  logout() {
    this.auth.logout();
  }
  
  openPhoto(filePath: string | undefined) {
    this.selectedPhoto.set(filePath ?? null);
  }

  // κλείνει και με το πλήκτρο Esc
  @HostListener('document:keydown.escape')
  closePhoto() {
    this.selectedPhoto.set(null);
  }


  recordView(eventId: number) {
    if (!this.auth.isLoggedIn()) {
      return;
    }

    this.eventsService.recordView(eventId).subscribe({
      next: () => {},
      error: (error) => console.error('failed to record event view:', error),
    });
  }

  loadEvent(id: number) {
    this.loading.set(true);
    this.errorMessage.set('');

    this.eventsService.getEvent(id).subscribe({
      next: (event) => {
        this.event.set(event);
        this.recordView(event.id);
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

  mapPreviewUrl(event: EventItem): SafeResourceUrl | null {
    if (event.latitude === null || event.longitude === null) {
      return null;
    }

    const lat = event.latitude;
    const lon = event.longitude;
    const delta = 0.01;

    const bbox = [
      lon - delta,
      lat - delta,
      lon + delta,
      lat + delta,
    ].join(',');

    const url =
      `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}` +
      `&layer=mapnik&marker=${lat},${lon}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
}
}