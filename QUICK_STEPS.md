# 🚀 QUICK STEPS - FIREBASE MIGRATION

## ⚡ 5 SIMPLE STEPS

### Step 1️⃣: Get Firebase Key
```
Go to: https://console.firebase.google.com
Login: mstechno2323@gmail.com
Project: boutique-staff-app
Settings → Service Accounts → Generate New Private Key
Save as: firebase-credentials.json
Place in: D:\Boutique 1 issue\Boutique\
```

### Step 2️⃣: Install Packages
```bash
npm install firebase-admin mongoose cors
```

### Step 3️⃣: Create migrate.js
Create file: `migrate.js` in project folder
(Copy code from MIGRATION_SIMPLE_GUIDE.md - Step 3)

### Step 4️⃣: Run Migration
```bash
node migrate.js
```

### Step 5️⃣: Verify
- Go to: https://console.firebase.google.com
- Check: boutique-staff-app → Firestore Database
- Should see: branches, staff, users collections
- ✅ Done!

---

## ⏱️ Time: ~5 minutes

---

## 📱 Commands Quick Ref

```bash
# Install dependencies
npm install firebase-admin mongoose cors

# Run migration
node migrate.js

# Check Node version
node --version

# Check npm version
npm --version
```

---

## ✅ Success Indicators

✅ "MIGRATION COMPLETE!" message  
✅ Firebase Console shows collections  
✅ Admin panel shows data (not 0)  
✅ No error messages  

---

**Questions?** → Read: MIGRATION_SIMPLE_GUIDE.md
