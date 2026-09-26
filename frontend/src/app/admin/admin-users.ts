import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Ίδια πεδία με το PublicUserDto του backend.
export type PublicUser = {
  id: number;
  username: string;
  email: string;
  roles: string[];
  registrationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
};

// έχει τα ίδια πεδία με το UserDetailsDto του backend.
export type UserDetails = PublicUser & {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  AFM: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

@Injectable({
  providedIn: 'root',
})
export class AdminUsers {
  private readonly apiUrl = 'http://localhost:3000/users';

  constructor(private readonly http: HttpClient) {}

  // GET /users
  getUsers(): Observable<PublicUser[]> {
    return this.http.get<PublicUser[]>(this.apiUrl);
  }

  // GET /users/:id
  getUser(id: number): Observable<UserDetails> {
    return this.http.get<UserDetails>(`${this.apiUrl}/${id}`);
  }

  // PATCH /users/:id/approve
  approve(id: number): Observable<PublicUser> {
    return this.http.patch<PublicUser>(`${this.apiUrl}/${id}/approve`, {});
  }

  // PATCH /users/:id/reject
  reject(id: number): Observable<PublicUser> {
    return this.http.patch<PublicUser>(`${this.apiUrl}/${id}/reject`, {});
  }
}
