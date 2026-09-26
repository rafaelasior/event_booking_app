import { Component, OnInit, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Message, Messages } from '../../messages/messages';
import { Auth } from '../../auth/auth';

@Component({
  selector: 'app-message-details',
  imports: [RouterLink, DatePipe],
  templateUrl: './message-details.html',
  styleUrl: './message-details.css',
})
export class MessageDetails implements OnInit {
  message = signal<Message | null>(null);
  errorMessage = signal('');

  // true αν το έστειλα εγώ, false αν το έλαβα.
  isSentByMe = computed(() => this.message()?.senderId === this.auth.getUserId());

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly messagesService: Messages,
    private readonly auth: Auth,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.messagesService.getMessage(id).subscribe({
      next: (message) => {
        this.message.set(message);

        // Το άνοιξε ο παραλήπτης για πρώτη φορά, άρα γίνεται αναγνωσμένο.
        if (!this.isSentByMe() && !message.isRead) {
          this.messagesService.markAsRead(id).subscribe(() =>
            this.messagesService.refreshUnreadCount(),
          );
        }
      },
      error: (error) => {
        if (error.status === 401) this.errorMessage.set('Please log in.');
        else if (error.status === 400 || error.status === 404) this.errorMessage.set('Message not found.');
        else this.errorMessage.set('Could not load message.');
      },
    });
  }

  // Για να μη γίνεται "Re: Re: Re: ..." σε κάθε απάντηση.
  replySubject(message: Message): string {
    return message.subject.startsWith('Re: ') ? message.subject : `Re: ${message.subject}`;
  }

  remove() {
    const current = this.message();
    if (!current || !confirm('Delete this message?')) return;

    this.messagesService.remove(current.id).subscribe({
      next: () =>
        this.router.navigate(['/messages'], {
          queryParams: { box: this.isSentByMe() ? 'sent' : 'inbox' },
        }),
      error: () => this.errorMessage.set('Could not delete message.'),
    });
  }
}
