import { Component, signal } from '@angular/core';
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

  message = signal('');
  errorMessage = signal('');
  errorMessages = signal<string[]>([]);

  

  submitRegister(isValid: boolean | null) {
    console.log('submit called, valid:', isValid);
    this.message.set('');
    this.errorMessage.set('');
    this.errorMessages.set([]);

    if (!isValid) {
      this.message.set('');
      this.errorMessage.set('Please fill all required fields correctly.');
      return;
    }

    this.auth.register(this.form).subscribe({
      next: () => {
        this.message.set('Registration submitted. Please wait for admin approval.');
        this.form = {
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
      },
      error: (error) => {
        console.error('register failed:', error);

        const backendMessage = error.error?.message;

       if (Array.isArray(backendMessage)) {
          this.errorMessages.set(backendMessage);
        } else if (typeof backendMessage === 'string') {
          this.errorMessage.set(backendMessage);
        } else {
          this.errorMessage.set('Registration failed. Please check your details.');
        }
      },
    });
  }


  
}
