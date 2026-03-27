# Firebase Migration: lost-cities-dd1c0 -> venture-card-game

## Overview

The app is migrating from the old Firebase project `lost-cities-dd1c0` to a new project for the Venture brand. This document covers the steps needed to complete the migration.

## Current Firebase Config (in public/index.html)

```js
const firebaseConfig = {
  apiKey: "AIzaSyCS6rxbyuvgg66RCd1WmrDg0UR9RMiAuBQ",
  authDomain: "lost-cities-dd1c0.firebaseapp.com",
  databaseURL: "https://lost-cities-dd1c0-default-rtdb.firebaseio.com",
  projectId: "lost-cities-dd1c0",
  storageBucket: "lost-cities-dd1c0.firebasestorage.app",
  messagingSenderId: "398537405195",
  appId: "1:398537405195:web:f7c902f8f2df8cdfc2e80e"
};
```

All seven values above will need to be replaced with the new project's config.

## Migration Steps

### 1. Create New Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Name it `venture-card-game` (or similar available name)
4. Disable Google Analytics (not needed) or enable if desired
5. Click "Create project"

### 2. Register Web App

1. In the new project, click the web icon (</>) to add a web app
2. Name it "Venture" and check "Also set up Firebase Hosting"
3. Copy the new `firebaseConfig` object -- you will need all seven values

### 3. Enable Realtime Database

1. In the Firebase console, go to Build > Realtime Database
2. Click "Create Database"
3. Choose the closest region (e.g., `us-central1`)
4. Start in **locked mode**, then update security rules:

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

Adjust rules as needed for production security.

### 4. Update firebaseConfig in index.html

Replace the `firebaseConfig` block in `public/index.html` (around line 467) with the new values from step 2. All seven fields must be updated:

- `apiKey`
- `authDomain`
- `databaseURL`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

### 5. Verify .firebaserc

`.firebaserc` has already been updated to point to `venture-card-game`. If the actual Firebase project ID differs (e.g., Firebase appended a number), update it:

```json
{
  "projects": {
    "default": "venture-card-game"
  }
}
```

### 6. Deploy

```bash
firebase login          # if not already logged in
firebase deploy         # deploys hosting + database rules
```

The new site will be live at `https://venture-card-game.web.app` (or whatever project ID Firebase assigned).

### 7. Update Capacitor Config (if needed)

If the live URL changes and `capacitor.config.json` uses a server URL, update it. Currently the config is minimal:

```json
{
  "appId": "com.venture.cardgame",
  "appName": "Venture",
  "webDir": "public"
}
```

No server URL is set, so Capacitor serves from the local `public/` directory. If you add a live server URL later, use the new Firebase hosting domain.

### 8. Update CLAUDE.md

After migration is complete, update the `**Live:**` URL in `CLAUDE.md` from:
```
https://lost-cities-dd1c0.web.app
```
to the new hosting URL.

## Data Migration

The old Realtime Database at `lost-cities-dd1c0` contains room data from multiplayer games. This data is ephemeral (game rooms are temporary) and does not need to be migrated. The new database starts empty.

## Rollback

If something goes wrong, revert `.firebaserc` to `lost-cities-dd1c0` and redeploy. The old project remains untouched until manually deleted.
