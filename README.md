# Anchor Auth

> A clean, secure authentication website built with Express, MongoDB, EJS, and responsive CSS.

Anchor Auth is a classroom-friendly authentication project that demonstrates account creation, login, protected pages, logout, and one-time password-reset links.

## Features

- Responsive signup, login, forgot-password, and reset-password pages
- Protected dashboard for authenticated users
- bcrypt password hashing
- JWT authentication in HTTP-only cookies
- One-time, expiring password-reset tokens
- MongoDB persistence with Mongoose
- Mailinator inbox testing through an external SMTP sender
- Helmet security headers and rate limiting
- Docker and Node.js deployment support

## Requirements

- Node.js 18 or newer
- MongoDB running locally or a MongoDB Atlas cluster
- MongoDB Compass for viewing and managing data
- An outgoing SMTP provider for sending reset emails
- A Mailinator inbox for receiving test emails

## Quick start

Install the dependencies and create your local environment file:

```powershell
npm install
Copy-Item .env.example .env
```

Update `.env`, then start the application:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the production command with:

```powershell
npm start
```

## Environment variables

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/auth_assignment
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=2h
RESET_TOKEN_MINUTES=15
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_sending_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
MAIL_FROM=Anchor Auth <your_sending_email@gmail.com>
APP_URL=http://localhost:3000
```

Never commit `.env` or real credentials.

## MongoDB setup

MongoDB Compass is a database client; it does not start a local MongoDB server.

### MongoDB Atlas

Use an Atlas connection string in `MONGODB_URI`:

```env
MONGODB_URI=mongodb+srv://DB_USERNAME:DB_PASSWORD@cluster0.example.mongodb.net/auth_assignment?retryWrites=true&w=majority
```

Then add your current IP in Atlas under **Security -> Network Access**. If your password contains characters such as `@`, `:`, `/`, or `#`, URL-encode it first.

### Local MongoDB

Keep the default URI and start the MongoDB server before running the app. Starting Compass alone is not enough.

The application checks the database connection before opening the web server and prints a helpful error when MongoDB cannot be reached.

## Password-reset email testing

Mailinator is a receiving inbox, not an outgoing SMTP provider. Configure Nodemailer with a real sender such as Gmail SMTP:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_sending_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
MAIL_FROM=Anchor Auth <your_sending_email@gmail.com>
```

For Gmail, use an App Password instead of your normal account password. Create a test account with an address such as:

```text
anchor-assignment-123@mailinator.com
```

Request a password reset, then open that same inbox on Mailinator and follow the link. Use only fake test data because public Mailinator inboxes are visible to anyone who knows the address.

## Routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/` | GET | Home page |
| `/signup` | GET, POST | Create an account |
| `/login` | GET, POST | Log in |
| `/logout` | POST | Clear the authentication cookie |
| `/dashboard` | GET | Protected user dashboard |
| `/forgot-password` | GET, POST | Request a reset email |
| `/reset-password/:token` | GET, POST | Set a new password |
| `/health` | GET | Check application and database health |

## Deployment

Deploy this project as a Node.js service or Docker container. Static-only hosting is not suitable because the project requires an Express server and a live MongoDB connection.

### Node.js service

```text
Build command: npm install
Start command: npm start
```

Set these production variables in your hosting provider's environment settings:

```env
NODE_ENV=production
APP_URL=https://your-domain.example
MONGODB_URI=your-production-atlas-uri
JWT_SECRET=your-long-random-production-secret
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
MAIL_FROM=Anchor Auth <your-smtp-user>
```

Add the deployed service's outbound IP address to the MongoDB Atlas IP access list. Do not make MongoDB itself broadly public; only the web application should be public.

### Docker

The repository includes a production-ready `Dockerfile`:

```powershell
docker build -t anchor-auth .
docker run --env-file .env -p 3000:3000 anchor-auth
```

After deployment, verify:

```text
https://your-domain.example/health
```

Expected response:

```json
{"status":"ok","database":"connected"}
```

## Security notes

- Passwords are hashed with bcrypt and never stored as plaintext.
- JWTs use HTTP-only, SameSite cookies.
- Secure cookies are enabled automatically in production.
- Reset tokens are random, hashed before storage, short-lived, and invalidated after use.
- Login and password-reset endpoints are rate-limited.
- Helmet adds common security headers.
- Forgot-password responses do not reveal whether an email exists.
- Rotate any database or SMTP credential that has been shared publicly.

## Validation

Run the project's syntax checks with:

```powershell
npm run check
```
