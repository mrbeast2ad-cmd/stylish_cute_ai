// dashboard.js
// ---------------------------------------------------------------
// After login, this page:
//   1. Confirms the user is authenticated (kicks back to login if not).
//   2. Sends commands to Firebase Realtime Database under /commands/{id}.
//   3. Listens for status updates written back by the desktop listener
//      (remote_listener.py) so you can see when a command was received
//      and completed.
//
// The desktop app is the only thing that ever executes anything — this
// page only writes small text commands to the database. Firebase Database
// Rules (see database.rules.json) ensure only YOUR logged-in account can
// read/write these commands.
// ---------------------------------------------------------------

import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  ref,
  push,
  onValue,
  serverTimestamp,
} from "./firebase-init.js";

const userEmailEl = document.getElementById("user-email");
const logEl = document.getElementById("log");
const logoutBtn = document.getElementById("logout-btn");
const customForm = document.getElementById("custom-form");
const customInput = document.getElementById("custom-cmd");

let currentUid = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUid = user.uid;
  userEmailEl.textContent = user.email;
  listenForUpdates(user.uid);
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

function addLogLine(text) {
  const line = document.createElement("div");
  line.textContent = text;
  logEl.prepend(line);
}

async function sendCommand(commandText) {
  if (!currentUid) return;
  try {
    const commandsRef = ref(db, `users/${currentUid}/commands`);
    await push(commandsRef, {
      text: commandText,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    addLogLine(`→ Sent: "${commandText}"`);
  } catch (err) {
    addLogLine(`✗ Failed to send "${commandText}": ${err.message}`);
  }
}

// Wire up every grid button.
document.querySelectorAll(".grid button[data-cmd]").forEach((btn) => {
  btn.addEventListener("click", () => sendCommand(btn.dataset.cmd));
});

// Custom free-text command box.
customForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = customInput.value.trim();
  if (!text) return;
  sendCommand(text);
  customInput.value = "";
});

// Listen for status/result updates the desktop listener writes back.
function listenForUpdates(uid) {
  const commandsRef = ref(db, `users/${uid}/commands`);
  onValue(commandsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    const entries = Object.entries(data).sort(
      (a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0)
    );
    const latest = entries.slice(-5);
    // Only log entries that have moved to "done" or "error" since last check
    // is handled implicitly by re-rendering the visible tail each update.
    latest.forEach(([id, cmd]) => {
      if (cmd.status === "done" && !cmd._logged) {
        addLogLine(`✓ Done: "${cmd.text}"${cmd.result ? " — " + cmd.result : ""}`);
        cmd._logged = true;
      } else if (cmd.status === "error" && !cmd._logged) {
        addLogLine(`✗ Error on "${cmd.text}": ${cmd.result || "unknown error"}`);
        cmd._logged = true;
      }
    });
  });
}
