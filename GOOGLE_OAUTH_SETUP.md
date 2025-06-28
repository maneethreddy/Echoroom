# Google OAuth Setup for EchoRoom

## Overview
This document explains how Google OAuth has been integrated into the EchoRoom application.

## Client ID
The Google OAuth client ID used in this application is:
```
914537190439-7bvhvn8s9hbkt369cfq2cv8vvfkm59rh.apps.googleusercontent.com
```

## Frontend Setup

### Dependencies Added
- `@react-oauth/google` - React wrapper for Google OAuth

### Files Modified/Created
1. **`client/src/config/googleOAuth.js`** - Configuration file with client ID
2. **`client/src/components/GoogleLoginButton.js`** - Reusable Google login component
3. **`client/src/App.js`** - Wrapped with GoogleOAuthProvider
4. **`client/src/Login.js`** - Added Google login button
5. **`client/src/Register.js`** - Added Google login button

### Features
- Google One Tap login
- Automatic user creation for new Google users
- Seamless integration with existing authentication flow
- Responsive design with Material-UI components

## Backend Setup

### Dependencies Added
- `google-auth-library` - Google OAuth verification library

### Files Modified
1. **`server/routes/auth.js`** - Added `/google` endpoint
2. **`server/models/user.js`** - Updated to support Google OAuth fields

### New User Fields
- `googleId` - Google's unique user ID
- `profilePicture` - User's Google profile picture
- `isGoogleUser` - Boolean flag for Google users
- `password` - Now optional for Google users

## API Endpoints

### POST `/api/auth/google`
Handles Google OAuth authentication.

**Request Body:**
```json
{
  "credential": "google_id_token_here"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "profilePicture": "https://..."
  }
}
```

## Security Features
- JWT token generation for authenticated sessions
- Google ID token verification
- Automatic user creation for new Google users
- Secure password handling for traditional users

## Usage
1. Users can click the "Continue with Google" button on login/register pages
2. Google OAuth popup will appear for authentication
3. Upon successful authentication, users are redirected to the dashboard
4. JWT token is stored in localStorage for session management

## Environment Variables
Make sure to set the following environment variables in your server:
- `JWT_SECRET` - Secret key for JWT token signing
- `MONGO_URI` - MongoDB connection string

## Notes
- The Google OAuth client ID is configured for localhost development
- For production, update the authorized origins in Google Cloud Console
- The application supports both traditional email/password and Google OAuth authentication 