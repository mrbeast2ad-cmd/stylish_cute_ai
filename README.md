# Stylish Cute AI — Remote Control (v2, secure)

Rebuild of the phone → desktop remote-control system, fixing the
`auth/api-key-not-valid` error by removing the "paste your key into a
text box" flow entirely. Config is now set **once** in a file, not typed
into the UI each session.

## How it works

```
[Phone browser]  --login-->  [Firebase Auth]
       |
       | writes command to
       v
[Firebase Realtime Database: users/{uid}/commands]
       ^
       | listens for new commands
       |
[Desktop: remote_listener.py]  --executes-->  [Stonic AI command router]
       |
       | writes back status/result
       v
[Firebase Realtime Database]  --live update-->  [Phone dashboard]
```

- The **web app** (`remote-web/`) only ever writes small text commands —
  it never has any power to run anything by itself.
- The **desktop listener** (`desktop/remote_listener.py`) is the only
  thing that actually executes commands, using the same `commands.py`
  router already built for Stonic AI (open apps, screenshot, volume,
  lock, AI Q&A fallback, etc.)
- **Firebase Database Rules** (`database.rules.json`) make sure only
  YOUR logged-in account can read or write your own commands node.

## Two different kinds of "secret" — don't confuse them

| File | Where it lives | Is it secret? |
|---|---|---|
| `remote-web/firebase-config.js` | Web app (browser) | **No** — Firebase's public client config is meant to be visible. Security comes from Database Rules + Auth, not from hiding this. |
| `desktop/serviceAccountKey.json` | Desktop only | **YES — real secret.** Grants full admin access to your Firebase project. Never upload, never commit, never share. |

## 1. Firebase project setup (one time)

1. Go to https://console.firebase.google.com → create a project (or use your existing `stylish-cute-ai` one).
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Authentication** → Users → add yourself (or the account you want to log in with) — pick a password just for this app (not your Gmail password).
4. **Realtime Database** → Create database → start in **locked mode**.
5. Realtime Database → Rules tab → paste the contents of `remote-web/database.rules.json` → Publish.
6. Project Settings → General → scroll to "Your apps" → add a **Web app** → copy the config object it gives you.
7. Project Settings → Service accounts → **Generate new private key** → this downloads a JSON file. Save it somewhere safe on your desktop (e.g. `desktop/serviceAccountKey.json`) — **do not** put it in the web app folder.

## 2. Web app setup (`remote-web/`)

```bash
cd remote-web
cp firebase-config.example.js firebase-config.js
```

Open `firebase-config.js` and paste in the values from step 6 above —
directly in the file, once. Save.

### Deploy to Vercel

```bash
# from inside remote-web/
npm install -g vercel   # if not already installed
vercel
```

Since this is a plain static site (no build step), Vercel will just
serve the files as-is. Your login page will be at
`https://your-project.vercel.app/index.html`.

> `firebase-config.js` is in `.gitignore`, so if you push this folder to
> GitHub first and deploy from there, remember to add the file's contents
> as the actual file in your Vercel deployment (or set it via Vercel's
> file system directly) — don't rely on git to carry it.

## 3. Desktop listener setup (`desktop/`)

This runs on the same PC as your Stonic AI project.

```bash
cd desktop
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
```

Edit `.env`:
- `FIREBASE_SERVICE_ACCOUNT_PATH` → path to the JSON key from step 7
- `FIREBASE_DATABASE_URL` → your Realtime Database URL (same as in `firebase-config.js`)
- `REMOTE_ACCOUNT_EMAIL` → the email you log into the web dashboard with

Run it:

```bash
python remote_listener.py
```

Leave this running in the background alongside (or instead of) the
normal `python run_stonic.py` voice loop — remote commands go through
the exact same command router.

## 4. Using it

1. Open the Vercel URL on your phone → log in with the email/password from step 3.
2. Tap any button (Open Chrome, Screenshot, Lock PC, etc.) or type a custom command.
3. The desktop listener picks it up within a second or two, executes it, and the result appears live in the dashboard's log.

## 5. Why the old error happened

`auth/api-key-not-valid` fires when Firebase gets a malformed or empty
API key string. The old flow had **text inputs on the login page for the
API key itself**, meaning every time you connected, you were re-typing/
pasting a long string by hand — one stray space, missing character, or
smart-quote from copy-paste breaks it silently. The new version puts
that value in a real JS file, edited once in a code editor, so there's
no repeated manual entry to go wrong.

## 6. Extending commands

Because remote commands run through `stonic_ai.commands.handle_command()`,
any command you already support by voice works remotely for free. To add
a new dashboard button, just add a `<button data-cmd="your command text">`
in `dashboard.html` — no other code changes needed.
