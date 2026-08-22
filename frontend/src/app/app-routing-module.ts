import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UsersComponent } from './users-component/users-component';
import { UserDetailsComponent } from './user-details-component/user-details-component';
import { NotFoundComponent } from './not-found-component/not-found-component';
import { HomeComponent} from './home-component/home-component';
import {LoginComponent} from './login-component/login-component';
import {AuthGuard} from './auth/auth.guard';
import {RoleGuard} from './auth/role.guard';
import {ForbiddenComponent} from './forbidden-component/forbidden-component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [AuthGuard],
    children: [
      { path: ':id', component: UserDetailsComponent }
    ],
  },
  { path: 'forbidden', component: ForbiddenComponent },
  {
    path: 'admin/users',
    component: UsersComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['admin']
    }
  },
  { path: '**', component: NotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
