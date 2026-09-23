# DUMBASS LIFT — iPhone app

The iPhone app is the web app (`../index.html`) inside a native shell (Capacitor 8).
Change the web app as usual; then copy it into the iPhone project:

```
cd native
npm install          # first time only
npm run sync         # copies ../index.html + icons into the app and updates iOS
npm run open         # opens the project in Xcode
```

## First build (needs full Xcode from the Mac App Store)
1. In Xcode: select the **App** target → **Signing & Capabilities** → Team = your Apple Developer account.
2. Pick a real iPhone or a simulator at the top and press ▶︎ to run.
3. To upload: **Product → Archive → Distribute App → App Store Connect**. It then shows up in TestFlight.

Bundle ID `com.dumbasslift.app` and the display name `DUMBASS LIFT` are set in `capacitor.config.json`.
App Store texts, privacy answers and screenshots: `app-store/`.
