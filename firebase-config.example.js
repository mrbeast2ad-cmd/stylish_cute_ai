// firebase-config.js
// ---------------------------------------------------------------
// Fill this in ONE TIME with your Firebase project's web config
// (Firebase Console → Project Settings → General → Your apps → Web app → Config).
//
// IMPORTANT: This file is safe to be visible in the browser — Firebase's
// apiKey is a public identifier, NOT a secret. Real security comes from
// Firebase Authentication + the Database Rules (see database.rules.json).
//
// Do NOT paste these values into a login-page text box at runtime —
// that's what caused the "auth/api-key-not-valid" error before, because
// copy-pasting into an <input> easily introduces stray spaces/quotes.
// Instead, edit this file directly, once, and redeploy.
// ---------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://PASTE_YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID",
};
