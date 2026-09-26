import { HttpInterceptorFn } from '@angular/common/http';

// Προσθέτει το JWT σε κάθε HTTP request, αν υπάρχει token στο localStorage.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');

  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
