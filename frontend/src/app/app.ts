import { Component, signal } from '@angular/core';
import {User} from './model/User';
import {AuthService} from './auth/auth.service';
import {AuthState} from './auth/auth-state';
import {Observable} from 'rxjs';
import {Router} from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css',
})
export class App {

  title: string = 'Hello Project 1';

  authState$: Observable<AuthState>;

  constructor(public authService: AuthService,
              private router: Router) {
    this.authState$ = this.authService.state$;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
