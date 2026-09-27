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
  private readonly apiUrl = 'http://localhost:3000/auth';
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

  isLoggedIn(): boolean {
    return this.getToken() !== null;
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

}