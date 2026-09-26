import { Routes } from '@angular/router';
import { Welcome } from './pages/welcome/welcome';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { AdminUsersPage } from './pages/admin-users/admin-users';

export const routes: Routes = [
  { path: '', component: Welcome },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'admin/users', component: AdminUsersPage },
];