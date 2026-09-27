import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Message, Messages } from '../../messages/messages';
import { Auth } from '../../auth/auth';
import { MessagesLink } from '../../shared/messages-link/messages-link';

type Box = 'inbox' | 'sent';

@Component({
  selector: 'app-messages',
  imports: [RouterLink, DatePipe, MessagesLink],
  templateUrl: './messages.html',
  styleUrl: './messages.css',
})
export class MessagesPage implements OnInit {
  box = signal<Box>('inbox');
  messages = signal<Message[]>([]);
  errorMessage = signal('');
  loading = signal(false);

  constructor(
    private readonly route: ActivatedRoute,
    protected readonly messagesService: Messages, // protected: το διαβάζει το template
    public readonly auth: Auth,
  ) {}

  ngOnInit() {
    // Κάθε φορά που αλλάζει το ?box= στο URL, φορτώνουμε την αντίστοιχη λίστα.
    this.route.queryParamMap.subscribe((params) => {
      this.box.set(params.get('box') === 'sent' ? 'sent' : 'inbox');
      this.load();
    });
  }

  logout() {
    this.auth.logout();
  }

  load() {
    this.errorMessage.set('');
    this.loading.set(true);

    const request = this.box() === 'inbox'
      ? this.messagesService.getInbox()
      : this.messagesService.getSent();

    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (messages) => this.messages.set(messages),
      error: (error) => {
        if (error.status === 401) this.errorMessage.set('Please log in.');
        else this.errorMessage.set('Could not load messages.');
      },
    });

    this.messagesService.refreshUnreadCount();
  }

  // Στα εισερχόμενα δείχνουμε τον αποστολέα, στα απεσταλμένα τον παραλήπτη.
  otherUser(message: Message) {
    return this.box() === 'inbox' ? message.sender : message.receiver;
  }

  remove(message: Message) {
    if (!confirm('Delete this message?')) return;

    this.messagesService.remove(message.id).subscribe({
      next: () => {
        this.messages.update((list) => list.filter((m) => m.id !== message.id));
        this.messagesService.refreshUnreadCount();
      },
      error: () => this.errorMessage.set('Could not delete message.'),
    });
  }
}
