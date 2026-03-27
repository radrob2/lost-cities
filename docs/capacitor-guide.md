# Capacitor Wrap Guide

How to wrap the Expedition Card Game web app as a native iOS and Android app using Capacitor.

---

## Why Capacitor

- **One codebase, two platforms.** The existing web app becomes the native app with minimal changes.
- **Native APIs.** Access iOS Haptics (finally works on iPhone!), push notifications, and other native features.
- **No framework required.** Capacitor works with plain HTML/JS, not just React/Angular/Vue.
- **App Store ready.** Produces real Xcode and Android Studio projects for submission.

---

## Prerequisites

- **Node.js** 18+ and npm
- **Xcode** 15+ (for iOS, macOS only)
- **Android Studio** (for Android)
- **CocoaPods** (`sudo gem install cocoapods`) for iOS
- A registered Apple Developer account ($99/year) for iOS distribution
- A registered Google Play Developer account ($25 one-time) for Android distribution

---

## 1. Initialize npm Project

From the repo root (`/tmp/lost-cities`):

```bash
npm init -y
npm install @capacitor/core @capacitor/cli
```

---

## 2. Initialize Capacitor

```bash
npx cap init
```

You'll be prompted for:
- **App name:** Your chosen name (e.g., "Five Peaks")
- **App Package ID:** Reverse-domain format (e.g., `com.yourname.fivepeaks`)
- **Web asset directory:** `public` (where `index.html` lives)

This creates `capacitor.config.ts` (or `.json`).

---

## 3. Add Platforms

```bash
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

This creates `ios/` and `android/` directories with native projects.

---

## 4. Add Haptics Plugin

The main reason for Capacitor: iOS haptic feedback. `navigator.vibrate()` does not work in Safari.

```bash
npm install @capacitor/haptics
npx cap sync
```

### Usage in Code

Replace raw `navigator.vibrate()` calls with Capacitor Haptics:

```javascript
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Light tap (card select)
await Haptics.impact({ style: ImpactStyle.Light });

// Medium tap (card play)
await Haptics.impact({ style: ImpactStyle.Medium });

// Heavy tap (score reveal)
await Haptics.impact({ style: ImpactStyle.Heavy });

// Notification (game over)
await Haptics.notification({ type: 'success' });
```

**Fallback for web:** Capacitor plugins gracefully degrade on web. On Android Chrome, `navigator.vibrate()` still works as before. On iOS Safari (web, not native), there's no haptic fallback.

---

## 5. Build and Sync

After making changes to the web app:

```bash
npx cap sync
```

This copies `public/` into the native projects and updates native plugins.

### Open in IDE

```bash
npx cap open ios      # Opens Xcode
npx cap open android  # Opens Android Studio
```

### Live Reload (Development)

For faster iteration, use live reload instead of rebuilding:

```bash
npx cap run ios --livereload --external
npx cap run android --livereload --external
```

This serves the web app from your dev machine and reloads on file changes.

---

## 6. Test on Real Devices

### iOS
1. Connect an iPhone via USB.
2. In Xcode, select your device as the run target.
3. Click Run (or Cmd+R).
4. First run requires trusting the developer certificate on the device (Settings > General > Device Management).

### Android
1. Enable Developer Options and USB Debugging on your Android device.
2. Connect via USB.
3. In Android Studio, select your device and click Run.

**Important:** Test haptics on real devices. Simulators/emulators do not produce haptic feedback.

---

## 7. App Store Submission Checklist (iOS)

### Before Submission
- [ ] Choose a final app name (not "Lost Cities" -- trademarked by Kosmos)
- [ ] App icon: 1024x1024 PNG, no transparency, no rounded corners (Apple rounds them)
- [ ] Launch screen / splash screen configured in Xcode
- [ ] Screenshots for required device sizes (6.7", 6.5", 5.5" iPhones; iPad if supporting)
- [ ] Privacy policy URL (required even for apps with no data collection)
- [ ] App description and keywords for App Store listing
- [ ] Age rating questionnaire completed in App Store Connect

### Xcode Configuration
- [ ] Bundle ID matches `capacitor.config.ts`
- [ ] Version number and build number set
- [ ] Signing certificate and provisioning profile configured
- [ ] Deployment target set (iOS 16+ recommended)
- [ ] Device orientation locked to portrait

### Build and Upload
```bash
npx cap sync ios
```
1. In Xcode: Product > Archive
2. Distribute App > App Store Connect
3. Upload
4. In App Store Connect, submit for review

### Apple Review Notes
- Apple reviews typically take 24-48 hours.
- Common rejection reasons: crashes, broken links, missing privacy policy, misleading screenshots.
- Multiplayer features should work during review (Firebase must be live).
- If using In-App Purchases, they must be configured in App Store Connect before submission.

---

## 8. Google Play Submission Checklist (Android)

### Before Submission
- [ ] App icon: 512x512 PNG
- [ ] Feature graphic: 1024x500 PNG
- [ ] Screenshots for phone (minimum 2)
- [ ] Short description (80 chars) and full description (4000 chars)
- [ ] Privacy policy URL
- [ ] Content rating questionnaire completed
- [ ] App category selected (Games > Card)

### Android Studio Configuration
- [ ] Application ID matches `capacitor.config.ts`
- [ ] Version code and version name set in `build.gradle`
- [ ] Signed release APK or AAB (Android App Bundle)
- [ ] Target SDK set to latest required by Google Play

### Build and Upload
```bash
npx cap sync android
```
1. In Android Studio: Build > Generate Signed Bundle / APK
2. Choose Android App Bundle (AAB) for Play Store
3. Sign with your upload key
4. Upload to Google Play Console

### Google Play Review Notes
- Reviews typically take a few hours to a few days.
- First submission may take longer (new developer account review).
- Google requires a D-U-N-S number for organization accounts (individual accounts are simpler).

---

## Recommended Launch Order

1. **Google Play first** ($25 one-time). Lower cost, faster review. Test market demand.
2. **If 50+ Android sales**, add iOS ($99/year). Need approximately 48 sales at $2.99 to break even on the annual fee.
3. **Web version stays free** as a marketing funnel.

---

## Maintenance

- **Capacitor version bump:** Once per year, update Capacitor and rebuild. Takes about 3 hours.
- **Apple requires occasional updates** to avoid app removal from the store. The yearly Capacitor bump satisfies this.
- **No backend to maintain.** Firebase RTDB is fully managed.
