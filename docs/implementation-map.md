# Implementation Map

Αυτό το αρχείο κρατάει πρακτικό χάρτη της εφαρμογής: τι έχει υλοποιηθεί,
τι συνδέεται με τι, και ποιο είναι το επόμενο μικρό βήμα. Το ενημερώνουμε
όταν προσθέτουμε modules, endpoints, services ή σημαντικούς κανόνες.

## Τρέχουσα εικόνα

Η εφαρμογή είναι χωρισμένη σε:

- `backend`: NestJS API.
- `frontend`: Angular UI.
- `backend_backup` / `frontend_backup`: παλιός κώδικας αναφοράς, όχι ενεργό app.

Database source of truth:

- Χρησιμοποιούμε `backend/prisma/schema.prisma` και Prisma migrations.
- Τα παλιά χειροκίνητα `database/*.sql` αρχεία αφαιρέθηκαν επειδή δεν είναι
  η κύρια πηγή αλήθειας του project.

## Backend Map

### AppModule

Αρχείο: `backend/src/app.module.ts`

Σκοπός:

- Είναι το κεντρικό module του NestJS backend.
- Συνδέει τα feature modules της εφαρμογής.

Τρέχοντα modules:

- `UsersModule`
- `EventsModule`
- `PrismaModule`
- `AuthModule`

Σημείωση:

- Οι controllers των feature modules κανονικά δηλώνονται μέσα στα δικά τους
  modules. Το `AppModule` συνήθως κρατά μόνο `AppController`.

### PrismaModule

Αρχεία:

- `backend/src/prisma/prisma.module.ts`
- `backend/src/prisma/prisma.service.ts`

Σκοπός:

- Δίνει κοινή πρόσβαση στη βάση δεδομένων μέσω Prisma.
- Το `PrismaService` γίνεται injectable dependency για άλλα services.

Συνδέεται με:

- `UsersService`
- μελλοντικά `AuthService`
- μελλοντικά `EventsService`
- μελλοντικά `BookingsService`
- μελλοντικά `MessagesService`

Dependencies:

- `@prisma/client`
- `prisma`
- `@prisma/adapter-pg`
- `pg`

### UsersModule

Αρχεία:

- `backend/src/users/users.module.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.service.ts`
- `backend/src/users/dto/create-user.dto.ts`
- `backend/src/users/dto/update-user.dto.ts`
- `backend/src/users/dto/public-user.dto.ts`

Σκοπός:

- Διαχείριση χρηστών.
- Ανάγνωση χρηστών από τη βάση.
- Δημιουργία χρήστη από εσωτερική λογική register.
- Ενημέρωση χρήστη.
- Soft delete με `active: false`.
- Admin approval/rejection.

Συνδέεται με:

- `PrismaModule`, επειδή κάνει queries στη βάση.
- `AuthModule`, επειδή το auth χρειάζεται `UsersService`.

Υλοποιημένα στο `UsersService`:

- `toPublicUser(user)`: αφαιρεί ευαίσθητα πεδία όπως `passwordHash`.
- `handlePrismaError(error)`: μετατρέπει Prisma errors σε NestJS HTTP errors.
- `create(createUserDto, passwordHash)`: δημιουργεί χρήστη με hashed password.
- `findAll()`: επιστρέφει όλους τους ενεργούς χρήστες.
- `findOne(id)`: επιστρέφει έναν ενεργό χρήστη ή 404.
- `update(id, updateUserDto)`: ενημερώνει χρήστη.
- `remove(id)`: κάνει soft delete με `active: false`.
- `approve(id)`: αλλάζει `registrationStatus` σε `APPROVED`.
- `reject(id)`: αλλάζει `registrationStatus` σε `REJECTED`.
- `findInternalByUsername(username)`: βρίσκει πλήρη user για εσωτερική χρήση από auth.

Γιατί υπάρχει το `findInternalByUsername`:

- Το login χρειάζεται το `passwordHash` από τη βάση.
- Τα public methods δεν πρέπει να επιστρέφουν `passwordHash`.
- Άρα αυτή η μέθοδος είναι μόνο για backend services, όχι για frontend endpoint.

### AuthModule

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

Σκοπός:

- Register νέου χρήστη.
- Login με username/password.
- Δημιουργία JWT.
- Έλεγχος προστατευμένων routes με JWT.
- Έλεγχος admin/user roles.

Υλοποιημένα endpoints:

- `POST /auth/register`
- `POST /auth/login`

Συνδέεται με:

- `UsersService`, για δημιουργία και εύρεση χρηστών.
- `JwtService`, για υπογραφή JWT.

Υλοποιημένα στο `AuthService`:

- `validateUser(username, password)`: βρίσκει user με username και ελέγχει
  password με `bcrypt.compare`.
- Αν ο user δεν υπάρχει ή το password είναι λάθος, επιστρέφει `Unauthorized`.
- Αν ο user δεν είναι `APPROVED`, δεν του επιτρέπει login.
- `login(username, password)`: φτιάχνει JWT με `sub`, `username`, `roles`.
- `register(createUserDto)`: ελέγχει password confirmation, κάνει hash το
  password και δημιουργεί user μέσω `UsersService.create`.

Υλοποιημένα στο `AuthController`:

- `POST /auth/login`: δέχεται `LoginDto` και επιστρέφει access token.
- `POST /auth/register`: δέχεται `CreateUserDto` και δημιουργεί pending user.

Υλοποιημένα για JWT:

- `JwtPayload`: ορίζει τι μπαίνει μέσα στο token.
- `JwtStrategy`: διαβάζει `Authorization: Bearer <token>` και γεμίζει
  `request.user` με `userId`, `username`, `roles`.
- `JwtAuthGuard`: προστατεύει endpoints που απαιτούν valid JWT.

Υλοποιημένα για roles/admin authorization:

- `Roles` decorator: δηλώνει ποια roles χρειάζεται ένα endpoint.
- `RolesGuard`: διαβάζει το `@Roles(...)` metadata και ελέγχει
  `request.user.roles`.
- `GET /users`: προστατεύεται με JWT και απαιτεί role `admin`.
- `PATCH /users/:id/approve`: προστατεύεται με JWT και απαιτεί role `admin`.
- `PATCH /users/:id/reject`: προστατεύεται με JWT και απαιτεί role `admin`.

Τι χρειάζεται ακόμα για verification:

- Runtime test με πραγματική βάση.
- Register νέου user και επιβεβαίωση ότι γίνεται `PENDING`.
- Login pending/rejected user και επιβεβαίωση ότι κόβεται.
- Login approved/admin user και επιβεβαίωση ότι επιστρέφει JWT.
- Κλήση admin endpoints με/χωρίς admin token.

### EventsModule

Αρχεία:

- `backend/src/events/events.module.ts`
- `backend/src/events/events.controller.ts`
- `backend/src/events/events.service.ts`
- `backend/src/events/dto/create-event.dto.ts`
- `backend/src/events/dto/update-event.dto.ts`
- `backend/src/events/entities/event.entity.ts`

Τρέχουσα κατάσταση:

- Έχει δημιουργηθεί skeleton με NestJS generator.
- Δεν πρέπει να είναι το κύριο focus πριν ολοκληρωθεί auth/users.

Μελλοντικά:

- Create draft event.
- Publish event.
- List/search published events.
- Organizer event management.
- Ticket types.
- Capacity validation.
- Cancel/delete rules.

## Database Map

Αρχείο: `backend/prisma/schema.prisma`

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

Σημαντικοί κανόνες:

- Νέος user ξεκινά με `registrationStatus = PENDING`.
- Δεν επιστρέφουμε ποτέ `passwordHash` στο frontend.
- Διαγραφή user γίνεται ως soft delete με `active = false`.
- Events συνδέονται με organizer μέσω `organizerId`.
- Bookings συνδέονται με event, ticket type και attendee.

## Frontend Map

Τρέχουσα κατάσταση:

- Angular project υπάρχει.
- Δεν υπάρχει ακόμα πραγματικό UI της εργασίας.
- Τα routes είναι ακόμα άδεια.

Μελλοντική σειρά:

1. Welcome page.
2. Register page.
3. Login page.
4. Auth service που καλεί backend.
5. JWT storage/interceptor.
6. Admin users page.
7. Event browsing/management pages.

## Επόμενο Μικρό Βήμα

Verification του backend authentication/authorization:

1. Κάνουμε `npm run build`.
2. Βεβαιωνόμαστε ότι υπάρχει σωστό `.env` με `DIRECT_DATABASE_URL` και `JWT_SECRET`.
3. Τρέχουμε migrations/seed αν χρειάζεται.
4. Ξεκινάμε backend με `npm run start:dev`.
5. Τεστάρουμε register/login/approve με curl.
6. Μετά περνάμε στο πρώτο πραγματικό `EventsService` implementation.

## Debug Checklist

Όταν κάτι δεν δουλεύει:

1. `npm run build`
2. Έλεγχος imports.
3. Έλεγχος ότι το module κάνει import το module που χρειάζεται.
4. Έλεγχος ότι το service είναι σε `providers`.
5. Έλεγχος ότι ό,τι χρησιμοποιείται από άλλο module είναι σε `exports`.
6. Έλεγχος `.env` για `DATABASE_URL`, `DIRECT_DATABASE_URL`, `JWT_SECRET`.
7. Έλεγχος Prisma generate/migrations.
