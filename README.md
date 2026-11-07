# AAYME app (Expo / React Native)

Mobile frontend for the API in `../amapi`. One app, five role-based areas, chosen from the account's role after sign-in.

## Run
```
cd ../amapi && npm run dev            # API on :4000
cd ../app  && npx expo start          # press "a" for Android
```
API address: Android emulator uses `http://10.0.2.2:4000` (default). On a real phone set your PC's LAN IP:
`EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 npx expo start`

## Structure
| Folder | Role | What it does |
|---|---|---|
| `app/(auth)` | everyone | Login (password, or emailed code), register retailer/distributor |
| `app/(admin)` | admin | Dashboard, **create/edit company employees + their permissions**, find/suspend users |
| `app/(staff)` | company employee | **Onboard distributors** (fee first, timer starts on payment), hand out features, team report, product review |
| `app/(distributor)` | distributor | Orders, products, retailers (create under any employee), team, offers to retailers |
| `app/(employee)` | distributor employee | Deliveries, create retailers (always under themselves) |
| `app/(retailer)` | retailer | Home store (first distributor on top, others in a dropdown, social links), orders, khata, offers |
| `app/order`, `app/store` | shared | Order detail + status actions, store page |
| `src/lib` | | API client (token refresh, idempotency keys), auth, theme (logo palette) |
| `src/ui` | | Design kit, logo (SVG), shared screens |

## Logo
`src/ui/Logo.tsx` draws the mark in SVG. For the launcher icon / splash, save the logo PNG as `assets/icon.png`
(1024x1024) and `assets/splash-icon.png`.

## Quality
```
npm run typecheck     # strict TypeScript
npm test              # 19 unit tests: API client (refresh, idempotency, offline), CSV import, pricing, notification routing, Hindi coverage
npm run verify        # both, as CI runs them
```

## Build & release
`eas.json` has development / preview (APK) / production (AAB) profiles. Set the API address per profile in its `env.EXPO_PUBLIC_API_URL`
(production must be https). `.env.example` explains the local setting.

## Experience
- Spring press feedback + haptics on every tappable, entrance/layout animations, skeleton loaders, floating glass tab bar, toasts
- Inter typography, English / Hindi (dictionary in `src/lib/i18n.tsx`; add a string there and every screen shows it translated)
- Offline banner and cached data, 20 s request timeout with readable errors, error boundary with a crash-reporter hook (`setErrorSink`)
- App lock (fingerprint / face / PIN), secure token storage with rotating refresh, push notifications that open the right screen

## Release checklist
The live API is `https://amapi-sage.vercel.app` and is already set for the `preview` and `production` builds in `eas.json`. For the Play beta follow `docs/PLAY_BETA.md`.
```
npm i -g eas-cli && eas login && eas init            # creates the project id (needed for push notifications)
eas build --platform android --profile production    # Play bundle (AAB)
eas build --platform android --profile preview       # installable APK for testers
```

## How it was verified
Typecheck + 19 unit tests (`npm run verify`); the Android bundle builds; `expo-doctor` 20/20; the backend's own 374 tests pass. The app was also run in a browser against a real backend and database: admin → company employee → distributor → employee → retailer creation, a retailer order with quantity pricing and GST, accept → dispatch → deliver, a UPI payment submitted by the retailer and confirmed by the distributor, and every menu screen for all five roles opened with no console errors. Camera, location, push and biometric lock need a physical phone.

## Using the Vercel-hosted API
Point every build at the deployed address (https, no trailing slash) with the EAS variable `EXPO_PUBLIC_API_URL`, and add
`EXPO_PUBLIC_REALTIME=off` because a serverless host cannot keep a chat socket open (chat then refreshes every few seconds instead).

Things the **backend deployment** needs for the app to work fully (set them in the Vercel project, not in the app):
| Setting | Why |
|---|---|
| `JWT_SECRET` (32+ chars), `DB_*` pointing at a hosted MySQL | the API refuses to start without them in production |
| `STORAGE=s3` with `S3_BUCKET`, `S3_REGION`, `AWS_*` (S3, R2, Spaces...) | product photos and support files; local disk on Vercel is wiped between requests |
| a scheduler (Vercel Cron or any worker) for the daily jobs | overdue-payment reminders and subscription-expiry warnings do not run on serverless |
| `SMTP_*` | emailed sign-in codes |
| `TEST_OTP` unset / `OTP_DEV_ECHO` unset | never leave test shortcuts on in production |

Request bodies above ~4.5 MB are refused by Vercel, so the app blocks uploads over 4 MB with a clear message.

## API coverage
`node scripts/api-coverage.js` compares every backend route with what the app calls. Current result: all 254 routes are covered except
webhooks, the signed-link invoice page, CSV downloads and the (switched-off) authenticator-app flow, which are not meant to be driven from the UI.
