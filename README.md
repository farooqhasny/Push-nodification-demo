# AOG Alarm Terminal

This repository contains the installable PWA. The Android app is generated from the deployed PWA by PWABuilder; no Android project is required in this repository.

## Build and deploy

```bash
npm install
npm run build
```

Deploy the repository with the production `dist/` output on HTTPS. With the current Vite configuration, the GitHub Pages URL is expected to be:

```text
https://<github-user>.github.io/Push-nodification-demo/
```

Before packaging, verify these URLs in the deployed site:

- `/Push-nodification-demo/manifest.webmanifest`
- `/Push-nodification-demo/sw.js`
- `/Push-nodification-demo/icon.svg`

## Generate the Android app with PWABuilder

1. Open [pwabuilder.com](https://www.pwabuilder.com/).
2. Enter the deployed HTTPS URL, including `/Push-nodification-demo/`.
3. Select **Android** and choose **Package for Stores**.
4. Keep the generated application ID, or set a stable reverse-domain ID such as `com.example.aogalarmterminal` before downloading.
5. Download the Android package and signing files.
6. Keep the keystore, alias, and passwords in a secure password manager. The same keystore is required for every future update; losing it prevents updates to the published app.
7. Test the generated APK on a device before uploading the signed bundle to Google Play.

The Android package opens the PWA in a Trusted Web Activity. Push delivery still depends on the deployed HTTPS origin, browser notification permission, the service worker, and the Node-RED `/webpush` endpoint. Updating the website normally does not require rebuilding the Android wrapper; rebuild it only when changing Android package metadata or native packaging settings.