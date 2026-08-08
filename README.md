## Backend Setup

### Prerequisites

- Node.js 22
- npm
- PostgreSQL 16 or compatible version

### Installation

1. Clone the repository and enter the backend directory:

   ```bash
   git clone <repository-url>
   cd event_booking_app/backend

Install and select Node.js 22 using nvm:

nvm install 22
nvm use 22
Install PostgreSQL and make sure the server is running.
Create a PostgreSQL database named event_booking.

Copy the environment template:

cp .env.example .env
Edit .env and fill in the local PostgreSQL credentials and JWT secret.

Install the project dependencies:

npm install

Generate the Prisma Client:

npx prisma generate

Apply the existing database migrations:

npx prisma migrate deploy

Insert the development seed data:

npm run prisma:seed

Start the backend in development mode:

npm run start:dev

In another terminal, confirm that the server responds:

curl http://localhost:3000

Expected response:

Hello World!

### Γιατί άλλαξα το migration command

Εσύ χρησιμοποίησες:

```bash
npx prisma migrate dev --name init