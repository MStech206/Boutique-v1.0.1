Summary — MongoDB → Firestore sync

What this does
- `sync-to-firebase.js` reads core collections from MongoDB (branches, staff, orders, users) and writes them to Firestore.

Pre-requirements
- A Firebase service account JSON with project-level permissions (Firestore write).
- Place the file at: `Boutique-app/super-admin-backend/src/main/resources/firebase/super-admin-auth.json`
  - Or set `GOOGLE_APPLICATION_CREDENTIALS` to the service-account JSON path before running.
- Ensure the Node process can connect to your MongoDB (the repository already uses the existing `connectDB()` helper).

How to run
1. Add your Firebase service account JSON (do NOT paste credentials into chat).
2. From repo root run:
   - npm run sync-firebase

Notes
- The sync script is idempotent and uses Firestore `set(..., { merge: true })`.
- The script keeps only basic fields and converts dates to Firestore timestamps.
- If you want me to run the sync here, provide a service-account JSON securely or run the command locally and paste the output.

Security
- Do NOT share Firebase service-account JSON in public chat. Use environment variables or copy the file into the repo locally.
