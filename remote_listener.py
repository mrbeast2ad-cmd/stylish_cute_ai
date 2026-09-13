"""
remote_listener.py
-------------------
Runs ON THE DESKTOP (same machine as Stonic AI). Connects to Firebase
using the Admin SDK (a service-account key — see setup below), listens
for new commands pushed by the web dashboard under:

    users/{uid}/commands/{push_id}

...and executes them using the exact same command router already built
for Stonic AI (stonic_ai.commands), so "open chrome" typed on your phone
behaves identically to saying it out loud.

SECURITY NOTE — read this:
The service-account JSON key used here is a REAL secret (unlike the
web app's public firebaseConfig). It grants full admin access to your
Firebase project. It must:
  - stay only on your desktop
  - never be committed to git or uploaded anywhere
  - never be pasted into the web app / dashboard

Put its path in FIREBASE_SERVICE_ACCOUNT_PATH inside your .env file.
"""

import os
import sys
import time

import firebase_admin
from firebase_admin import credentials, db as fb_db

# Import the existing Stonic AI command router and speech engine so a
# remote command runs through the exact same logic as a spoken one.
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "stonic_ai"))
from stonic_ai import config as stonic_config
from stonic_ai.speech_engine import SpeechEngine
from stonic_ai import commands as stonic_commands

logger = stonic_config.get_logger("remote_listener")


class SilentAnnouncer:
    """
    A drop-in stand-in for SpeechEngine's `speak`/`listen` used only to
    capture what Stonic WOULD have said, so we can send it back to the
    dashboard as a result string — without needing an actual mic/speaker
    on a headless remote session. Wraps a real SpeechEngine if voice
    output is also wanted locally.
    """

    def __init__(self, also_speak_locally: bool = True):
        self.last_message = ""
        self._real = SpeechEngine() if also_speak_locally else None

    def speak(self, text: str):
        self.last_message = text
        if self._real:
            self._real.speak(text)
        else:
            print(f"[remote] {text}")

    def listen(self, calibrate: bool = False) -> str:
        # Remote-triggered destructive commands (shutdown/restart) can't
        # ask for a spoken "yes" — require a distinct confirm command
        # instead. Returning "" means "not confirmed" by default.
        return ""


def _get_uid_for_email(email: str) -> str:
    """Look up a Firebase Auth user's UID from their email using the Admin SDK."""
    from firebase_admin import auth as fb_auth

    user = fb_auth.get_user_by_email(email)
    return user.uid


def run_listener(service_account_path: str, account_email: str):
    """
    Initialize Firebase Admin and start listening for new commands under
    this account's UID. Runs forever; Ctrl+C to stop.
    """
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred, {
        "databaseURL": os.getenv("FIREBASE_DATABASE_URL", ""),
    })

    uid = _get_uid_for_email(account_email)
    logger.info(f"Listening for remote commands for UID: {uid}")

    announcer = SilentAnnouncer(also_speak_locally=True)
    commands_ref = fb_db.reference(f"users/{uid}/commands")

    def on_command(event):
        # `event.data` is the new command's dict payload; `event.path`
        # tells us which push-id child changed.
        if event.data is None:
            return
        if not isinstance(event.data, dict):
            return
        if event.data.get("status") != "pending":
            return  # Already processed, or not a fresh command.

        command_text = event.data.get("text", "").strip()
        command_id = event.path.strip("/")
        logger.info(f"Remote command received: '{command_text}'")

        try:
            matched = stonic_commands.handle_command(command_text, announcer)
            if not matched:
                stonic_commands.handle_with_ai_fallback(command_text, announcer)
            commands_ref.child(command_id).update({
                "status": "done",
                "result": announcer.last_message,
            })
        except SystemExit:
            commands_ref.child(command_id).update({
                "status": "done",
                "result": "Exit command received on desktop.",
            })
        except Exception as exc:
            logger.error(f"Error executing remote command: {exc}")
            commands_ref.child(command_id).update({
                "status": "error",
                "result": str(exc),
            })

    commands_ref.listen(on_command)

    # `listen` runs on a background thread — keep the main thread alive.
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Remote listener stopped.")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    sa_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    email = os.getenv("REMOTE_ACCOUNT_EMAIL")

    if not sa_path or not os.path.exists(sa_path):
        print("Set FIREBASE_SERVICE_ACCOUNT_PATH in .env to your service-account JSON file path.")
        sys.exit(1)
    if not email:
        print("Set REMOTE_ACCOUNT_EMAIL in .env to the email of the dashboard account.")
        sys.exit(1)

    run_listener(sa_path, email)
