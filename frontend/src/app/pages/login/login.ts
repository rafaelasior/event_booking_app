import { Component } from '@angular/core';
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

  submitLogin() {
    this.auth.login(this.form).subscribe({
      next: (response) => {
        this.auth.saveToken(response.access_token);
        console.log('login success:', response);
      },
      error: (error) => {
        console.error('login failed:', error);
      },
    });
  }
}
