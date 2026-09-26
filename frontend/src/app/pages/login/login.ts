import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../auth/auth';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  form = {
    username: '',
    password: '',
  };
  constructor(private readonly auth: Auth) {}

  errorMessage= signal('');

  submitLogin() {

    this.auth.logout();  // σβήνει το token του προηγούμενου χρήστη
    this.errorMessage.set('');

    this.auth.login(this.form).subscribe({
      next: (response) => {
        this.auth.saveToken(response.access_token);
      },
      error: (error) => {
        const backendMessage = error.error?.message;
        this.errorMessage.set(
          Array.isArray(backendMessage)
            ? backendMessage.join(', ')
            : backendMessage ?? 'Login failed.',
        );
      },
    });
  }
}
