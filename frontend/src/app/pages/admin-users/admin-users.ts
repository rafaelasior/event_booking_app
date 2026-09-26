import { Component, OnInit, signal } from '@angular/core';
import { AdminUsers, PublicUser } from '../../admin/admin-users';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
})
export class AdminUsersPage implements OnInit {
  users = signal<PublicUser[]>([]);
  errorMessage = signal('');

  constructor(private readonly adminUsers: AdminUsers) {}

  ngOnInit() {
    this.loadPending();
  }

  loadPending() {
    this.adminUsers.getPendingUsers().subscribe({
      next: (users) => this.users.set(users),
      error: (error) => {
        if (error.status === 401) this.errorMessage.set('Please log in.');
        else if (error.status === 403) this.errorMessage.set('Admin access only.');
        else this.errorMessage.set('Could not load users.');
      },
    });
  }
}
