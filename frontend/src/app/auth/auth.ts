import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';  // Angular/RxJS τρόπος για async HTTP response

type LoginRequest = {
  username: string;
  password: string;
};

type LoginResponse = {
  access_token: string;
};

type RegisterRequest = {
  username: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  firstName: string;
  lastName: string;
  phone: string;
  AFM: string;
  address: string;
  city: string;
  country: string;
};

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly apiUrl = 'https://localhost:3000/auth';
  private readonly loggedIn = signal(this.getToken() !== null);

  constructor(private readonly http: HttpClient) {}

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data);
  }

  register(data: RegisterRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  saveToken(token: string) {
    localStorage.setItem('access_token', token);
    this.loggedIn.set(true);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  logout() {
    localStorage.removeItem('access_token');
    this.loggedIn.set(false);
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.getTokenPayload(token);

    if (!payload?.exp) {
      return true;
    }

    return Date.now() >= payload.exp * 1000;
  }

  private getTokenPayload(token: string): { exp?: number; sub?: number; username?: string; roles?: string[] } | null {
    try {
      const payload = token.split('.')[1];
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(normalizedPayload));
    } catch {
      return null;
    }
  }

  // Ελέγχει αν ο χρήστης είναι συνδεδεμένος και αν το token δεν έχει λήξει.
  isLoggedIn() {
    const token = this.getToken();
    const loggedIn = this.loggedIn();

    if (!token || this.isTokenExpired(token)) {
      if (loggedIn) {
        this.logout();
      }

      return false;
    }

    return loggedIn;
  }
  // Διαβάζει το id του συνδεδεμένου χρήστη από το payload του JWT (πεδίο "sub").
  // Δεν ελέγχει την υπογραφή (αυτό το κάνει το backend) είναι μόνο για το UI.
  getUserId(): number | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      // JWT = header.payload.signature, κάθε κομμάτι σε base64url
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload)).sub ?? null;
    } catch {
      return null;
    }
  }

  getRoles(): string[] {
    const token = this.getToken();

    if (!token || !this.isLoggedIn()) {
      return [];
    }

    const payload = this.getTokenPayload(token);

    return payload?.roles ?? [];
  }

  isAdmin(): boolean {
    return this.getRoles().includes('admin');
  }

}