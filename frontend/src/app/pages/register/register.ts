import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../auth/auth';

@Component({
  selector: 'app-register',
  imports: [RouterLink, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  form = {
    username: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    firstName: '',
    lastName: '',
    phone: '',
    AFM: '',
    address: '',
    city: '',
    country: '',
  };
  // Αυτό δημιουργεί ένα object στη μνήμη του component που θα κρατάει τις τιμές της φόρμας.
  constructor(private readonly auth: Auth) {}

  submitRegister() {
    this.auth.register(this.form).subscribe({   // sends http request to backend with the form data, .subscribe(...) λέει τι να γίνει όταν απαντήσει το backend
      next: (response) => {
        console.log('register success:', response);
      },
      error: (error) => {
        console.error('register failed:', error);
      },
    });
  }
}
