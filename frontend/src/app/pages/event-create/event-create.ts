import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../auth/auth';
import { Events } from '../../events/events';

@Component({
  selector: 'app-event-create',
  imports: [FormsModule, RouterLink],
  templateUrl: './event-create.html',
  styleUrl: './event-create.css',
})
export class EventCreate {
  errorMessage = signal('');
  saving = signal(false);

  locationLoading = signal(false);
  locationMessage = signal('');

  form = {
    title: '',
    eventType: '',
    venue: '',
    address: '',
    city: '',
    country: 'Greece',
    latitude: '',
    longitude: '',
    startDateTime: '',
    endDateTime: '',
    capacity: 1,
    description: '',
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
    public readonly auth: Auth,
    private readonly eventsService: Events,
    private readonly router: Router,
  ) {}

  findLocation() {
  this.locationMessage.set('');

  const query = [
      this.form.venue,
      this.form.address,
      this.form.city,
      this.form.country,
  ]
      .filter(Boolean)
      .join(', ');

  if (!query) {
      this.locationMessage.set('Fill venue, address, city or country first.');
      return;
  }

  this.locationLoading.set(true);

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

  fetch(url, {
      headers: {
      Accept: 'application/json',
      },
  })
      .then((response) => response.json())
      .then((results) => {
      if (!results.length) {
          this.locationMessage.set('Location was not found. Try a more specific address.');
          return;
      }

      const result = results[0];

      this.form.latitude = result.lat;
      this.form.longitude = result.lon;

      this.locationMessage.set('Location found and coordinates were filled.');
      })
      .catch((error) => {
      console.error('failed to find location:', error);
      this.locationMessage.set('Could not find location.');
      })
      .finally(() => {
      this.locationLoading.set(false);
      });
  }

  submit(isValid: boolean | null) {
    this.errorMessage.set('');

    if (!this.auth.isLoggedIn()) {
      this.errorMessage.set('You need to sign in to create events.');
      return;
    }

    if (!isValid) {
      this.errorMessage.set('Please fill all required fields.');
      return;
    }

    this.saving.set(true);

    this.eventsService.createEvent({
      title: this.form.title,
      eventType: this.form.eventType,
      venue: this.form.venue,
      address: this.form.address,
      city: this.form.city,
      country: this.form.country,
      latitude: this.form.latitude ? Number(this.form.latitude) : undefined,
      longitude: this.form.longitude ? Number(this.form.longitude) : undefined,
      startDateTime: new Date(this.form.startDateTime).toISOString(),
      endDateTime: new Date(this.form.endDateTime).toISOString(),
      capacity: Number(this.form.capacity),
      description: this.form.description,
    }).subscribe({
      next: (event) => {
        this.saving.set(false);
        this.router.navigate(['/events', event.id]);
      },
      error: (error) => {
        console.error('failed to create event:', error);
        this.errorMessage.set(error.error?.message ?? 'Could not create event.');
        this.saving.set(false);
      },
    });
  }
}