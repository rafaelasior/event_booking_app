import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminUsers, UserDetails } from '../../admin/admin-users';

@Component({
  selector: 'app-admin-user-details',
  imports: [RouterLink, DatePipe],
  templateUrl: './admin-user-details.html',
  styleUrl: './admin-user-details.css',
})
export class AdminUserDetails implements OnInit {
  user = signal<UserDetails | null>(null);
  errorMessage = signal('');
  busy = signal(false);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly adminUsers: AdminUsers,
  ) {}

  ngOnInit() {
    this.loadUser();
  }

  loadUser() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.adminUsers.getUser(id).subscribe({
      next: (user) => this.user.set(user),
      error: (error) => {
        if (error.status === 401) this.errorMessage.set('Please log in.');
        else if (error.status === 403) this.errorMessage.set('Admin access only.');
        else if (error.status === 400 || error.status === 404) this.errorMessage.set('User not found.');
        else this.errorMessage.set('Could not load user.');
      },
    });
  }

  changeStatus(action: 'approve' | 'reject') {
    const current = this.user();
    if (!current) return;

    this.busy.set(true);
    const request = action === 'approve'
      ? this.adminUsers.approve(current.id)
      : this.adminUsers.reject(current.id);

    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (updated) =>
        this.user.set({ ...current, registrationStatus: updated.registrationStatus }),
      error: () => this.errorMessage.set('Could not update user.'),
    });
  }
}