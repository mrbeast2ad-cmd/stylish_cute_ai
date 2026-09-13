// login.js
// ---------------------------------------------------------------
// Handles the sign-in form on index.html. Uses Firebase Authentication's
// email/password provider — nothing is pasted or typed except the actual
// login credentials the user set up for THIS app (not their Gmail password).
//
// If login isn't working, open your browser's DevTools console (F12) —
// every failure path below logs a clear, specific message there.
// ---------------------------------------------------------------

import { auth, signInWithEmailAndPassword, onAuthStateChanged } from "./firebase-init.js";

const form = document.getElementById("login-form");
const errorBox = document.getElementById("error-box");
const loginBtn = document.getElementById("login-btn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

let redirecting = false;

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add("show");
}

function friendlyError(code, rawMessage) {
  const map = {
    "auth/invalid-email": "That email address doesn't look valid.",
    "auth/user-not-found": "No account found with that email. Double-check it, or create the user in Firebase Console → Authentication → Users.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/missing-password": "Please enter a password.",
    "auth/too-many-requests": "Too many attempts — please wait a moment and try again.",
    "auth/api-key-not-valid": "App configuration error — the API key in firebase-config.js is missing or malformed. Re-check it against the Firebase Console.",
    "auth/network-request-failed": "Network error — check your internet connection.",
    "auth/operation-not-allowed": "Email/Password sign-in isn't enabled for this project. Turn it on in Firebase Console → Authentication → Sign-in method.",
  };
  // Always log the raw error so anything not covered above is still visible.
  console.error("[Stonic Remote] Login failed:", code, rawMessage);
  return map[code] || `Sign-in failed (${code || "unknown error"}). Check the browser console for details.`;
}

// ---------------------------------------------------------------
// Only redirect to the dashboard once we know for sure a session
// exists — and only once, to avoid a redirect loop if dashboard.js
// ever bounces back here.
// ---------------------------------------------------------------
onAuthStateChanged(
  auth,
  (user) => {
    if (user && !redirecting) {
      redirecting = true;
      window.location.href = "dashboard.html";
    }
  },
  (error) => {
    console.error("[Stonic Remote] Auth state listener error:", error);
  }
);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.classList.remove("show");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Please enter both email and password.");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Connecting…";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Success — onAuthStateChanged above fires automatically and redirects.
    // As a safety net, also redirect directly here in case the listener
    // is slow to fire for any reason.
    if (!redirecting) {
      redirecting = true;
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    showError(friendlyError(err.code, err.message));
    loginBtn.disabled = false;
    loginBtn.textContent = "Connect";
  }
});

// ---------------------------------------------------------------
// If firebase-init.js threw during import (e.g. config still has
// placeholder values), the module never finishes loading and none of
// the code above runs — the button will look "dead" with no console
// output pointing at this file. This top-level catch surfaces that.
// ---------------------------------------------------------------
window.addEventListener("error", (event) => {
  if (event.message && event.message.includes("firebase-config")) {
    showError(event.message);
  }
});
