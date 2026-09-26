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

@Injectable({
  providedIn: 'root',
})
export class AdminUsers {
  private readonly apiUrl = 'http://localhost:3000/users';

  constructor(private readonly http: HttpClient) {}

  // GET /users?status=PENDING
  getPendingUsers(): Observable<PublicUser[]> {
    return this.http.get<PublicUser[]>(this.apiUrl, {
      params: { status: 'PENDING' },
    });
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
