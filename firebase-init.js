// firebase-init.js
// ---------------------------------------------------------------
// Central Firebase setup shared by login.js and dashboard.js.
// Uses the Firebase v10 modular SDK loaded straight from Google's CDN
// (no build step / npm install required — works as static files).
// ---------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

import { firebaseConfig } from "./firebase-config.js";

// ---------------------------------------------------------------
// Config validation — catches the #1 cause of silent login failures:
// firebase-config.js still has the example placeholder text in it
// because the file was never actually filled in after copying from
// firebase-config.example.js.
// ---------------------------------------------------------------
function assertConfigIsFilled(cfg) {
  const missing = Object.entries(cfg)
    .filter(([, value]) => !value || value.toString().startsWith("PASTE_YOUR"))
    .map(([key]) => key);

  if (missing.length > 0) {
    const message =
      "firebase-config.js still has placeholder values for: " +
      missing.join(", ") +
      ". Open remote-web/firebase-config.js and paste in your real " +
      "Firebase project config from the Firebase Console " +
      "(Project Settings → General → Your apps → Web app).";
    console.error("[Stonic Remote] " + message);
    throw new Error(message);
  }
}

assertConfigIsFilled(firebaseConfig);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export {
  auth,
  db,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  ref,
  push,
  onValue,
  serverTimestamp,
};
