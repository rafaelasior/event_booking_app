import { Routes } from '@angular/router';
import { Welcome } from './pages/welcome/welcome';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { AdminUsersPage } from './pages/admin-users/admin-users';
import { AdminUserDetails } from './pages/admin-user-details/admin-user-details';

export const routes: Routes = [
  { path: '', component: Welcome },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'admin/users', component: AdminUsersPage },
  { path: 'admin/users/:id', component: AdminUserDetails },
];