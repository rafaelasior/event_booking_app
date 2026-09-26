# Implementation Map

Σκοπός αυτού του αρχείου είναι να κρατάει σύντομο χάρτη της υλοποίησης, ώστε η ομάδα να μην χάνεται και να υπάρχει υλικό για το τελικό PDF report. Κρατάμε μόνο χρήσιμες σημειώσεις: τι υλοποιήθηκε, βασικές σχεδιαστικές αποφάσεις, παραδοχές, testing και επόμενα βήματα.

## Τρέχουσα Εικόνα

Η εφαρμογή είναι χωρισμένη σε:

- `backend`: NestJS API.
- `frontend`: Angular UI.
- `backend_backup` / `frontend_backup`: παλιός κώδικας αναφοράς, όχι ενεργό app.

Database source of truth:

- Χρησιμοποιούμε `backend/prisma/schema.prisma` και Prisma migrations.
- Τα παλιά χειροκίνητα `database/*.sql` αφαιρέθηκαν επειδή δεν είναι η κύρια πηγή αλήθειας.
- Η βάση είναι PostgreSQL μέσω Prisma.

Γενικές παραδοχές:

- Οι χρήστες εγκρίνονται από admin πριν μπορούν να κάνουν login κανονικά.
- Τα IDs που έρχονται από URL params/query params φτάνουν ως strings και μετατρέπονται σε numbers πριν δοθούν στην Prisma.
- Το backend είναι υπεύθυνο για security κανόνες, όχι μόνο το frontend.

## Backend Map

### AppModule

Status: implemented.

Αρχεία:

- `backend/src/app.module.ts`

Ρόλος:

- Κεντρικό module του NestJS backend.
- Συνδέει `UsersModule`, `AuthModule`, `EventsModule` και `PrismaModule`.

Σχεδιαστική απόφαση:

- Οι controllers/services των features δηλώνονται στα δικά τους modules. Το `AppModule` κρατά μόνο τη σύνδεση των modules.

### PrismaModule

Status: implemented.

Αρχεία:

- `backend/src/prisma/prisma.module.ts`
- `backend/src/prisma/prisma.service.ts`

Ρόλος:

- Παρέχει κοινό `PrismaService` στα backend services.
- Χρησιμοποιείται από users/auth/events και αργότερα bookings/messages.

Dependencies:

- `@prisma/client`
- `prisma`
- `@prisma/adapter-pg`
- `pg`

Σχεδιαστική απόφαση:

- Το Prisma είναι η μοναδική πηγή πρόσβασης στη βάση, αντί για χειροκίνητα SQL files.

### UsersModule

Status: backend foundation implemented.

Αρχεία:

- `backend/src/users/users.module.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.service.ts`
- `backend/src/users/dto/create-user.dto.ts`
- `backend/src/users/dto/update-user.dto.ts`
- `backend/src/users/dto/public-user.dto.ts`

Υλοποιήθηκαν:

- Δημιουργία user από register flow.
- Επιστροφή public user χωρίς `passwordHash`.
- Λίστα/λεπτομέρειες/ενημέρωση χρηστών.
- Soft delete με `active = false`.
- Admin approval/rejection μέσω `registrationStatus`.
- Εσωτερική αναζήτηση user για auth μέσω `findInternalByUsername`.

Σχεδιαστικές αποφάσεις:

- Δεν επιστρέφεται ποτέ `passwordHash` στο frontend.
- Η διαγραφή user γίνεται ως soft delete για να μην χαθούν σχέσεις με events/bookings/messages.
- Το login χρειάζεται internal method που βλέπει πλήρη user object, ενώ τα public endpoints επιστρέφουν sanitized DTO.

Validation / κανόνες:

- `CreateUserDto` ελέγχει email, password length, phone, AFM και required profile fields.
- `UpdateUserDto` περιορίζεται σε ασφαλή editable fields.

Testing:

- Register/login/approval flow δοκιμάστηκε runtime με πραγματική βάση.

Εκκρεμότητες:

- Καθαρισμός/ενημέρωση automated specs.

### AuthModule

Status: implemented and runtime-tested.

Αρχεία:

- `backend/src/auth/auth.module.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/dto/login.dto.ts`
- `backend/src/auth/jwt.payload.ts`
- `backend/src/auth/jwt.strategy.ts`
- `backend/src/auth/roles.decorator.ts`
- `backend/src/auth/roles.guard.ts`
- `backend/src/guards/jwt-auth/jwt-auth.guard.ts`

Υλοποιήθηκαν:

- `POST /auth/register`
- `POST /auth/login`
- Password hashing με `bcrypt`.
- JWT creation με payload `sub`, `username`, `roles`.
- JWT guard για protected endpoints.
- Roles decorator/guard για admin-only actions.

Σχεδιαστικές αποφάσεις:

- Το JWT secret είναι ένα server-side secret για υπογραφή/verification όλων των tokens, όχι ξεχωριστό μυστικό ανά χρήστη.
- Pending/rejected users δεν επιτρέπεται να κάνουν login.
- Τα roles μπαίνουν στο JWT για γρήγορο authorization στα protected endpoints.

Validation / κανόνες:

- Λάθος credentials επιστρέφουν `Unauthorized`.
- User με `registrationStatus !== APPROVED` δεν παίρνει token.
- Admin endpoints απαιτούν JWT και role `admin`.

Testing:

- Admin login με seed user δοκιμάστηκε με curl και επέστρεψε access token.
- Protected/admin endpoints δοκιμάστηκαν με/χωρίς token.

### EventsModule

Status: backend foundation implemented and curl-tested.

Αρχεία:

- `backend/src/events/events.module.ts`
- `backend/src/events/events.controller.ts`
- `backend/src/events/events.service.ts`
- `backend/src/events/dto/create-event.dto.ts`
- `backend/src/events/dto/update-event.dto.ts`
- `backend/src/events/dto/create-ticket-type.dto.ts`
- `backend/src/events/dto/update-ticket-type.dto.ts`
- `backend/src/events/dto/create-category.dto.ts`
- `backend/src/events/dto/set-event-categories.dto.ts`
- `backend/src/events/dto/create-photo.dto.ts`

Υλοποιήθηκαν:

- Event flow: create, list, details, update.
- Organizer dashboard endpoint: `GET /events/my`.
- Status actions: publish, cancel, delete-as-cancel.
- Public filters: `status`, `city`, `eventType`, `search`, `categoryId`.
- Ticket types: create, update, delete.
- Categories: list, admin create, assign to event.
- Photos: add/delete URL or path references.
- Default categories στο seed με `upsert`.

Κύρια endpoints:

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

Σχεδιαστικές αποφάσεις:

- Νέα events ξεκινούν ως `DRAFT`.
- Το `organizerId` δεν έρχεται από το request body, αλλά από το JWT του logged-in user.
- Το delete event δεν κάνει hard delete, αλλά αλλάζει status σε `CANCELLED`.
- Categories αποθηκεύονται στη βάση λόγω many-to-many σχέσης με events.
- Το `eventType` μένει string στο backend και θα ελέγχεται από frontend select/constants.
- Photos αποθηκεύονται προσωρινά ως `filePath` strings, όχι ως πραγματικό file upload.
- Ticket type `available` ξεκινά ίσο με `quantity`.

Validation / κανόνες:

- End date πρέπει να είναι μετά το start date.
- Capacity πρέπει να είναι τουλάχιστον 1 και όχι μικρότερο από reserved seats.
- Μόνο organizer/admin μπορεί να διαχειριστεί event, ticket types, categories και photos του event.
- Cancelled/completed events δεν επιτρέπεται να αλλάξουν.
- Completed event δεν μπορεί να ακυρωθεί.
- Ticket quantity δεν μπορεί να γίνει μικρότερο από ήδη reserved tickets.
- Category creation είναι admin-only.

Testing:

- Δοκιμάστηκαν με curl: create/list/details/update/publish/cancel/delete-as-cancel.
- Δοκιμάστηκαν filters για search, eventType, status, city και categoryId.
- Δοκιμάστηκαν ticket type create/update/delete.
- Δοκιμάστηκαν categories create/list/assign.
- Δοκιμάστηκαν photos add/delete.
- Δοκιμάστηκαν αρνητικά cases για invalid date και cancelled event update/publish.

Εκκρεμότητες:

- Καθαρισμός/ενημέρωση `events.service.spec.ts` και controller specs.
- Σύνδεση με Angular event list/detail/create/edit pages.
- Booking flow αργότερα θα χρησιμοποιήσει events και ticket types.

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
- Event deletion είναι cancellation μέσω `status = CANCELLED`.
- Event organizer είναι σχέση `Event.organizerId -> User.id`.
- Categories έχουν many-to-many σχέση με events μέσω `EventCategory`.
- Ticket types ανήκουν σε event και κρατούν `quantity` / `available` για μελλοντικό booking flow.
- Photos κρατούν path/URL reference, όχι binary files στη βάση.

Seed data:

- Admin user για testing/login.
- Default categories με `upsert`, ώστε να μη δημιουργούνται duplicates σε πολλαπλά seed runs.

## Frontend Map

Status: auth UI foundation implemented, events UI pending.

Αρχεία/περιοχές:

- `frontend/src/app/app.routes.ts`
- `frontend/src/app/app.html`
- `frontend/src/app/app.config.ts`
- `frontend/src/app/auth/auth.ts`
- `frontend/src/app/pages/welcome/*`
- `frontend/src/app/pages/login/*`
- `frontend/src/app/pages/register/*`
- `frontend/src/app/pages/admin/users/*` ή αντίστοιχη admin users περιοχή

Υλοποιήθηκαν:

- Welcome page.
- Login page.
- Register page.
- Basic routing.
- Auth service για `POST /auth/login` και `POST /auth/register`.
- JWT storage στο `localStorage`.
- Register success/error messages με Angular `signal` λόγω zoneless change detection.
- Register frontend validation σε βασικά πεδία.
- Admin users page για pending approvals/rejections υπάρχει/δουλεύει, αλλά θέλει UI polish.

Σχεδιαστικές αποφάσεις:

- Angular frontend δουλεύει με routes για κάθε βασική σελίδα.
- Το auth token αποθηκεύεται προσωρινά στο `localStorage`.
- Το frontend θα χρησιμοποιεί σταθερό select για `eventType` αντί για ξεχωριστό database table.
- Categories θα έρχονται από backend (`GET /events/categories`) επειδή είναι database entities.

Εκκρεμότητες frontend:

- Auth guard για protected pages.
- Redirect μετά το login ανάλογα με user/admin flow.
- JWT interceptor για protected requests, αν δεν έχει ολοκληρωθεί πλήρως.
- Event browsing page.
- Event detail page.
- Organizer my-events page.
- Create/edit event form με ticket types, categories και photo URLs.
- UI polish σε admin users page.

## Testing / Debug Checklist

Όταν κάτι δεν δουλεύει:

1. `npm run build`
2. Έλεγχος imports.
3. Έλεγχος ότι το module κάνει import το module που χρειάζεται.
4. Έλεγχος ότι το service είναι σε `providers`.
5. Έλεγχος ότι ό,τι χρησιμοποιείται από άλλο module είναι σε `exports`.
6. Έλεγχος `.env` για `DATABASE_URL`, `DIRECT_DATABASE_URL`, `JWT_SECRET`.
7. Έλεγχος Prisma generate/migrations/seed.
8. Runtime test με curl πριν συνδεθεί frontend.

## Γνωστά Θέματα / Εκκρεμότητες

- Τα generated specs/tests χρειάζονται update επειδή τα services πλέον έχουν dependencies όπως `PrismaService`.
- Υπάρχουν npm audit warnings που αποφασίστηκε να μείνουν προσωρινά μέχρι συζήτηση με την ομάδα.
- Το file upload δεν έχει υλοποιηθεί ακόμα. Προς το παρόν οι photos είναι URL/path strings.
- Bookings και messages δεν έχουν ολοκληρωθεί στο backend μέσα σε αυτό το map.

## Επόμενα Βήματα

1. Να ολοκληρωθεί/ελεγχθεί το seed για default categories.
2. Να γίνει update/cleanup των event specs αργότερα.
3. Να ξεκινήσει frontend events flow: list, details, my events, create/edit.
4. Να υλοποιηθεί booking backend και frontend flow.
5. Να συνεχιστεί παράλληλα το messages backend από άλλο μέλος της ομάδας.
