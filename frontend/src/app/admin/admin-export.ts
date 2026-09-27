import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ExportFormat = 'xml' | 'json';

@Injectable({
  providedIn: 'root',
})
export class AdminExport {
  private readonly apiUrl = 'http://localhost:3000/exports';

  constructor(private readonly http: HttpClient) {}

  //GET /exports/events.xml ή /exports/events.json
  //Blob και όχι απλό link, ώστε ο interceptor να βάλει το token.
  download(format: ExportFormat): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/events.${format}`, { responseType: 'blob' });
  }
}
