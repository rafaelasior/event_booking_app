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
- Τα photos αποθηκεύονται ως path/URL references στη βάση. Υπάρχει και image upload endpoint που αποθηκεύει αρχείο στο backend και κρατά το path.
- Για local development χρησιμοποιείται HTTPS με self-signed certificates από τον φάκελο `certs/`. Για production χρειάζεται κανονικό HTTPS από hosting/reverse proxy.

## Backend Map

### AppModule / Prisma

Status: implemented.

Αρχεία:

- `backend/src/app.module.ts`
- `backend/src/prisma/prisma.module.ts`
- `backend/src/prisma/prisma.service.ts`

Ρόλος:

- Το `AppModule` συνδέει `UsersModule`, `AuthModule`, `EventsModule`, `BookingsModule`, `MessagesModule`, `ExportsModule`, `RecommendationsModule` και `PrismaModule`.
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
- `POST /events/:id/photos/upload`
- `DELETE /events/:id/photos/:photoId`
- `POST /events/:id/view`

Υλοποιήθηκαν:

- Event flow: create, list, details, update/manage.
- Public browsing με filters: `status`, `city`, `eventType`, `search`, `categoryId`, `dateFrom`, `dateTo`, `minPrice`, `maxPrice`, μαζί με pagination.
- Organizer list μέσω `GET /events/my`.
- Status actions: publish, cancel, delete.
- Ticket types: create, update, delete.
- Categories: list, admin create, assign to event.
- Photos: add/delete URL/path references και image upload μέσω Multer.
- Event view tracking για logged-in users, ώστε να χρησιμοποιείται από το recommendation system.
- OpenStreetMap/Nominatim geocoding στο create event με βάση `address + city + country`.
- Embedded OpenStreetMap preview σε create/details όταν υπάρχουν coordinates.
- Manage page για details, publish/cancel/delete, ticket types, categories και photos.
- My Events page ως organizer dashboard με `View`, `Manage`, `Bookings`.
- Event bookings page για να βλέπει ο organizer τις κρατήσεις συγκεκριμένου event.
- Admin-only export buttons σε XML/JSON από το events page.
- Paginated browsing στο `/events` για πιο εύχρηστη πλοήγηση.

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
- Publish απαιτεί τουλάχιστον μία category, τουλάχιστον ένα ticket type και συνολικό `ticketType.quantity` ίσο με `event.capacity`.
- Δημιουργία/update ticket type δεν επιτρέπει συνολικό quantity μεγαλύτερο από capacity.
- Update ticket type δεν μπορεί να μειώσει quantity κάτω από ήδη reserved tickets.
- Delete event δεν επιτρέπεται μετά την πρώτη κράτηση.
- Published events με κρατήσεις πρέπει να ακυρώνονται, όχι να διαγράφονται.
- Booking δεν επιτρέπεται σε cancelled/unpublished events.

Testing:

- Δοκιμάστηκαν με curl: create/list/details/update/publish/cancel/delete, filters, ticket types, categories και photos.
- Δοκιμάστηκε event view recording ως input για recommendations.
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

### Exports

Status: implemented and frontend-connected.

Αρχεία:

- `backend/src/exports/*`
- `frontend/src/app/admin/admin-export.ts`
- `frontend/src/app/pages/events/*`

Υλοποιήθηκαν:

- Admin-only export για events σε XML και JSON.
- Τα export buttons εμφανίζονται στο `/events` μόνο για admin users.
- Το backend ελέγχει πραγματικά το admin role με `JwtAuthGuard` και `RolesGuard`, άρα το frontend visibility είναι μόνο UX.

Σχεδιαστική απόφαση:

- Τα exports τοποθετήθηκαν στο events page, επειδή αφορούν τα events συνολικά και όχι τη διαχείριση χρηστών.

### Recommendations

Status: implemented, tested, frontend-connected.

Αρχεία:

- `backend/src/recommendations/*`
- `backend/src/recommendations/train-recommender.ts`
- `backend/src/prisma/seed-recommender.ts`
- `frontend/src/app/recommendations/recommendations.ts`
- `frontend/src/app/pages/welcome/*`
- `frontend/src/app/pages/events/*`

Backend endpoints / scripts:

- `GET /recommendations`
- `POST /events/:id/view`
- `npm run prisma:recommender-seed`
- `npm run recommendations:train` (εκπαίδευση + αξιολόγηση)

Υλοποιήθηκαν:

- Biased Matrix Factorization από το μηδέν: `r̂ = μ + b_u + b_i + p_u·q_i`, εκπαίδευση με SGD και L2 regularization.
- Seed από το dataset του e-class: οι 300 εκδηλώσεις με τους περισσότερους χρήστες και οι χρήστες με τουλάχιστον 2 από αυτές γίνονται `User` (`ds_*`), `Event`, `Booking` (`yes`) και `EventView` (`maybe` / `interested`).
- Βαθμολογίες: μία ανά (χρήστη, εκδήλωση), η μέγιστη. Επίσκεψη 3, δεύτερη επίσκεψη 4, κράτηση 5.
- Negative sampling: σε κάθε εποχή 3 τυχαίες εκδηλώσεις που ο χρήστης δεν έχει αγγίξει, με βαθμό 1, για κάθε θετική.
- Εκπαίδευση στην εκκίνηση του server και κάθε 10 λεπτά. Το μοντέλο κρατιέται στη μνήμη και αποθηκεύεται στο `backend/private-data/recommendations/model.json`.
- Fold-in σε κάθε αίτημα: τα `b_u`, `p_u` του χρήστη υπολογίζονται από τις τωρινές κρατήσεις/επισκέψεις του, με σταθερά τα `b_i`, `q_i`.
- Αξιολόγηση leave-one-out (HR@10 έναντι δημοφιλίας και τυχαίας επιλογής, RMSE ανά εποχή).
- Frontend recommendations στην αρχική και Recommended mode στο `/events` page.

Σχεδιαστικές αποφάσεις / παραδοχές:

- Το dataset και το trained model δεν μπαίνουν στο git. Φυλάσσονται κάτω από `backend/private-data/`, που είναι ignored.
- Το dataset φορτώνεται στη βάση, ώστε οι χρήστες του και οι πραγματικοί χρήστες να είναι στον ίδιο πίνακα. Οι ημερομηνίες του (2012) μετατοπίζονται στο μέλλον.
- Τα `no`, `not_interested` και `invited` του dataset αγνοούνται. Τα αρνητικά προέρχονται από το negative sampling.
- Χρήστης χωρίς κρατήσεις: οι βαθμολογίες του προκύπτουν μόνο από τις επισκέψεις του, άρα και οι προτάσεις.
- Χρήστης χωρίς καμία αλληλεπίδραση: σειρά κατά `μ + b_i`. Χωρίς μοντέλο: κατά κρατημένες θέσεις.
- Εξαιρούνται events που δεν είναι published, έχουν περάσει, είναι του ίδιου του χρήστη, τα έχει ήδη δει/κλείσει ή είναι γεμάτα.
- Events χωρίς καμία αλληλεπίδραση δεν υπάρχουν στο μοντέλο και μπαίνουν στο τέλος.
- Παράμετροι: `k = 16`, `η = 0.02`, `λ = 0.05`, 60 εποχές, αρνητικά 3:1, 50 εποχές fold-in.

Testing:

- `npx jest recommendations`: 8 tests (βαθμολογίες, πτώση RMSE, χρήστης με κρατήσεις, χρήστης μόνο με επισκέψεις, χρήστης χωρίς αλληλεπιδράσεις, fallback χωρίς μοντέλο, εξαιρέσεις, controller).
- `npm run recommendations:train` με τα δεδομένα του seed (2612 interactions, 778 users): RMSE 1.36 → 0.63, HR@10 ~51% έναντι ~22% δημοφιλίας και ~3.5% τυχαίας επιλογής.

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
- Photos κρατούν path/URL reference στη βάση.
- `EventView` κρατάει user-event views για recommendations.

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
- Login redirect με `returnUrl`. Αν δεν υπάρχει `returnUrl`, ο admin οδηγείται στο `/admin/users`, ενώ οι απλοί χρήστες στο `/events`.
- Profile page με logout.
- Admin users list/details/approval UI.
- Events browsing page με search/filter UI και pagination.
- Event details page με map preview και booking CTA.
- Create event page με geocoding/map, ticket type builder και capacity validation στο frontend.
- My Events organizer dashboard.
- Event Manage page.
- Event Bookings page.
- My Bookings page.
- Messages pages.
- Recommendations στην αρχική και στο events page.
- Admin-only export buttons στο events page.
- Shared palette/navbar/button styling στο `styles.css`.

Σχεδιαστικές αποφάσεις:

- Το welcome page και το events browsing είναι κοντά ως εμπειρία, αλλά υπάρχει και ξεχωριστό `/events` για logged-in και guest browsing.
- Το navbar αλλάζει ανάλογα με auth state: guest βλέπει sign in/register, logged-in user βλέπει profile/messages/bookings/my events.
- Το profile icon οδηγεί σε profile page, όπου γίνεται logout.
- Τα dangerous organizer actions βρίσκονται στο manage page, όχι απευθείας στο My Events.
- `Create event` δημιουργεί draft και μετά οδηγεί στο manage page για τελικό έλεγχο/publish.
- Geocoding χρησιμοποιεί address/city/country, όχι venue, επειδή venue names μπορεί να μπερδεύουν το OpenStreetMap.
- Τα recommendations εμφανίζονται μόνο σε logged-in users, επειδή χρειάζονται προσωπικό user context.
- Event views καταγράφονται μόνο για logged-in users και όχι για τον organizer του event.

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
- File upload υπάρχει για event photos, αλλά θέλει τελικό browser testing μαζί με την προβολή εικόνων.
- SSL/TLS έχει υλοποιηθεί τοπικά με self-signed certificates. Για hosted deployment χρειάζεται κανονικό certificate/HTTPS configuration.
- Χρειάζεται τελικό end-to-end testing σε booking + event bookings + messaging.
- Θέλει τελικό cleanup των shared CSS ώστε να μειωθεί duplication σε pages.
- Recommendations υπάρχουν, αλλά η ποιότητά τους θα βελτιώνεται όσο αυξάνονται πραγματικά views/bookings στο app.

## Επόμενα Βήματα

1. Manual test για publish rule: category exists και `sum(ticket quantities) === capacity`.
2. Manual test για My Events -> Bookings με πραγματική κράτηση.
3. Integration test booking flow: event details -> book -> my bookings -> organizer event bookings.
4. Test cancellation: event cancel -> bookings status/message behavior.
5. Update specs ή τουλάχιστον καταγραφή ότι τα generated specs είναι εκτός sync.
6. Τελικό browser test για photo upload/display.
7. Τελικό browser test για recommendations στο welcome και events page.
8. Hosting/deployment με production HTTPS.
9. Τελικό report PDF με βάση αυτό το αρχείο.
