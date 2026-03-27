# Firebase Setup Guide

How to set up Firebase Realtime Database for the Expedition Card Game.

---

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click "Add project."
3. Name it (e.g., `expedition-card-game`).
4. Disable Google Analytics (not needed).
5. Click "Create project."

---

## 2. Enable Realtime Database

1. In the Firebase Console, go to **Build > Realtime Database**.
2. Click "Create Database."
3. Choose a region (US or Europe, depending on your player base).
4. Start in **test mode** for development (open read/write for 30 days).

---

## 3. Database Rules

### Development (open access)

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### Production (recommended)

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

**Security consideration:** Even the production rules above don't prevent a player from reading the opponent's hand. True hand privacy requires either:
- Server-side validation (Cloud Functions) that strips opponent hand data before sending.
- Client-side encryption of hand data with player-specific keys.

For a casual game, the current open rules are acceptable. For competitive play, server-side validation is necessary.

---

## 4. Get Config Keys

1. In the Firebase Console, go to **Project Settings** (gear icon).
2. Under "Your apps," click the web icon (`</>`) to register a web app.
3. Copy the `firebaseConfig` object. It looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

4. Paste this into `index.html`, replacing the existing config block.

**Note:** These keys are safe to commit to a public repo. They only identify your project; security is enforced by database rules, not by key secrecy.

---

## 5. Firebase CLI Deploy

### Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Initialize Hosting

```bash
firebase init hosting
```

- Select your project.
- Set public directory to `public`.
- Configure as single-page app: **No** (we serve `index.html` directly).
- Do not overwrite `index.html`.

This creates `firebase.json` and `.firebaserc`.

### Deploy

```bash
firebase deploy --only hosting
```

Your game is now live at `https://your-project.web.app`.

---

## 6. GitHub Actions Auto-Deploy

The repo includes a GitHub Actions workflow (`.github/workflows/firebase-deploy.yml`) that deploys on every push to `main`, `master`, or `claude/**` branches.

### Setup

1. In the Firebase Console, go to **Project Settings > Service accounts**.
2. Click "Generate new private key" to download a JSON service account file.
3. In your GitHub repo, go to **Settings > Secrets and variables > Actions**.
4. Add a secret named `FIREBASE_SERVICE_ACCOUNT` with the contents of the JSON file.
5. `GITHUB_TOKEN` is provided automatically by GitHub Actions.

### Workflow

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [main, master, 'claude/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: your-project-id
```

Every push to main triggers an automatic deploy. No manual steps needed.

---

## 7. Database Structure

```
rooms/{roomCode}/
  players/
    player1: { name, id }
    player2: { name, id }
  game/
    deck: [cards...]
    hands/
      player1: [cards...]
      player2: [cards...]
    expeditions/
      player1: { red: [], blue: [], ... }
      player2: { red: [], blue: [], ... }
    discards: { red: [], blue: [], ... }
    singlePile: [cards...]
    currentTurn: "player1" | "player2"
    phase: "play" | "draw"
    status: "waiting" | "playing" | "finished"
    variant: "classic" | "single"
  settings/
    variant: "classic" | "single"
```

---

## 8. Security Considerations

### Current State
- No authentication. Players are identified by a random ID stored in `localStorage`.
- No authorization. Any client can read or write any room.
- Opponent hands are visible in the database (and therefore in browser dev tools).

### Before Competitive/Ranked Play
- Add Firebase Authentication (anonymous auth at minimum).
- Write security rules that validate moves server-side.
- Use Cloud Functions to deal cards and manage hidden state.
- Rate-limit writes to prevent abuse.

### Cost
- **Free tier (Spark):** 100 simultaneous RTDB connections, 1 GB stored, 10 GB/month downloaded.
- **Pay-as-you-go (Blaze):** Only needed if you exceed free tier limits (thousands of concurrent users).
- For most use cases, the free tier is more than sufficient.
