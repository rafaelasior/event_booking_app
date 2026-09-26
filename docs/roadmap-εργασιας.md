# Roadmap ολοκλήρωσης εργασίας

Η εργασία ζητά να φτιάξεις μια πλήρη web εφαρμογή για **διαχείριση εκδηλώσεων και ηλεκτρονικές κρατήσεις**.

## Βασικές λειτουργίες που πρέπει να έχει

1. **Χρήστες και ρόλοι**
   - Επισκέπτης: βλέπει και αναζητά εκδηλώσεις, χωρίς κράτηση.
   - Συμμετέχων: κάνει κρατήσεις και επικοινωνεί με διοργανωτές.
   - Διοργανωτής: δημιουργεί και διαχειρίζεται εκδηλώσεις.
   - Διαχειριστής: εγκρίνει ή απορρίπτει εγγραφές χρηστών και κάνει export δεδομένων.

2. **Εγγραφή και σύνδεση**
   - Εγγραφή με username, password, όνομα, email, τηλέφωνο, διεύθυνση, τοποθεσία και ΑΦΜ.
   - Έγκριση νέου χρήστη από διαχειριστή.
   - JWT authentication και authorization ανά ρόλο.
   - Passwords αποθηκευμένα μόνο ως hashes.
   - Επικοινωνία μέσω SSL/TLS.

3. **Εκδηλώσεις**
   - Τίτλος, κατηγορίες, τύπος, χώρος, διεύθυνση, πόλη, χώρα.
   - Ημερομηνία έναρξης/λήξης και γεωγραφικές συντεταγμένες.
   - Χωρητικότητα και τύποι εισιτηρίων.
   - Καταστάσεις `DRAFT`, `PUBLISHED`, `COMPLETED`, `CANCELLED`.
   - Προαιρετικές φωτογραφίες.
   - Ο διοργανωτής μπορεί να δημιουργεί, τροποποιεί, δημοσιεύει, ακυρώνει ή διαγράφει εκδηλώσεις με τους συγκεκριμένους περιορισμούς.

4. **Κρατήσεις**
   - Επιλογή τύπου και ποσότητας εισιτηρίων.
   - Έλεγχος διαθέσιμων θέσεων και συνολικής χωρητικότητας.
   - Υπολογισμός συνολικού κόστους.
   - Επιβεβαίωση πριν την οριστική υποβολή.
   - Ενημέρωση διαθεσιμότητας μετά την κράτηση.
   - Ασφαλές transaction ώστε να μην προκύπτουν διπλές/υπεράριθμες κρατήσεις.

5. **Αναζήτηση**
   - Με βάση κατηγορία, τίτλο, περιγραφή, ημερομηνίες, τιμή και τοποθεσία.
   - Αποτελέσματα σε πίνακα με pagination.
   - Λεπτομέρειες εκδήλωσης με χάρτη OpenStreetMap.

6. **Messaging**
   - Επικοινωνία διοργανωτή και συμμετέχοντα μόνο όταν υπάρχει κράτηση.
   - Εισερχόμενα, απεσταλμένα, unread μηνύματα και διαγραφή.
   - Μαζικό μήνυμα στους συμμετέχοντες όταν ακυρώνεται εκδήλωση.

7. **Export και συστάσεις**
   - Ο διαχειριστής εξάγει όλες τις εκδηλώσεις σε XML σύμφωνα με το DTD της εκφώνησης και σε JSON.
   - Πρέπει να υλοποιηθεί από το μηδέν αλγόριθμος **Biased Matrix Factorization** για προτεινόμενες εκδηλώσεις, με βάση κρατήσεις και επισκέψεις χρηστών.

8. **Παραδοτέα**
   - `.zip` με τον πηγαίο κώδικα.
   - PDF τεκμηρίωσης με εξώφυλλο, περιεχόμενα, σχεδιαστικές αποφάσεις, εγκατάσταση, εκτέλεση, δυσκολίες και επίλογο.

## Τωρινή κατάσταση

Υπάρχουν ήδη:

- NestJS backend.
- Angular frontend.
- PostgreSQL με Prisma.
- Μοντέλο `User`.
- Login με JWT.
- Hashing passwords με `bcrypt`.
- Βασικό `JwtAuthGuard`.
- Βασικός `RolesGuard`.
- Seed με admin και απλό user.
- Αναλυτικό checklist στο [docs/requirements.md](docs/requirements.md).

Χρειάζονται σχεδόν όλα τα υπόλοιπα: εγγραφή, έγκριση χρηστών, εκδηλώσεις, εισιτήρια, κρατήσεις, messaging, exports, recommender και πλήρες frontend.

# Roadmap

Η σωστή στρατηγική είναι να ολοκληρώσεις την εργασία **σε μικρά λειτουργικά κομμάτια**. Αυτή τη στιγμή υπάρχει μόνο ένας βασικός σκελετός με χρήστες, login, JWT και Angular.

## Βήμα 0: Να λειτουργήσεις το υπάρχον project

Πρώτα πρέπει να βεβαιωθείς ότι μπορείς να το εκτελέσεις.

Στο backend:

```bash
cd backend
npm install  εγκαθαθιστά τα dependencies του project
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

Στο frontend, σε δεύτερο terminal:

```bash
cd frontend
npm install
npm start
```

Έλεγξε:

- ανοίγει το Angular app,
- λειτουργεί το login,
- λειτουργεί το backend,
- μπορείς να συνδεθείς με τα seed credentials,
- η βάση PostgreSQL είναι διαθέσιμη.

Μην προχωρήσεις αν δεν λειτουργεί αυτό το βασικό σενάριο.

## Βήμα 1: Ολοκλήρωσε πρώτα authentication και χρήστες

Το υπάρχον [schema.prisma](backend/prisma/schema.prisma) έχει μόνο:

```text
id, username, email, passwordHash, roles, active
```

Πρόσθεσε στον χρήστη:

- `firstName`
- `lastName`
- `phone`
- `address`
- `city`
- `country`
- `latitude`
- `longitude`
- `taxNumber`
- `registrationStatus`

Το `registrationStatus` μπορεί να έχει:

```text
PENDING
APPROVED
REJECTED
```

Μετά:

```bash
npx prisma migrate dev --name user-registration-fields
npx prisma generate
```

Υλοποίησε:

1. `POST /auth/register`
2. έλεγχο duplicate username/email,
3. έλεγχο password confirmation,
4. δημιουργία χρήστη με `PENDING`,
5. μήνυμα ότι απαιτείται έγκριση,
6. απαγόρευση login σε `PENDING` ή `REJECTED`,
7. login μόνο σε `APPROVED`.

Σήμερα η μέθοδος `create()` στο [users.service.ts](backend/src/users/users.service.ts) είναι `NotImplementedException`. Εκεί πρέπει να προστεθεί η πραγματική λογική εγγραφής.

## Βήμα 2: Κάνε πραγματικό το admin authorization

Στο [users.controller.ts](backend/src/users/users.controller.ts) τα admin guards είναι σχολιασμένα. Πρέπει να ενεργοποιηθούν.

Ο administrator πρέπει να μπορεί:

- να βλέπει όλους τους χρήστες,
- να βλέπει λεπτομέρειες χρήστη,
- να εγκρίνει χρήστη,
- να απορρίπτει χρήστη.

Πρόσθεσε endpoints όπως:

```text
GET    /users
GET    /users/:id
PATCH  /users/:id/approve
PATCH  /users/:id/reject
```

Τα endpoints αυτά πρέπει να είναι διαθέσιμα μόνο σε χρήστη με ρόλο `admin`.

Έλεγξε επίσης ότι:

- απλός χρήστης δεν μπορεί να δει τη λίστα χρηστών,
- συμμετέχων δεν μπορεί να καλέσει admin endpoints,
- το backend ελέγχει τον ρόλο και δεν βασίζεται στο frontend.

## Βήμα 3: Σχεδίασε ολόκληρη τη βάση

Πριν γράψεις controllers, πρόσθεσε τα βασικά μοντέλα στο Prisma schema.

Προτεινόμενα μοντέλα:

```text
Event
Category
EventCategory
TicketType
Booking
Message
EventView
Photo
```

### `Event`

Πεδία:

```text
id
title
eventType
venue
address
city
country
latitude
longitude
startDateTime
endDateTime
capacity
reservedSeats
status
description
organizerId
createdAt
updatedAt
```

### `Category`

```text
id
name
```

### `EventCategory`

Σύνδεση πολλών-προς-πολλά μεταξύ event και category.

### `TicketType`

```text
id
eventId
name
price
quantity
available
```

### `Booking`

```text
id
eventId
ticketTypeId
attendeeId
time
numberOfTickets
totalCost
status
```

### `Message`

```text
id
senderId
receiverId
eventId
bookingId
subject
content
isRead
deletedBySender
deletedByReceiver
createdAt
```

### `EventView`

Απαραίτητο για το recommender:

```text
id
userId
eventId
viewedAt
```

### `Photo`

```text
id
eventId
filePath
```

Πρόσθεσε indexes σε:

- event status,
- event start date,
- event city,
- event title,
- booking event,
- booking attendee.

Μετά δημιούργησε migration:

```bash
npx prisma migrate dev --name events-bookings-messages
npx prisma generate
```

## Βήμα 4: Υλοποίησε τη διαχείριση εκδηλώσεων στο backend

Δημιούργησε νέο NestJS module:

```text
backend/src/events/
  events.module.ts
  events.controller.ts
  events.service.ts
  dto/
  entities/
```

Χρειάζεσαι endpoints:

```text
POST   /events
GET    /events
GET    /events/:id
PATCH  /events/:id
DELETE /events/:id
PATCH  /events/:id/publish
PATCH  /events/:id/cancel
GET    /events/my-events
GET    /events/:id/bookings
```

Στο service υλοποίησε:

- δημιουργία draft,
- δημοσίευση,
- επεξεργασία,
- ακύρωση,
- διαγραφή,
- λίστα εκδηλώσεων διοργανωτή,
- έλεγχο ότι ο διοργανωτής επεξεργάζεται μόνο δικές του εκδηλώσεις.

Οι βασικοί κανόνες είναι:

- `EndDateTime >= StartDateTime`,
- `capacity > 0`,
- τουλάχιστον μία κατηγορία,
- τουλάχιστον ένας τύπος εισιτηρίου,
- οι ποσότητες εισιτηρίων είναι θετικές,
- το άθροισμα των ticket quantities δεν υπερβαίνει την capacity,
- διαγραφή μόνο πριν από την πρώτη κράτηση,
- ακύρωση χωρίς διαγραφή δεδομένων,
- ακυρωμένη εκδήλωση δεν δέχεται κρατήσεις.

## Βήμα 5: Φτιάξε πρώτα το frontend του διοργανωτή

Στο Angular πρόσθεσε:

```text
events-list
event-create
event-edit
event-details
my-events
```

Πρώτα υλοποίησε μόνο:

1. δημιουργία draft,
2. εμφάνιση δικών μου εκδηλώσεων,
3. επεξεργασία,
4. publish,
5. cancel,
6. delete.

Μην ξεκινήσεις ακόμα με όμορφο design. Προτεραιότητα έχει να λειτουργεί σωστά η ροή.

Πρόσθεσε routes όπως:

```text
/events
/events/new
/events/:id
/events/:id/edit
/my-events
```

Το `AuthInterceptor` πρέπει να στέλνει το JWT σε κάθε προστατευμένο request.

## Βήμα 6: Υλοποίησε αναζήτηση και δημόσια προβολή

Πρόσθεσε backend query parameters:

```text
GET /events?page=1&limit=10
GET /events?title=music
GET /events?category=music
GET /events?city=Athens
GET /events?fromDate=...
GET /events?toDate=...
GET /events?minPrice=...
GET /events?maxPrice=...
```

Τα αποτελέσματα πρέπει να περιλαμβάνουν μόνο δημοσιευμένες και ενεργές εκδηλώσεις.

Στο frontend φτιάξε:

- φόρμα φίλτρων,
- πίνακα αποτελεσμάτων,
- pagination,
- σελίδα λεπτομερειών,
- εμφάνιση ticket types,
- εμφάνιση φωτογραφιών,
- κουμπί κράτησης μόνο όπου επιτρέπεται.

Για OpenStreetMap μπορείς να χρησιμοποιήσεις Leaflet:

```bash
cd frontend
npm install leaflet
npm install -D @types/leaflet
```

Στη σελίδα λεπτομερειών εμφανίζεις marker από `latitude` και `longitude`.

## Βήμα 7: Υλοποίησε κρατήσεις με transaction

Δημιούργησε:

```text
backend/src/bookings/
  bookings.module.ts
  bookings.controller.ts
  bookings.service.ts
  dto/
```

Endpoints:

```text
POST /bookings
GET  /bookings/my-bookings
GET  /events/:id/bookings
```

Η δημιουργία κράτησης πρέπει να γίνεται μέσα σε Prisma transaction.

Η λογική είναι:

1. βρίσκεις event και ticket type,
2. ελέγχεις ότι το event είναι `PUBLISHED`,
3. ελέγχεις ότι δεν είναι `CANCELLED`,
4. ελέγχεις ότι η ποσότητα είναι θετική,
5. ελέγχεις ότι υπάρχει διαθέσιμο υπόλοιπο,
6. υπολογίζεις `totalCost`,
7. δημιουργείς booking,
8. μειώνεις το `available`,
9. αυξάνεις το `reservedSeats`.

Τα βήματα 7 και 8 πρέπει να ολοκληρώνονται μαζί. Αν αποτύχει ένα, πρέπει να αποτύχουν όλα.

Έλεγξε οπωσδήποτε:

- κράτηση περισσότερων εισιτηρίων από τα διαθέσιμα,
- κράτηση σε cancelled event,
- κράτηση με μηδενική ποσότητα,
- δύο ταυτόχρονες κρατήσεις.

## Βήμα 8: Πρόσθεσε confirmation στο frontend

Στη σελίδα κράτησης εμφάνισε:

- τύπο εισιτηρίου,
- ποσότητα,
- τιμή,
- συνολικό κόστος,
- μήνυμα ότι η κράτηση δεν αναιρείται.

Πριν καλέσεις το backend, εμφάνισε confirmation dialog. Μετά την επιτυχία δείξε καθαρό μήνυμα και ενημέρωσε τις διαθέσιμες θέσεις.

## Βήμα 9: Υλοποίησε messaging

Δημιούργησε νέο module:

```text
backend/src/messages/
```

Endpoints:

```text
POST   /messages
GET    /messages/inbox
GET    /messages/sent
PATCH  /messages/:id/read
DELETE /messages/:id
POST   /events/:id/notify-attendees
```

Το backend πρέπει να ελέγχει ότι:

- ο συμμετέχων έχει κράτηση στην εκδήλωση,
- ο διοργανωτής είναι ο ιδιοκτήτης της εκδήλωσης,
- δεν μπορεί κάποιος να στείλει αυθαίρετα μήνυμα σε άλλον χρήστη.

Στο frontend πρόσθεσε:

```text
/inbox
/sent
/messages/:id
```

Στο navigation εμφάνισε unread counter.

Όταν ακυρώνεται εκδήλωση, δημιούργησε μήνυμα για κάθε χρήστη που είχε κράτηση.

## Βήμα 10: XML και JSON export

Δημιούργησε module export με admin-only endpoints:

```text
GET /exports/events.xml
GET /exports/events.json
```

Το XML πρέπει να περιλαμβάνει:

- events,
- categories,
- ticket types,
- bookings,
- attendee,
- organizer,
- photos.

Πρέπει να ταιριάζει στη δομή του DTD της εκφώνησης. Έλεγξέ το με XML parser, όχι μόνο οπτικά.

## Βήμα 11: Υλοποίησε το recommender τελευταίο

Μην ξεκινήσεις από αυτό. Είναι ανεξάρτητο και πιο δύσκολο.

Πρώτα αποθήκευε τις επισκέψεις εκδηλώσεων μέσω:

```text
POST /events/:id/view
```

Μετά:

1. φόρτωσε το dataset του e-class,
2. αντιστοίχισε users/events σε αριθμητικά IDs,
3. δημιούργησε πίνακα ratings ή interactions,
4. υλοποίησε biases χρηστών και events,
5. υλοποίησε latent user/item factors,
6. εκπαίδευσε με gradient descent,
7. υπολόγισε predicted scores,
8. ταξινόμησε τις εκδηλώσεις,
9. εμφάνισε τις πρώτες προτάσεις.

Η βασική εξίσωση είναι:

$$
\hat r_{ui} = \mu + b_u + b_i + q_i^T p_u
$$

όπου:

- $\mu$ είναι ο γενικός μέσος όρος,
- $b_u$ το bias του χρήστη,
- $b_i$ το bias της εκδήλωσης,
- $p_u$ το διάνυσμα του χρήστη,
- $q_i$ το διάνυσμα της εκδήλωσης.

Πρέπει επίσης να καλύψεις τον χρήστη χωρίς ιστορικό κρατήσεων, χρησιμοποιώντας μόνο τις επισκέψεις του.

## Βήμα 12: Tests μετά από κάθε feature

Μην αφήσεις τα tests για το τέλος.

Για κάθε module γράψε tests για:

- επιτυχημένο σενάριο,
- λάθος δεδομένα,
- μη εξουσιοδοτημένο χρήστη,
- οριακή περίπτωση.

Ελάχιστα απαραίτητα tests:

- duplicate username,
- pending user cannot login,
- admin approval,
- non-admin cannot approve users,
- ticket quantities over capacity,
- delete event after booking fails,
- cancelled event rejects booking,
- booking updates availability,
- booking cannot exceed available tickets,
- organizer cannot edit another organizer’s event,
- XML export contains required fields.

## Βήμα 13: Ασφάλεια και τελικός έλεγχος

Πριν την παράδοση:

- ενεργοποίησε `ValidationPipe` στο NestJS,
- βάλε DTO validation με `class-validator`,
- ενεργοποίησε όλους τους ρόλους και guards,
- έλεγξε ότι δεν επιστρέφονται `passwordHash`,
- έλεγξε ότι τα admin endpoints είναι προστατευμένα,
- μη βάλεις secrets στο Git,
- πρόσθεσε HTTPS/TLS για το deployment,
- έλεγξε CORS,
- έλεγξε expired JWT,
- έλεγξε unauthorized requests.

## Βήμα 14: Τεκμηρίωση και παράδοση

Στο τελικό PDF βάλε:

1. Εξώφυλλο.
2. Πίνακα περιεχομένων.
3. Στόχο εφαρμογής.
4. Αρχιτεκτονική frontend/backend/database.
5. Σχεδιασμό βάσης και ER διάγραμμα.
6. Authentication και roles.
7. Διαχείριση εκδηλώσεων.
8. Κρατήσεις και transactions.
9. Messaging.
10. XML/JSON export.
11. Biased Matrix Factorization.
12. Οδηγίες εγκατάστασης.
13. Οδηγίες εκτέλεσης.
14. Tests και screenshots.
15. Δυσκολίες και λύσεις.
16. Επίλογο.

# Προτεινόμενη σειρά εργασίας

Η σειρά που πρέπει να ακολουθήσεις είναι:

```text
1. Εκτέλεση υπάρχοντος project
2. Registration και approval χρηστών
3. Admin authorization
4. Prisma schema για events/bookings
5. Event backend
6. Event frontend
7. Search και event details
8. Booking backend με transaction
9. Booking frontend
10. Messaging
11. XML/JSON export
12. Event views
13. Recommender
14. Tests
15. Security
16. Documentation και παράδοση
```

Το σημαντικότερο είναι να μην προσπαθήσεις να φτιάξεις όλη την εφαρμογή ταυτόχρονα. Κάθε στάδιο πρέπει να ολοκληρώνεται με αυτή τη λογική:

```text
database -> backend service -> REST endpoint -> frontend service -> frontend page -> tests
```

Το πρώτο πραγματικό τεχνικό βήμα είναι να ολοκληρώσεις το authentication/registration και μετά να επεκτείνεις το [schema.prisma](backend/prisma/schema.prisma) με `Event`, `TicketType` και `Booking`.
