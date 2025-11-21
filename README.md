# Hustle Backend API

A Node.js/Express backend API with Supabase authentication, featuring signup, login, and email verification.

## Project Structure

```
src/
├── config/
│   └── supabase.js          # Supabase client configuration
├── controllers/
│   └── authController.js    # Authentication request handlers
├── services/
│   └── authService.js       # Authentication business logic
├── routes/
│   └── authRoutes.js        # Authentication route definitions
├── middleware/
│   └── errorHandler.js      # Error handling middleware
└── server.js                # Main application entry point
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

3. **Get your Supabase credentials:**
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy your Project URL and anon/public key
   - Copy your service_role key (keep this secret!)

4. **Configure Supabase Email Templates:**
   - In Supabase dashboard, go to Authentication > Email Templates
   - Configure the "Confirm signup" template
   - Set the redirect URL to your frontend callback URL

5. **Run the server:**
   ```bash
   npm start        # Production
   npm run dev      # Development (with nodemon)
   ```

## API Endpoints

### Authentication

#### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"  // optional metadata
}
```

**Response:**
```json
{
  "success": true,
  "message": "Signup successful. Please check your email for verification.",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "email_confirmed_at": null
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "email_confirmed_at": "2024-01-01T00:00:00Z"
  },
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token",
    "expires_at": 1234567890
  }
}
```

#### Resend Verification Email
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token",
  "type": "signup"  // optional, defaults to "signup"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

## Email Verification Flow

1. User signs up via `/api/auth/signup`
2. Supabase automatically sends a verification email
3. User clicks the link in the email
4. User is redirected to the frontend callback URL
5. Frontend extracts the token from the URL
6. Frontend calls `/api/auth/verify-email` with the token
7. User is now verified and can log in

## Technologies

- **Node.js** - Runtime environment
- **Express** - Web framework
- **Supabase** - Authentication and database
- **dotenv** - Environment variable management
- **CORS** - Cross-origin resource sharing

## Development

The project uses ES6 modules. Make sure your `package.json` has `"type": "module"` set.

## License

ISC


#EDDIE CHECK HERE
PORT=3000
SUPABASE_URL=https://zkaabtgivzhnyvrjcwee.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYWFidGdpdnpobnl2cmpjd2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTI3MDUsImV4cCI6MjA3ODcyODcwNX0.0OTsN4nF0r0rv7_-qRvi8IMkDRe-7R4hxgSHjRigBq4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYWFidGdpdnpobnl2cmpjd2VlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzE1MjcwNSwiZXhwIjoyMDc4NzI4NzA1fQ.b7dfDjl1wsZ751aYviarAgLOnN7QN5FluSaDNbCQJ8k


