# Android app (Google Play)

The Android app is the same website packaged with Capacitor. Its pages are
bundled inside the app; it talks to `VITE_API_URL` from `.env.production`
(the live backend).

## Build a new release

Needs Node 20+, JDK 21 and the Android SDK (platform 36). Android Studio
installs the SDK for you.

1. Put the signing details in `android/keystore.properties` (never commit it):

   ```properties
   storeFile=/full/path/to/bismillah-upload.jks
   storePassword=...
   keyAlias=bismillah-upload
   keyPassword=...
   ```

2. Raise `versionCode` (by 1) and `versionName` in `android/app/build.gradle`.
   Play rejects an upload whose versionCode was used before.

3. Build:

   ```bash
   npm install
   npm run android:bundle
   ```

   The upload file is `android/app/build/outputs/bundle/release/app-release.aab`.

Website-only changes (pages, styles) need a rebuild and a new Play release to
reach the app. Backend changes do not.

## App details

- Package name: `com.bismillahchickencenter.app` (can never change once published)
- Target SDK 36 (Android 16), minimum SDK 24 (Android 7.0)
