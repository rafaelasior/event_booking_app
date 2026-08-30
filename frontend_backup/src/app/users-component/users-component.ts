import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../model/User';
import {PublicUserDto} from '../model/public-user.dto';
import {UsersApiService} from '../users-api.service';
import {AuthService} from '../auth/auth.service';
import {Observable, of, switchMap} from 'rxjs';

@Component({
  selector: 'app-users-component',
  standalone: false,
  templateUrl: './users-component.html',
  styleUrl: './users-component.css',
})
export class UsersComponent {
  users$: Observable<PublicUserDto[]>;

  constructor(private usersApi: UsersApiService,
              private authService: AuthService) {
    this.users$ = this.authService.state$.pipe(
      switchMap(state =>
        state.authenticated
          ? this.usersApi.findAll()
          : of([])
      )
    );
  }
}
