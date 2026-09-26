import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { Contact, Messages } from '../../messages/messages';

@Component({
  selector: 'app-message-compose',
  imports: [RouterLink, FormsModule],
  templateUrl: './message-compose.html',
  styleUrl: './message-compose.css',
})
export class MessageCompose implements OnInit {
  contacts = signal<Contact[]>([]);
  contactsLoaded = signal(false);
  errorMessage = signal('');
  sending = signal(false);

  form = {
    contactKey: '',
    subject: '',
    content: '',
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly messagesService: Messages,
  ) {}

  // Μία επαφή = ένας χρήστης σε ένα συγκεκριμένο event, π.χ. "3-1".
  contactKey(contact: Contact): string {
    return `${contact.user.id}-${contact.event.id}`;
  }

  ngOnInit() {
    // Από το Reply ή από σελίδα event: ?to=<userId>&event=<eventId>&subject=...
    const params = this.route.snapshot.queryParamMap;
    this.form.subject = params.get('subject') ?? '';

    this.messagesService.getContacts().subscribe({
      next: (contacts) => {
        const to = Number(params.get('to'));
        const event = Number(params.get('event'));
        const preselected = contacts.find(
          (c) => c.user.id === to && (!event || c.event.id === event),
        );

        if (preselected) {
          this.form.contactKey = this.contactKey(preselected);
        }

        this.contacts.set(contacts);
        this.contactsLoaded.set(true);
      },
      error: (error) => {
        if (error.status === 401) this.errorMessage.set('Please log in.');
        else this.errorMessage.set('Could not load contacts.');
      },
    });
  }

  submit(composeForm: NgForm) {
    this.errorMessage.set('');

    const contact = this.contacts().find((c) => this.contactKey(c) === this.form.contactKey);

    if (composeForm.invalid || !contact) {
      this.errorMessage.set('Please choose a recipient and fill in subject and message.');
      return;
    }

    this.sending.set(true);

    this.messagesService
      .send({
        receiverId: contact.user.id,
        eventId: contact.event.id,
        subject: this.form.subject,
        content: this.form.content,
      })
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/messages'], { queryParams: { box: 'sent' } }),
        error: (error) => {
          const backendMessage = error.error?.message;
          this.errorMessage.set(
            Array.isArray(backendMessage)
              ? backendMessage.join(', ')
              : backendMessage ?? 'Could not send message.',
          );
        },
      });
  }
}
