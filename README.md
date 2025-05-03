# FetanApp

A delivery management application built with React Native and Expo.

## Environment Variables

This app uses environment variables to manage secrets and configuration values. Here's how to set them up:

1. Copy the `.env.example` file to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the environment variables in the `.env` file:
   ```
   # Firebase Configuration
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   FIREBASE_APP_ID=your_firebase_app_id

   # Google Places API
   GOOGLE_PLACES_API_KEY=your_google_places_api_key
   ```

3. Environment variables are loaded through the Expo config system using the `app.config.js` file.

## Firebase Storage Rules

For uploading to work, make sure your Firebase Storage rules allow authenticated users to upload files:

```
// Firebase Storage Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Allow read/write access to any authenticated user
      allow read, write: if request.auth != null;
    }
  }
}
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npx expo start
   ```

## Features

- Customer ordering system
- Package type selection
- Location selection with Google Places
- Favorite drivers management
- Image uploads for package documentation

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/gfasil123/fetanapp)