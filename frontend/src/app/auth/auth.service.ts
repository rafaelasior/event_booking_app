import { Injectable } from '@angular/core';
import {BehaviorSubject, map, Observable, tap} from 'rxjs';
import {AuthState} from './auth-state';
import {API_BASE_URL} from '../api.config';
import {HttpClient} from '@angular/common/http';
import {LoginDto} from './login.dto';
import {LoginResponseDto} from './login-response.dto';
import {JwtClaims} from './jwt-claims';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'access_token';
  private readonly loginUrl = `${API_BASE_URL}/auth/login`;

  private readState(): AuthState {
    const token = this.accessToken();
    if (!token) {
      return {
        authenticated: false,
        username: null,
        roles: []
      };
    }
    try {
      const payload = token.split('.')[1];
      const claims = JSON.parse(atob(payload)) as JwtClaims;
      const expired = claims.exp * 1000 <= Date.now();
      if (expired) {
        localStorage.removeItem(this.tokenKey);
        return {
          authenticated: false,
          username: null,
          roles: []
        };
      }
      return {
        authenticated: true,
        username: claims.username,
        roles: claims.roles
      };
    } catch {
      localStorage.removeItem(this.tokenKey);
      return {
        authenticated: false,
        username: null,
        roles: []
      };
    }
  }

  private readonly stateSubject = new BehaviorSubject<AuthState>(this.readState());

  readonly state$ = this.stateSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(dto: LoginDto): Observable<void> {
    return this.http.post<LoginResponseDto>(this.loginUrl, dto).pipe(
      tap(response => {
        localStorage.setItem(this.tokenKey, response.access_token);
        this.stateSubject.next(this.readState());
      }),
      map(() => void 0)
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.stateSubject.next(this.readState());
  }

  accessToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return this.stateSubject.value.authenticated;
  }
  hasRole(role: string): boolean {
    return this.stateSubject.value.roles.includes(role);
  }
}
