import { Component, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { Auth } from '../../auth/auth';
import { Events, EventItem, TicketType } from '../../events/events';
import { Booking, Bookings } from '../../bookings/bookings';

// form -> confirm -> done
type Step = 'form' | 'confirm' | 'done';

@Component({
  selector: 'app-book-event',
  imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './book-event.html',
  styleUrl: './book-event.css',
})
export class BookEvent implements OnInit {
  event = signal<EventItem | null>(null);
  step = signal<Step>('form');
  booking = signal<Booking | null>(null); // ό,τι επέστρεψε το backend
  errorMessage = signal('');
  submitting = signal(false);

  form = {
    ticketTypeId: 0,
    numberOfTickets: 1,
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly auth: Auth,
    private readonly eventsService: Events,
    private readonly bookingsService: Bookings,
  ) {}

  ngOnInit() {
    // Ο επισκέπτης δεν κάνει κράτηση. Το backend θα έδινε 401 έτσι κι αλλιώς.
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.errorMessage.set('Invalid event id.');
      return;
    }

    this.loadEvent(id);
  }

  loadEvent(id: number) {
    this.eventsService.getEvent(id).subscribe({
      next: (event) => {
        const ticketTypes = event.ticketTypes ?? [];

        //Κρατάμε την επιλογή αν έχει ακόμα εισιτήρια, αλλιώς δίνει τον πρώτο διαθέσιμο τύπο.
        const current = ticketTypes.find(
          (t) => t.id === this.form.ticketTypeId && t.available > 0,
        );
        const firstAvailable = ticketTypes.find((t) => t.available > 0);
        this.form.ticketTypeId = (current ?? firstAvailable)?.id ?? 0;

        this.event.set(event);
      },
      error: () => this.errorMessage.set('Could not load event.'),
    });
  }

  // Ίδιοι κανόνες με το backend, για να μη δείχνουμε φόρμα που θα αποτύχει.
  // Επιστρέφει '' όταν επιτρέπεται η κράτηση.
  bookingBlockedReason(event: EventItem): string {
    if (event.status !== 'PUBLISHED') {
      return `This event is ${event.status.toLowerCase()}.`;
    }

    if (new Date(event.startDateTime) <= new Date()) {
      return 'This event has already started.';
    }

    if (event.organizerId === this.auth.getUserId()) {
      return 'You cannot book your own event.';
    }

    const hasTickets = event.ticketTypes?.some((t) => t.available > 0);

    if (!hasTickets || event.reservedSeats >= event.capacity) {
      return 'This event is sold out.';
    }

    return '';
  }

  selectedTicketType(): TicketType | undefined {
    return this.event()?.ticketTypes?.find((t) => t.id === this.form.ticketTypeId);
  }

  // Όσα έχει ο τύπος, αλλά όχι πάνω από τις ελεύθερες θέσεις του event.
  maxTickets(): number {
    const event = this.event();
    const ticketType = this.selectedTicketType();

    if (!event || !ticketType) return 0;

    return Math.min(ticketType.available, event.capacity - event.reservedSeats);
  }

  // Μόνο προεπισκόπηση. Το τελικό ποσό το υπολογίζει το backend.
  totalCost(): number {
    const ticketType = this.selectedTicketType();
    return ticketType ? Number(ticketType.price) * (this.form.numberOfTickets || 0) : 0;
  }

  review(bookingForm: NgForm) {
    this.errorMessage.set('');

    const count = this.form.numberOfTickets;
    const max = this.maxTickets();

    if (bookingForm.invalid || !this.selectedTicketType()) {
      this.errorMessage.set('Please choose a ticket type and number of tickets.');
      return;
    }

    if (!Number.isInteger(count) || count < 1 || count > max) {
      this.errorMessage.set(`You can book from 1 to ${max} tickets of this type.`);
      return;
    }

    this.step.set('confirm');
  }

  back() {
    this.step.set('form');
  }

  //οριστική υποβολή
  confirm() {
    const event = this.event();
    if (!event) return;

    this.errorMessage.set('');
    this.submitting.set(true);

    this.bookingsService
      .create({
        eventId: event.id,
        ticketTypeId: this.form.ticketTypeId,
        numberOfTickets: this.form.numberOfTickets,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (booking) => {
          this.booking.set(booking);
          this.step.set('done');
        },
        error: (error) => {
          //εάν για παράδειγμα άλλος πρόλαβε τα τελευταία εισιτήρια
          const backendMessage = error.error?.message;
          this.errorMessage.set(
            Array.isArray(backendMessage)
              ? backendMessage.join(', ')
              : backendMessage ?? 'Could not complete booking.',
          );
          this.step.set('form');
          this.loadEvent(event.id); //τρέχουσα ενημερωμένη διαθεσιμότητα
        },
      });
  }
}
