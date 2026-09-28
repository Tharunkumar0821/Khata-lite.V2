# Khata Lite (Android, React Native + Expo)

A Khatabook-style ledger: customers and suppliers, "You gave" / "You got" entries,
running balances, cashbook, WhatsApp reminders, statement sharing, dark mode,
backup and restore. All data is stored on the phone (AsyncStorage).

## Run it (about 5 minutes)

Requires Node.js (current LTS) and the **Expo Go** app from the Play Store.

1. Create a fresh Expo project (this picks the newest SDK that Expo Go supports):

       npx create-expo-app@latest khata-lite --template blank
       cd khata-lite

2. Install the libraries the app uses:

       npx expo install @react-native-async-storage/async-storage react-native-safe-area-context expo-image-picker expo-sharing expo-file-system @react-native-community/datetimepicker xlsx expo-contacts firebase

3. Copy `App.js` and the `src/` folder from this zip into the project.
   Overwrite the existing `App.js`.

4. Start it:

       npx expo start

   Scan the QR code with Expo Go on your Android phone (same Wi-Fi).
   To use an emulator instead, press `a` in the terminal.

## Build an installable APK

1. In `app.json`, add inside `"expo"`:

       "android": { "package": "com.yourname.khatalite" }

2. Run:

       npx eas-cli login
       npx eas-cli build:configure
       npx eas-cli build -p android --profile preview

   The `preview` profile produces an `.apk` you can download and install directly.
   For the Play Store, use `--profile production` (an `.aab` bundle).

## Project layout

    App.js                     navigation state, back button, sheets
    src/store.js               AsyncStorage-backed data + actions
    src/utils.js               money format (Indian grouping), dates, statements
    src/theme.js               light and dark colors
    src/screens/               Home (parties), Ledger, Cashbook
    src/components/            shared UI and bottom sheets

## Bill photos and WhatsApp

In the entry form, tap "Take photo" or "Gallery" to attach a bill. A thumbnail shows on the
entry in the ledger; tap it to view the bill full screen, then tap "Send bill" and choose
WhatsApp in the share sheet. Photos are stored on the phone (not inside the backup text).
After adding these libraries you must build a NEW APK for the feature to work in the installed app.

## Sending the bill photo + text to WhatsApp directly

"Share statement" and "Send bill" now open WhatsApp directly (with the caption and,
if there is one, the bill photo attached) using the party's saved phone number — no
contact picker needed. If no phone number is saved, it falls back to a normal share
sheet where you pick WhatsApp and the contact yourself.

This uses `react-native-share`, a native module, so it **will not work inside plain
Expo Go**. You need a one-time "development build" instead:

1. Install the library:

       npx expo install react-native-share

2. Build a development client (same command family as before, different profile):

       npx eas-cli build -p android --profile development

   If `eas.json` has no `development` profile yet, run `npx eas-cli build:configure`
   first, or add this block under `"build"`:

       "development": {
         "developmentClient": true,
         "distribution": "internal",
         "android": { "buildType": "apk" }
       }

3. Install that APK on your phone once, the same way as the preview APK.

4. From then on, run `npx expo start --dev-client` instead of `npx expo start`.
   Open the app you just installed (not Expo Go) — it connects to your Metro
   server the same way, and edits in VS Code still live-reload normally.

5. For the version you actually hand out / keep using day to day, build the
   `preview` profile as before — it already includes `react-native-share` once
   the package is installed, no separate steps needed there.

## Calendar date picker

The date field in the entry form now opens the phone's native calendar picker
instead of typed text — tap the date to change it, or use the Today / Yesterday
shortcuts. Uses `@react-native-community/datetimepicker`, which works fine
inside plain Expo Go (no development build needed for this one).

## Export to Excel

Settings, then "Export to Excel" creates an `.xlsx` file for the current business
(one sheet of parties with balances, one sheet of every entry, including bill and
invoice numbers) and opens the share sheet so you can send it by WhatsApp, email,
or save it to Drive. Uses the `xlsx` package plus `expo-file-system` — both are
pure JavaScript / already-installed modules, so this also works inside plain
Expo Go, no development build needed.

## Bill No. and Invoice No. (suppliers)

When you open "You gave" / "You got" for a **supplier**, two extra fields appear:
Bill No. and Invoice No. Both are optional and show up in the ledger entry and in
the Excel export. These fields are hidden for customer entries to keep that form
short; if you'd like them for customers too, tell me and I'll change the condition
in `src/components/Sheets.js`.

## Multiple businesses

Tap the switch icon (⇄) next to the business name, or Settings, then
"Businesses", to see all your businesses, switch between them, rename one, add a
new one, or delete one (you must always keep at least one). Each business has its
own separate parties, entries, and totals — nothing is shared between them.
Backup and restore (in Settings) saves and restores *all* businesses at once.

If you're upgrading from an earlier version of the app, your existing data is
kept automatically as your first business the first time you open the new build.


## Pick from contacts

When adding a new customer or supplier, tap "Pick from contacts" to open the
phone's own contact picker and fill in the name and number automatically. This
uses `expo-contacts`' picker mode, which works in plain Expo Go with no extra
setup, and does not need a "read all contacts" permission — the phone shows its
normal contact-picker screen and only hands back the one contact chosen.


## Multi-device sync (Firebase)

Lets two or more phones share the same data automatically. One phone creates a
6-character sync code; any other phone enters that code to link up. From then
on, changes on either phone appear on the other within a second or two,
whenever both have internet.

### One-time setup (you do this once, in a browser)

1. Go to https://console.firebase.google.com, sign in with any Google account,
   and click **Add project**. Name it anything (e.g. "khata-lite"). You can
   turn off Google Analytics for it — not needed here.
2. In the project, go to **Build → Firestore Database**, click **Create
   database**, and choose **Start in production mode**. Pick any location.
3. Go to the **Rules** tab of Firestore and replace the contents with:

       rules_version = '2';
       service cloud.firestore {
         match /databases/{database}/documents {
           match /khataSync/{code} {
             allow read, write: if request.auth != null;
           }
         }
       }

   Click **Publish**. This means: anyone signed in (even anonymously) AND who
   knows the exact sync code can read/write that one code's data — the same
   trust model as a shared link. Codes are random 6-character strings from a
   32-character set (about 1 billion combinations), so guessing one isn't
   realistic, but don't post a code publicly.
4. Go to **Build → Authentication**, click **Get started**, and enable the
   **Anonymous** sign-in provider (in the "Sign-in method" tab). This is what
   lets the app connect without asking your customers to make an account.
5. Go to **Project settings** (the gear icon), scroll to **Your apps**, click
   the **</>** (web) icon to register a new app (any nickname is fine, and you
   don't need Firebase Hosting). It will show you a `firebaseConfig` object.
6. Open `src/sync.js` in this project and replace the placeholder
   `firebaseConfig` object near the top with the one Firebase just gave you.

### Using it in the app

Settings → **Multi-device sync**:
- On the first phone, tap **Turn on sync**. It shows a 6-character code.
- On the second phone, tap **I have a code from another phone**, enter that
  code, and confirm. This **replaces everything currently on that phone** with
  the first phone's data, so do this before entering real data on the second
  phone, or back it up first.
- After that, both phones stay in sync automatically. **Turn off sync** on a
  phone just stops that one phone from syncing — its local data stays put.

### Things worth knowing

- This works in plain Expo Go — Firebase's JavaScript SDK is pure JS, no
  native module needed.
- If two phones edit the exact same thing at the exact same moment, whichever
  save reaches the server last wins for that piece of data. Fine for a
  business run from a couple of phones; not built for many simultaneous
  editors.
- Bill photos are stored on each phone individually and are **not** synced —
  only the text data (parties, entries, businesses) is. A photo taken on phone
  A won't appear on phone B.
- If a phone is offline, its edits stay saved locally and go out automatically
  once it reconnects.

## Redesigned party ledger ("Report" style)

The party ledger screen (opened by tapping a customer or supplier) now matches
Khatabook's own "Report" layout:

- Start date / End date pickers to narrow the entries shown
- Search box plus an ALL / You Gave / You Got filter dropdown
- A Net Balance summary, and Total / You Gave / You Got totals
- Each entry shows its date, running balance, note, and bill/invoice number,
  with the amount in the "You gave" (red) or "You got" (green) column
- Download and Share buttons at the bottom (both currently share the filtered
  statement as text — say if you'd like a real PDF export instead, that's a
  bigger follow-up since it needs a PDF-generation library)
- Two small round buttons above Download/Share still let you add a "You gave"
  or "You got" entry, and a call button appears if the party has a phone number

No new libraries needed for this — it reuses the date picker already installed
for entries.

## Building via GitHub Actions (free, no Android Studio, no EAS quota)

This project includes `.github/workflows/build-android.yml`, which builds a
debug APK on GitHub's own free servers whenever you push, or whenever you
trigger it manually.

1. Create a free account at github.com if you don't have one.
2. Create a new, empty repository (any name, e.g. `khata-lite`).
3. Install **GitHub Desktop** (desktop.github.com) — this avoids needing to
   install the separate `git` command-line tool. Sign in with your GitHub
   account.
4. In GitHub Desktop: File, then "Add local repository", and choose your
   `khata-lite` project folder. If it says the folder isn't a repository yet,
   choose "create a repository" instead.
5. Click "Publish repository" to push it to GitHub (make sure the repository
   name matches the empty one you created, or just let it create a new one).
6. On GitHub.com, open your repository, click the **Actions** tab. You should
   see "Build Android APK" listed. Click it, then click **Run workflow**.
7. Wait about 10–15 minutes. When it finishes (green checkmark), click into
   that run, scroll to **Artifacts**, and download `khata-lite-apk` — it's a
   zip containing `app-debug.apk`.
8. Copy that APK to your phone and install it as usual.

Every time you make code changes, use GitHub Desktop to commit and push
again ("Publish" becomes "Push origin" after the first time), then re-run the
workflow from the Actions tab to get an updated APK.

This produces a **debug** build, which installs and runs perfectly for your
own use. If you later want a proper signed **release** build (smaller, meant
for wider distribution), tell me and I'll extend the workflow to do that too
— it needs a signing keystore stored as a GitHub secret.

## Multiple bill photos per entry

Each "You gave" / "You got" entry can now have several bill photos attached,
not just one. Take or pick as many as you need in the entry form — each shows
as a small thumbnail with its own Remove button. In the ledger, tapping "View
bills" opens a full-screen viewer you can swipe through (< / > arrows) with a
photo counter. Sending to WhatsApp with a saved phone number sends the current
photo; without a saved number, all photos attach together in the normal share
sheet.

If you're upgrading from an earlier version, any single photo already saved
on an entry is kept automatically as that entry's one bill photo.

## Separate customer / supplier totals

The "You'll get" / "You'll give" summary on the Parties screen now reflects
only the tab you're viewing — switch between Customers and Suppliers to see
each group's own totals, rather than one number blended across both.

## Alphabetical sorting

Customers and suppliers are now listed alphabetically by name (A–Z) instead
of by balance size.
