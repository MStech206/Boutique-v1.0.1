# SAPTHALA Boutique - Duplicate Fix & Firebase Sync Guide

## Issues Fixed

### 1. Duplicate Staff in Dropdowns ✅
- Fixed staff API endpoint to return only unique staff members
- Uses MongoDB aggregation to group by staffId
- Prevents duplicate entries in staff portal, admin panel, and mobile app

### 2. Duplicate Branches ✅
- Fixed branch creation logic to check for existing branches
- Prevents duplicate branch entries in database

### 3. Firebase Sync ✅
- Created sync script to push MongoDB data to Firebase Firestore
- Syncs: Branches, Staff, Orders, Users (Admins)
- Maintains data consistency across platforms

## Quick Fix (Recommended)

Run the automated fix script:

```bash
FIX_ALL.bat
```

This will:
1. Remove all duplicate staff and branches from MongoDB
2. Sync clean data to Firebase Firestore
3. Display summary of changes

## Manual Fix (Step by Step)

### Step 1: Fix Duplicates in MongoDB

```bash
node fix-duplicates.js
```

**What it does:**
- Scans MongoDB for duplicate branches (by branchId)
- Scans MongoDB for duplicate staff (by staffId)
- Keeps the oldest entry, removes duplicates
- Shows summary of removed entries

### Step 2: Sync to Firebase

```bash
node sync-to-firebase.js
```

**What it does:**
- Connects to Firebase using service account credentials
- Syncs unique branches to `branches` collection
- Syncs unique staff to `staff` collection
- Syncs recent orders to `orders` collection
- Syncs admin users to `users` collection

**Firebase Credentials Location:**
```
Boutique-app/super-admin-backend/src/main/resources/firebase/super-admin-auth.json
```

### Step 3: Restart Server

```bash
node server.js
```

Or use:
```bash
RESTART_SERVER.bat
```

## Verification

### Check Staff Dropdown
1. Open staff portal: http://localhost:3000/staff
2. Select a branch
3. Verify staff dropdown shows unique entries only

### Check Admin Panel
1. Open admin panel: http://localhost:3000
2. Login with admin credentials
3. Check branch dropdown - should show unique branches
4. Check staff management - should show unique staff

### Check Firebase Console
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check collections:
   - `branches` - should have unique branch documents
   - `staff` - should have unique staff documents
   - `orders` - should have recent orders
   - `users` - should have admin users

## Files Modified

### 1. database.js
- Fixed branch creation to check for existing branches
- Fixed staff creation to use unique staffId check
- Updated logo path to `img/sapthala logo.png`

### 2. server.js
- Updated `/api/staff` endpoint to return unique staff using aggregation
- Prevents duplicate staff in API responses

### 3. staff-portal.html
- Updated logo to use proper `<img>` tag
- Logo displays correctly at top of login page

## New Files Created

1. **fix-duplicates.js** - Removes duplicate staff and branches
2. **sync-to-firebase.js** - Syncs MongoDB data to Firebase
3. **FIX_ALL.bat** - Automated fix script (runs both above)
4. **cleanup-duplicates.js** - Alternative cleanup script

## Database Structure

### MongoDB Collections
- `branches` - Unique branches by branchId
- `staff` - Unique staff by staffId
- `orders` - Customer orders
- `users` - Admin and sub-admin users

### Firebase Collections
- `branches` - Synced from MongoDB
- `staff` - Synced from MongoDB
- `orders` - Synced from MongoDB
- `users` - Synced from MongoDB

## Troubleshooting

### Issue: Firebase sync fails
**Solution:** Check Firebase credentials file exists:
```
Boutique-app/super-admin-backend/src/main/resources/firebase/super-admin-auth.json
```

### Issue: Still seeing duplicates
**Solution:** 
1. Run `fix-duplicates.js` again
2. Clear browser cache
3. Restart server

### Issue: Staff dropdown empty
**Solution:**
1. Check MongoDB has staff entries: `db.staff.count()`
2. Run database initialization: `node server.js` (will auto-initialize)
3. Check branch filter is correct

## Branch Structure

Current branches:
- **SAPTHALA.MAIN** - Main (Head Office)
- **SAPTHALA.JNTU** - JNTU Branch
- **SAPTHALA.KPHB** - KPHB Branch
- **SAPTHALA.ECIL** - ECIL Branch

Each branch has staff for workflow stages:
- Dyeing
- Finishing
- Quality Check
- Ready to Deliver

## Staff ID Format

Format: `{BRANCH_ID}_{STAGE_ID}`

Examples:
- `SAPTHALA_MAIN_dyeing`
- `SAPTHALA_JNTU_finishing`
- `SAPTHALA_KPHB_quality-check`

## Support

For issues or questions:
- Email: sapthalaredddydesigns@gmail.com
- Phone: 7794021608

## Version

- Last Updated: 2024
- MongoDB: 5.x+
- Firebase: Admin SDK 11.x+
- Node.js: 16.x+
