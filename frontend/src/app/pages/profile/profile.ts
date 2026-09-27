import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../auth/auth';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  constructor(
    public readonly auth: Auth,
    private readonly router: Router,
  ) {}

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }

  userId() {
    return this.auth.getUserId();
  }
}