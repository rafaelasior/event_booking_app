# curl — Σύντομος Οδηγός

Το `curl` είναι ένα πρόγραμμα γραμμής εντολών που στέλνει HTTP requests και
τυπώνει την απάντηση. Είναι ο πιο γρήγορος τρόπος να δοκιμάσεις ένα API endpoint
χωρίς frontend, Postman ή browser.

Κάθε HTTP request έχει τέσσερα μέρη, και κάθε flag του curl ρυθμίζει ένα από αυτά:

| Μέρος του request | Flag | Παράδειγμα |
|---|---|---|
| Method (ρήμα) | `-X` | `-X POST` |
| URL | (σκέτο argument) | `http://localhost:3000/auth/login` |
| Headers | `-H` | `-H 'Content-Type: application/json'` |
| Body (δεδομένα) | `-d` | `-d '{"username":"admin1"}'` |

## Τα flags που χρειάζεσαι στην πράξη

| Flag | Τι κάνει |
|---|---|
| `-X <METHOD>` | Ορίζει το method. Χωρίς αυτό, το curl κάνει `GET` — ή `POST` αν υπάρχει `-d`. |
| `-H '<Header>: <value>'` | Προσθέτει ένα header. Επαναλαμβάνεται για πολλά headers. |
| `-d '<body>'` | Στέλνει body. Χρειάζεται μονά εισαγωγικά για να μην πειράξει το bash τα `"`. |
| `-i` | Τυπώνει και τα response headers μαζί με το status code (`HTTP/1.1 201 Created`). |
| `-s` | Silent: κρύβει την μπάρα προόδου. Χρήσιμο σε pipes. |
| `-v` | Verbose: δείχνει ολόκληρο το request που στάλθηκε. Για debugging. |

Σημαντικό: το `-d` από μόνο του **δεν** ορίζει `Content-Type: application/json` —
βάζει `application/x-www-form-urlencoded`. Επειδή το NestJS περιμένει JSON,
το `-H 'Content-Type: application/json'` είναι υποχρεωτικό σε κάθε POST/PATCH.

## Έτοιμες εντολές για αυτό το project

Με το backend να τρέχει στο `http://localhost:3000`.

### Register

```bash
curl -i -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin1","email":"admin1@test.gr","password":"password123",
       "passwordConfirmation":"password123","firstName":"A","lastName":"B",
       "phone":"2101234567","address":"Odos 1","city":"Athens",
       "country":"GR","AFM":"123456789"}'
```

Αναμενόμενο: `201 Created` και `registrationStatus: PENDING`.

### Login και αποθήκευση του token

Το `access_token` χρειάζεται σε κάθε προστατευμένο endpoint, οπότε το κρατάμε
σε μεταβλητή του shell αντί να το κάνουμε copy-paste:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin1","password":"password123"}' | jq -r .access_token)

echo $TOKEN   # έλεγχος ότι όντως γέμισε
```

(Το `jq` είναι JSON parser γραμμής εντολών: `sudo apt install jq`.)

### Request με token

Ο JWT μπαίνει στο header `Authorization` με το πρόθεμα `Bearer`:

```bash
curl -i http://localhost:3000/users -H "Authorization: Bearer $TOKEN"
```

Εδώ τα εισαγωγικά είναι **διπλά**, ώστε το bash να αντικαταστήσει το `$TOKEN`.

### PATCH (έγκριση χρήστη από admin)

```bash
curl -i -X PATCH http://localhost:3000/users/2/approve \
  -H "Authorization: Bearer $TOKEN"
```

## Πώς διαβάζεις το αποτέλεσμα

Με `-i`, η πρώτη γραμμή είναι το status code — εκεί κρίνεται αν πέτυχε:

| Status | Σημασία στο δικό μας API |
|---|---|
| `200 OK` | Επιτυχές login ή GET. |
| `201 Created` | Επιτυχές register. |
| `400 Bad Request` | Το body δεν πέρασε τον `ValidationPipe` (λάθος ή επιπλέον πεδίο). |
| `401 Unauthorized` | Λάθος στοιχεία, token που λείπει, ή χρήστης χωρίς έγκριση. |
| `403 Forbidden` | Έγκυρο token αλλά χωρίς τον απαιτούμενο ρόλο (`RolesGuard`). |
| `409 Conflict` | Το username / email / ΑΦΜ υπάρχει ήδη. |

## Συχνά λάθη

- **`POST http://...` αντί για `curl -X POST http://...`** — το `POST` είναι
  ξεχωριστό πρόγραμμα του Ubuntu (`lwp-request`) και σου ζητάει body από το
  πληκτρολόγιο. Δεν έχει σχέση με το API σου.
- **Ξέχασες το `Content-Type`** — το request φτάνει ως form-urlencoded και
  ο `ValidationPipe` το κόβει με `400`.
- **Διπλά εισαγωγικά γύρω από το JSON body** — το bash μπερδεύεται με τα
  εσωτερικά `"`. Χρησιμοποίησε μονά εισαγωγικά για το `-d`.
- **`$TOKEN` μέσα σε μονά εισαγωγικά** — δεν αντικαθίσταται και στέλνεται
  αυτούσιο το κείμενο `$TOKEN`. Στο header θέλουμε διπλά εισαγωγικά.
