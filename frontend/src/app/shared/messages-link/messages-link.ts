import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../auth/auth';
import { Messages } from '../../messages/messages';

@Component({
  selector: 'app-messages-link',
  imports: [RouterLink],
  templateUrl: './messages-link.html',
  styleUrl: './messages-link.css',
})
export class MessagesLink implements OnInit {
  constructor(
    public readonly messagesService: Messages,
    private readonly auth: Auth,
  ) {}

  // Σε κάθε σελίδα που εμφανίζεται η μπάρα, ξαναμετράμε τα αδιάβαστα.
  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.messagesService.refreshUnreadCount();
    }
  }
}
