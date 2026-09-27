import { Component, OnInit} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../auth/auth';
import { MessagesLink } from '../../shared/messages-link/messages-link';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, MessagesLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  constructor(
    public readonly auth: Auth,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
        this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/profile' },
        });
        return;
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }

  userId() {
    return this.auth.getUserId();
  }
}