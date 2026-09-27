# Implementation Map

Σκοπός αυτού του αρχείου είναι να κρατάει σύντομο χάρτη της υλοποίησης, ώστε η ομάδα να μη χάνεται και να υπάρχει έτοιμο υλικό για το τελικό PDF report. Κρατάμε μόνο όσα βοηθούν: τι υλοποιήθηκε, βασικές σχεδιαστικές αποφάσεις, παραδοχές, testing και επόμενα βήματα.

## Τρέχουσα Εικόνα

Η εφαρμογή είναι χωρισμένη σε:

- `backend`: NestJS API.
- `frontend`: Angular UI.
- `backend_backup` / `frontend_backup`: παλιός κώδικας αναφοράς, όχι ενεργό app.

Database source of truth:

- Χρησιμοποιούμε `backend/prisma/schema.prisma` και Prisma migrations.
- Η βάση είναι PostgreSQL μέσω Prisma.
- Τα παλιά χειροκίνητα `database/*.sql` αφαιρέθηκαν επειδή δεν είναι η κύρια πηγή αλήθειας.

Γενικές παραδοχές:

- Οι χρήστες εγκρίνονται από admin πριν αποκτήσουν πλήρη πρόσβαση.
- Τα protected backend endpoints ελέγχουν JWT και δικαιώματα. Το frontend βοηθάει το UX, αλλά δεν θεωρείται security boundary.
- Τα IDs από URL params/query params φτάνουν ως strings και μετατρέπονται σε numbers πριν δοθούν στην Prisma.
- Τα photos αποθηκεύονται ως URL/path references, όχι ως binary upload.
- Για local development δεν υπάρχει SSL/TLS. Για τελική παρουσίαση/production θα πρέπει να χρησιμοποιηθεί HTTPS από hosting/reverse proxy.

## Backend Map

### AppModule / Prisma

Status: implemented.

Αρχεία:

- `backend/src/app.module.ts`
- `backend/src/prisma/prisma.module.ts`
- `backend/src/prisma/prisma.service.ts`

Ρόλος:

- Το `AppModule` συνδέει `UsersModule`, `AuthModule`, `EventsModule`, `BookingsModule`, `MessagesModule` και `PrismaModule`.
- Το `PrismaService` είναι η κοινή πρόσβαση στη βάση για όλα τα services.

Σχεδιαστική απόφαση:

- Κάθε feature έχει δικό του module/controller/service. Το `AppModule` κρατά μόνο τη σύνδεση των modules.
- Το Prisma είναι η μοναδική πηγή πρόσβασης στη βάση, αντί για χειροκίνητα SQL files.

### Users / Admin

Status: implemented and runtime-tested.

Αρχεία:

- `backend/src/users/*`
- `backend/src/users/dto/*`

Υλοποιήθηκαν:

- Δημιουργία user από register flow.
- Public user DTO χωρίς `passwordHash`.
- Λίστα/λεπτομέρειες/ενημέρωση χρηστών.
- Soft delete με `active = false`.
- Admin approval/rejection μέσω `registrationStatus`.
- Εσωτερική αναζήτηση user για auth μέσω `findInternalByUsername`.

Σχεδιαστικές αποφάσεις:

- Δεν επιστρέφεται ποτέ `passwordHash` στο frontend.
- Η διαγραφή user γίνεται ως soft delete για να μη χαθούν σχέσεις με events/bookings/messages.
- Το login χρησιμοποιεί internal method που βλέπει πλήρη user object, ενώ τα public endpoints επιστρέφουν sanitized DTO.

Validation / κανόνες:

- `CreateUserDto` ελέγχει email, password length, phone, AFM και required profile fields.
- Pending/rejected users δεν μπορούν να κάνουν login.

### Auth / Guards

Status: implemented and runtime-tested.

Αρχεία:

- `backend/src/auth/*`
- `backend/src/guards/jwt-auth/jwt-auth.guard.ts`

Υλοποιήθηκαν:

- `POST /auth/register`
- `POST /auth/login`
- Password hashing με `bcrypt`.
- JWT creation με payload `sub`, `username`, `roles`.
- JWT strategy/guard για protected endpoints.
- Roles decorator/guard για admin-only actions.

Σχεδιαστικές αποφάσεις:

- Το JWT secret είναι ένα server-side secret για υπογραφή/verification όλων των tokens, όχι ξεχωριστό μυστικό ανά χρήστη.
- Τα roles μπαίνουν στο JWT για authorization.
- Το frontend αποθηκεύει το access token στο `localStorage` για την τρέχουσα εργασία.
- Το token expiration ελέγχεται και στο frontend για καλύτερο UX όταν λήγει το token.

Testing:

- Admin login με seed user δοκιμάστηκε με curl και επέστρεψε access token.
- Protected endpoints δοκιμάστηκαν με/χωρίς token.

### Events

Status: backend implemented, frontend connected, build-tested.

Αρχεία:

- `backend/src/events/events.controller.ts`
- `backend/src/events/events.service.ts`
- `backend/src/events/dto/*`
- `frontend/src/app/events/events.ts`
- `frontend/src/app/pages/events/*`
- `frontend/src/app/pages/event-details/*`
- `frontend/src/app/pages/event-create/*`
- `frontend/src/app/pages/my-events/*`
- `frontend/src/app/pages/event-manage/*`
- `frontend/src/app/pages/event-bookings/*`

Backend endpoints:

- `POST /events`
- `GET /events`
- `GET /events/my`
- `GET /events/:id`
- `PATCH /events/:id`
- `PATCH /events/:id/publish`
- `PATCH /events/:id/cancel`
- `DELETE /events/:id`
- `POST /events/:id/ticket-types`
- `PATCH /events/:id/ticket-types/:ticketTypeId`
- `DELETE /events/:id/ticket-types/:ticketTypeId`
- `GET /events/categories`
- `POST /events/categories`
- `POST /events/:id/categories`
- `POST /events/:id/photos`
- `DELETE /events/:id/photos/:photoId`

Υλοποιήθηκαν:

- Event flow: create, list, details, update/manage.
- Public browsing με filters: `status`, `city`, `eventType`, `search`, `categoryId`.
- Organizer list μέσω `GET /events/my`.
- Status actions: publish, cancel, delete.
- Ticket types: create, update, delete.
- Categories: list, admin create, assign to event.
- Photos: add/delete URL or path references.
- OpenStreetMap/Nominatim geocoding στο create event με βάση `address + city + country`.
- Embedded OpenStreetMap preview σε create/details όταν υπάρχουν coordinates.
- Manage page για details, publish/cancel/delete, ticket types, categories και photos.
- My Events page ως organizer dashboard με `View`, `Manage`, `Bookings`.
- Event bookings page για να βλέπει ο organizer τις κρατήσεις συγκεκριμένου event.

Σχεδιαστικές αποφάσεις:

- Νέα events ξεκινούν ως `DRAFT`.
- Το `organizerId` δεν έρχεται από request body, αλλά από το JWT του logged-in user.
- Το `eventType` μένει string στο backend και ελέγχεται από frontend select/constants.
- Categories αποθηκεύονται στη βάση λόγω many-to-many σχέσης με events.
- Ticket type `available` ξεκινά ίσο με `quantity`.
- Το `CANCELLED` θεωρείται ιστορική/τελική κατάσταση για ακυρωμένη εκδήλωση. Δεν γίνεται ξανά publish μετά την ακύρωση.
- Το delete είναι hard delete μόνο όταν επιτρέπεται από τους κανόνες, όχι cancellation.

Validation / κανόνες:

- End date πρέπει να είναι μετά το start date.
- Capacity πρέπει να είναι θετικός αριθμός και όχι μικρότερο από reserved seats.
- Μόνο organizer/admin μπορεί να διαχειριστεί event, ticket types, categories και photos του event.
- Cancelled/completed events δεν επιτρέπεται να αλλάξουν.
- Publish απαιτεί τουλάχιστον ένα ticket type και συνολικό `ticketType.quantity` ίσο με `event.capacity`.
- Δημιουργία/update ticket type δεν επιτρέπει συνολικό quantity μεγαλύτερο από capacity.
- Update ticket type δεν μπορεί να μειώσει quantity κάτω από ήδη reserved tickets.
- Delete event δεν επιτρέπεται μετά την πρώτη κράτηση.
- Published events με κρατήσεις πρέπει να ακυρώνονται, όχι να διαγράφονται.
- Booking δεν επιτρέπεται σε cancelled/unpublished events.

Testing:

- Δοκιμάστηκαν με curl: create/list/details/update/publish/cancel/delete, filters, ticket types, categories και photos.
- Frontend build πέρασε μετά τη σύνδεση event pages.
- Manual frontend flow σε εξέλιξη: create event, geocoding/map, manage, publish/cancel/delete, my events, event bookings.

### Bookings

Status: backend implemented, frontend connected for booking and listings.

Αρχεία:

- `backend/src/bookings/*`
- `frontend/src/app/bookings/bookings.ts`
- `frontend/src/app/pages/book-event/*`
- `frontend/src/app/pages/my-bookings/*`
- `frontend/src/app/pages/event-bookings/*`

Backend endpoints:

- `POST /bookings`
- `GET /bookings/my`
- `GET /bookings/event/:eventId`

Υλοποιήθηκαν:

- Δημιουργία κράτησης από logged-in approved user.
- Λίστα κρατήσεων συμμετέχοντα.
- Λίστα κρατήσεων συγκεκριμένου event για organizer/admin.
- Transactional booking: μειώνεται `ticketType.available`, αυξάνεται `event.reservedSeats`, δημιουργείται booking.
- Total cost υπολογίζεται από DB price, όχι από client.

Σχεδιαστικές αποφάσεις:

- Booking επιτρέπεται μόνο για `PUBLISHED` event που δεν έχει ξεκινήσει.
- User δεν μπορεί να κάνει booking στο δικό του event.
- Η διαθεσιμότητα ελέγχεται στο update query ώστε δύο ταυτόχρονες κρατήσεις να μη δεσμεύσουν τα ίδια tickets.
- Δεν υλοποιήθηκε user-side cancel booking σε αυτό το στάδιο.

Frontend:

- Event details έχει `Book` για logged-in users και `Sign in to book` για guests.
- Αν guest πάει για booking, γίνεται redirect σε login με `returnUrl` ώστε μετά το login να επιστρέψει στο booking page.
- My bookings page εμφανίζει κρατήσεις χρήστη.
- Event bookings page εμφανίζει κρατήσεις ανά event για organizer.

### Messages

Status: implemented.

Αρχεία:

- `backend/src/messages/*`
- `frontend/src/app/messages/messages.ts`
- `frontend/src/app/pages/messages/*`
- `frontend/src/app/pages/message-compose/*`
- `frontend/src/app/pages/message-details/*`

Υλοποιήθηκαν:

- Backend messages module/controller/service.
- Frontend inbox/list, compose και details pages.
- Navigation προς messages από navbar.
- Messaging συνδέεται με logged-in users.

Σημείωση:

- Θέλει τελικό integration testing με πραγματικά bookings/events, ειδικά για organizer-attendee επικοινωνία και cancellation announcements.

## Database Map

Αρχείο:

- `backend/prisma/schema.prisma`

Βασικά μοντέλα:

- `User`
- `Event`
- `TicketType`
- `Category`
- `EventCategory`
- `Booking`
- `Photo`
- `Message`
- `EventView`

Enums:

- `RegistrationStatus`: `PENDING`, `APPROVED`, `REJECTED`
- `EventStatus`: `DRAFT`, `PUBLISHED`, `COMPLETED`, `CANCELLED`
- `BookingStatus`: `PENDING`, `CONFIRMED`, `CANCELLED`

Σχεδιαστικές αποφάσεις / παραδοχές:

- User deletion είναι soft delete μέσω `active = false`.
- Event organizer είναι σχέση `Event.organizerId -> User.id`.
- Categories έχουν many-to-many σχέση με events μέσω `EventCategory`.
- Ticket types ανήκουν σε event και κρατούν `quantity` / `available`.
- Photos κρατούν path/URL reference, όχι binary files στη βάση.

Seed data:

- Admin user για testing/login.
- Default categories με `upsert`, ώστε να μη δημιουργούνται duplicates σε πολλαπλά seed runs.
- Υπάρχει και messaging seed για testing μηνυμάτων.

## Frontend Map

Status: main flows implemented; polish/testing συνεχίζονται.

Κύριες περιοχές:

- `frontend/src/app/app.routes.ts`
- `frontend/src/app/app.config.ts`
- `frontend/src/app/auth/*`
- `frontend/src/app/events/events.ts`
- `frontend/src/app/bookings/bookings.ts`
- `frontend/src/app/messages/messages.ts`
- `frontend/src/app/pages/*`
- `frontend/src/styles.css`

Υλοποιήθηκαν:

- Welcome/main page με event browsing.
- Login/register με backend connection και messages.
- JWT storage και HTTP interceptor για `Authorization: Bearer`.
- Auth state με `signal`, token expiration check και logout όταν το token λήξει.
- Login redirect με `returnUrl`.
- Profile page με logout.
- Admin users list/details/approval UI.
- Events browsing page με search/filter UI.
- Event details page με map preview και booking CTA.
- Create event page με geocoding/map, ticket type builder και capacity validation στο frontend.
- My Events organizer dashboard.
- Event Manage page.
- Event Bookings page.
- My Bookings page.
- Messages pages.
- Shared palette/navbar/button styling στο `styles.css`.

Σχεδιαστικές αποφάσεις:

- Το welcome page και το events browsing είναι κοντά ως εμπειρία, αλλά υπάρχει και ξεχωριστό `/events` για logged-in και guest browsing.
- Το navbar αλλάζει ανάλογα με auth state: guest βλέπει sign in/register, logged-in user βλέπει profile/messages/bookings/my events.
- Το profile icon οδηγεί σε profile page, όπου γίνεται logout.
- Τα dangerous organizer actions βρίσκονται στο manage page, όχι απευθείας στο My Events.
- `Create event` δημιουργεί draft και μετά οδηγεί στο manage page για τελικό έλεγχο/publish.
- Geocoding χρησιμοποιεί address/city/country, όχι venue, επειδή venue names μπορεί να μπερδεύουν το OpenStreetMap.

Build / testing:

- Frontend `npm run build` πέρασε καθαρά.
- Component CSS budget warning λύθηκε αφαιρώντας duplicate navbar CSS από `event-manage.css`.
- Backend build πρέπει να τρέχει μετά από αλλαγές σε event publish/delete rules.

## Testing / Debug Checklist

Όταν κάτι δεν δουλεύει:

1. `npm run build` στο αντίστοιχο project (`frontend` ή `backend`).
2. Έλεγχος imports και route order.
3. Έλεγχος ότι το module κάνει import ό,τι χρειάζεται.
4. Έλεγχος ότι protected request στέλνει JWT μέσω interceptor.
5. Έλεγχος `.env` για `DATABASE_URL`, `DIRECT_DATABASE_URL`, `JWT_SECRET`.
6. Έλεγχος Prisma generate/migrations/seed.
7. Runtime test με curl πριν συνδεθεί frontend.
8. Manual browser test για auth expiration, redirects και protected pages.

## Γνωστά Θέματα / Εκκρεμότητες

- Τα generated specs/tests χρειάζονται update επειδή πολλά services έχουν dependencies όπως `PrismaService`.
- Υπάρχουν npm audit warnings που αποφασίστηκε να μείνουν προσωρινά μέχρι συζήτηση με την ομάδα.
- File upload δεν έχει υλοποιηθεί. Προς το παρόν οι photos είναι URL/path strings.
- SSL/TLS δεν έχει υλοποιηθεί τοπικά. Πρέπει να καλυφθεί σε deployment/report.
- Χρειάζεται τελικό end-to-end testing σε booking + event bookings + messaging.
- Θέλει τελικό cleanup των shared CSS ώστε να μειωθεί duplication σε pages.
- Admin export XML/JSON και recommendations πρέπει να αξιολογηθούν ως επόμενη προτεραιότητα.

## Επόμενα Βήματα

1. Backend build και manual test για publish rule: `sum(ticket quantities) === capacity`.
2. Manual test για My Events -> Bookings με πραγματική κράτηση.
3. Integration test booking flow: event details -> book -> my bookings -> organizer event bookings.
4. Test cancellation: event cancel -> bookings status/message behavior.
5. Update specs ή τουλάχιστον καταγραφή ότι τα generated specs είναι εκτός sync.
6. Admin exports XML/JSON.
7. Recommendations / proposed events section, αν προλάβουμε.
8. Τελικό report PDF με βάση αυτό το αρχείο.
