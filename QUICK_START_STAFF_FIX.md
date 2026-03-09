# 🚀 QUICK START - FIX DUPLICATE STAFF NOW

## 3 Simple Steps

### Step 1️⃣: Run the Fix Script (2 minutes)
```bash
FIX_DUPLICATE_STAFF.bat
```
This will:
- Remove duplicate staff
- Delete measuring/designing roles
- Clean up invalid workflow tasks
- Show you a summary of what was fixed

### Step 2️⃣: Restart the Server (1 minute)
```bash
RESTART_SERVER.bat
```
Or if that doesn't work:
```bash
node server.js
```

### Step 3️⃣: Verify the Fix (1 minute)

**In Staff Mobile App:**
- Open app
- Select a branch
- Click staff dropdown
- ✅ Should see only 1 staff per role
- ✅ No "measuring" or "designing" roles

**In Admin Panel:**
- Go to http://localhost:3000
- Login as admin
- Click "Staff" section
- ✅ Should see clean staff list
- ✅ No duplicate entries

**In Staff Portal:**
- Go to http://localhost:3000/staff
- Select branch
- ✅ Should see only 1 staff per role

---

## ✅ What Gets Fixed

| Before | After |
|--------|-------|
| ❌ 3 duplicate "Dyeing" staff | ✅ 1 Dyeing staff |
| ❌ 2 duplicate "Cutting" staff | ✅ 1 Cutting staff |
| ❌ "Measuring" staff shown | ✅ Measuring removed |
| ❌ "Designing" staff shown | ✅ Designing removed |
| ❌ Orders with invalid tasks | ✅ Clean orders |

---

## 🎯 Valid Staff Roles (After Fix)

Only these roles are allowed:
- Dyeing
- Cutting
- Stitching
- Khakha
- Maggam
- Painting
- Finishing
- Quality Check
- Delivery

❌ These are REMOVED:
- ~~Measuring~~
- ~~Designing~~
- ~~Measurements~~
- ~~Design Coordinator~~

---

## 📝 Notes

- **Backup**: Your data is NOT deleted, only cleaned
- **Safe**: Fix script only removes duplicates & invalid roles
- **Reversible**: Can run fix multiple times safely
- **Fast**: Usually completes in < 30 seconds

---

## ⚠️ If Something Goes Wrong

1. Make sure MongoDB is running:
   ```bash
   docker-compose ps
   ```

2. Check if port 3000 is already in use:
   ```bash
   KILL_PORT_3000.bat
   ```

3. Run the fix script again:
   ```bash
   FIX_DUPLICATE_STAFF.bat
   ```

4. Restart server:
   ```bash
   RESTART_SERVER.bat
   ```

---

## 🔁 Connect to Firebase (Firestore) — migration & setup

If you want Firestore to be the primary database (recommended), follow these steps to securely provide credentials and run the migration.

1) Provide credentials
- Preferred (CI / secure): set a GitHub secret named `GOOGLE_APPLICATION_CREDENTIALS_B64` containing the **base64-encoded** service-account JSON.
- Local dev (temporary): set the same environment variable in your shell or paste the JSON into `GOOGLE_APPLICATION_CREDENTIALS_JSON`.

2) Decode locally (helper)
- Run (PowerShell):
  ```powershell
  $env:GOOGLE_APPLICATION_CREDENTIALS_B64 = '<BASE64_STRING>'
  npm run decode:firebase-b64
  ```
- This writes `firebase-credentials.json` (0600) in the repo root for local testing.

3) Start Firestore emulator (recommended for testing)
- Install firebase-tools and run emulators:
  ```bash
  npm i -g firebase-tools
  FIRESTORE_EMULATOR_HOST=localhost:9000 GCLOUD_PROJECT=boutique-staff-app firebase emulators:start --only firestore,auth
  ```

4) Run the migration (idempotent)
- Full migration (branches, staff, orders, users):
  ```bash
  npm run migrate:firestore
  ```
- Or run partial migration:
  ```bash
  node scripts/migrate_mongo_to_firestore.js --collections=branches,staff
  ```

5) Verify & run E2E
- Locally: `node scripts/e2e-verify-all.js`
- On CI: set `GOOGLE_APPLICATION_CREDENTIALS_B64` as a repository secret and the `E2E (Firestore Emulator)` workflow will run automatically.

Notes
- The repo now supports `GOOGLE_APPLICATION_CREDENTIALS_B64` and prefers Firestore for key read endpoints (with Mongo fallback).
- Migration is idempotent — safe to re-run. Remove `firebase-credentials.json` after local testing to keep secrets off disk.


---

## 🎉 Done!

That's it! Your duplicate staff issue is fixed. The system will now:
- ✅ Show only 1 staff per role in each branch
- ✅ Remove measuring and designing from all workflows
- ✅ Prevent new duplicates from being created
- ✅ Keep all data consistent across apps

Enjoy! 🚀
