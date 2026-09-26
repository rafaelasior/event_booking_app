import { Component, OnInit, signal, computed } from '@angular/core';
import { AdminUsers, PublicUser } from '../../admin/admin-users';
import { finalize } from 'rxjs';

const STATUS_ORDER: Record<PublicUser['registrationStatus'], number> = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
};

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
})
export class AdminUsersPage implements OnInit {
  users = signal<PublicUser[]>([]);
  errorMessage = signal('');
  busyId = signal<number | null>(null);

  sortedUsers = computed(() =>
    [...this.users()].sort(
      (a, b) =>
        STATUS_ORDER[a.registrationStatus] - STATUS_ORDER[b.registrationStatus] ||
        a.id - b.id,
    ),
  );

  constructor(private readonly adminUsers: AdminUsers) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.adminUsers.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: (error) => {
        if (error.status === 401) this.errorMessage.set('Please log in.');
        else if (error.status === 403) this.errorMessage.set('Admin access only.');
        else this.errorMessage.set('Could not load users.');
      },
    });
  }

 

  changeStatus(user: PublicUser, action: 'approve' | 'reject') {
    this.busyId.set(user.id);
    const request = action === 'approve'
      ? this.adminUsers.approve(user.id)
      : this.adminUsers.reject(user.id);

    request.pipe(finalize(() => this.busyId.set(null))).subscribe({
      next: (updated) =>
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u))),
      error: () => this.errorMessage.set('Could not update user.'),
    });
  }

}
