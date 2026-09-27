import { Routes } from '@angular/router';
import { Welcome } from './pages/welcome/welcome';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { AdminUsersPage } from './pages/admin-users/admin-users';
import { AdminUserDetails } from './pages/admin-user-details/admin-user-details';
import { MessagesPage } from './pages/messages/messages';
import { MessageDetails } from './pages/message-details/message-details';
import { MessageCompose } from './pages/message-compose/message-compose';
import { EventDetails } from './pages/event-details/event-details';
import { EventsPage } from './pages/events/events';
<<<<<<< HEAD
import { MyEvents } from './pages/my-events/my-events';
import { Profile } from './pages/profile/profile';
import { EventCreate } from './pages/event-create/event-create';
=======
import { BookEvent } from './pages/book-event/book-event';
import { MyBookings } from './pages/my-bookings/my-bookings';
>>>>>>> 7ea1cca (bookings (oles oi kratiseis enos xrhsth))


export const routes: Routes = [
  { path: '', component: Welcome },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'profile', component: Profile },
  { path: 'events', component: EventsPage },
  { path: 'events/create', component: EventCreate },
  { path: 'events/my', component: MyEvents },
  { path: 'events/:id', component: EventDetails },
  { path: 'admin/users', component: AdminUsersPage },
  { path: 'admin/users/:id', component: AdminUserDetails },
  { path: 'messages', component: MessagesPage },
  { path: 'messages/new', component: MessageCompose },   // ΠΡΙΝ από το :id
  { path: 'messages/:id', component: MessageDetails },
  { path: 'events/:id/book', component: BookEvent },
  { path: 'bookings', component: MyBookings },

];