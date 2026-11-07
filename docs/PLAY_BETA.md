# Publishing AAYME as a beta on Google Play

Everything below is prepared; the steps marked **YOU** need your Google Play account (legal declarations and agreements must be made by the account owner, not by a script).

## 0. Before you build
| Item | Status |
|---|---|
| Package name `com.aayme.b2b` (cannot change after first upload) | set in `app.json` |
| Icon 512x512, feature graphic 1024x500 | generated: `store/play-icon-512.png`, `store/feature-graphic-1024x500.png` |
| Privacy policy URL | served by the API at `https://amapi-sage.vercel.app/privacy` (live after you redeploy the backend) |
| Account-deletion URL (required because users can sign up) | `https://amapi-sage.vercel.app/account-deletion` |
| Cleartext (http) traffic | **off** for the `production` profile, on only for dev/preview builds |
| API address | `https://amapi-sage.vercel.app`, set per build profile in `eas.json` |

On the Vercel project set `COMPANY_NAME` and `SUPPORT_EMAIL` so those two pages name your business and a real contact address, then redeploy.
Have your own adviser read the privacy policy once: it is written from what the app really does, but it is not legal advice.

## 1. Build the Play bundle (AAB)
```
npm i -g eas-cli
eas login
eas init                                   # creates the EAS project id (also enables push notifications)
# the API address (https://amapi-sage.vercel.app) and EXPO_PUBLIC_REALTIME=off are already set in eas.json for preview and production
eas build --platform android --profile production
```
EAS creates and stores the upload keystore for you (accept the prompt). Download the `.aab` from the build page.
Play App Signing is on by default: Google re-signs the app for users, so your upload key can be reset if lost.

## 2. Create the app in Play Console  (YOU)
1. Play Console -> **Create app**: name `AAYME`, default language English (India), type *App*, *Free*. Accept the declarations.
2. Dashboard -> **Set up your app**, and complete each task:
   - **App access**: choose *All or some functionality is restricted* and give Google review accounts (see section 5). Without this the review fails.
   - **Ads**: No.
   - **Content rating**: category *Utility / Productivity*. Answer *No* to violence, sexual content, gambling, drugs. Answer *Yes* to "users can communicate with each other" (chat and support). Expect a "Rated for 3+/Everyone" style result.
   - **Target audience**: **18 and over** (a business app).
   - **Data safety**: use the table in section 4.
   - **Government / financial features**: the app only records payments made in UPI apps; it does not move money or offer loans. Declare *no financial services* features unless you add them.
   - **Privacy policy**: paste the `/privacy` URL. **Account deletion**: paste the `/account-deletion` URL.
   - **Store listing**: copy from section 3, upload the two images and 2-8 phone screenshots.

## 3. Store listing text
**App name (30):** `AAYME - B2B Ordering & Khata`
**Short description (80):** `Order from distributors, track khata and deliveries, all in one B2B app.`
**Full description:**
```
AAYME connects distributors, their delivery staff and retail shops on one app.

FOR RETAILERS
- See your main distributor's store first and switch to others from a dropdown
- Order with quantity pricing and GST, pay by UPI or cash on delivery
- Track every order, see your khata (credit) and bills, raise disputes and returns
- Get offers from your distributors, chat with them and contact support

FOR DISTRIBUTORS
- Manage products, stock, batches and expiry, price lists and special prices
- Accept orders (even partly), assign delivery staff, print GST invoices
- Track dues, send payment reminders, confirm UPI payments, record cash
- Add employees and retailers, send offers to all or selected retailers
- Reports, commission statements and a live business summary

FOR TEAMS
- Company staff onboard distributors; employees deliver and add retailers
- Field visits with shop location and QR check-in
- English and Hindi, fingerprint / face / PIN app lock

Your data is protected with encrypted connections and you can export or delete your account inside the app.
```
**Category:** Business. **Contact email:** your support address. **Website:** your site (optional).

## 4. Data safety answers
Collected data is **encrypted in transit: Yes**. **Users can request deletion: Yes** (in the app and at the deletion URL). Data is **not sold**. Sharing with service providers who process data for you (hosting, email, push) does not count as "sharing" in Google's form.

| Google category | Collected | Required or optional | Purpose |
|---|---|---|---|
| Personal info: name, email, phone number | Yes | Required (email optional for some roles) | Account management, app functionality |
| Personal info: address (shop / business address) | Yes | Optional for some roles | App functionality (invoices, store profile) |
| Financial info: user payment info (UPI id, bank details) | Yes (distributors) | Optional | App functionality (receiving payments) |
| Financial info: other (orders, invoices, khata entries) | Yes | Required | App functionality |
| Location: precise location | Yes | **Optional**, only when you save a shop location or record a visit; no background location | App functionality |
| Photos and videos: photos | Yes | Optional | App functionality (product pictures) |
| Files and docs | Yes | Optional | Support attachments |
| Messages: other in-app messages | Yes | Optional | App functionality (chat, support) |
| Device or other IDs (push token) | Yes | Optional | App functionality (notifications) |
| App activity / security logs (sign-in time, IP) | Yes | Required | Security, fraud prevention |

If you later add a crash reporter or analytics, add them here before the next release.

## 5. Review accounts (App access)
Create these in your **production** system and give the credentials in Play Console -> App access:
- one **retailer** (with at least one distributor linked and a few products visible),
- one **distributor** (subscription active, some products and one placed order).
Optionally an admin account if you want reviewers to see it. Keep the passwords simple and rotate them after review.

## 6. Create the beta track  (YOU)
Testing -> choose a track:
1. **Internal testing** (up to 100 testers, available within minutes): upload the AAB, add testers by email, share the opt-in link. Start here to confirm install, sign-in and ordering.
2. **Closed testing** (this is your "beta"): create a track, upload the AAB, add a tester list (email list or Google Group), roll out. Testers opt in through the link.
3. **Open testing**: anyone can join from the Play listing; needs the store listing and a review.

Releases need: release name (`1.0.0 (1)`), release notes, and a country list (India).
Note: personal developer accounts created recently must run a **closed test with at least 12 testers opted in for 14 days in a row** before they can apply for production access (organization accounts are exempt). Check the current requirement in Play Console -> Dashboard.

## 7. Updating the beta later
`eas build --platform android --profile production` (the version code increases automatically), then upload the new AAB to the same track.
To automate: create a Play service-account JSON key, save it outside the repo, set `submit.production.android.serviceAccountKeyPath` in `eas.json`, then `eas submit -p android --latest`. The first release must be uploaded by hand.

## 8. Common review rejections to avoid
- Review accounts missing or not working -> test them on a clean phone first.
- Privacy policy URL not public, or not mentioning location/camera -> the provided page covers both.
- App crashes at start because `EXPO_PUBLIC_API_URL` was not set for the production profile.
- The API unreachable or using http -> use https and keep the Vercel project awake (first request after idle is slow).
