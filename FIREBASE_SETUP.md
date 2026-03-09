# Firebase Migration Setup

## Prerequisites

1. **Firebase Project Setup**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Login with: mstechno2323@gmail.com / superadmin@123
   - Create new project or use existing one

2. **Download Service Account Key**
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save as `firebase-service-account.json` in this directory

3. **Install Dependencies**
   ```bash
   npm install firebase-admin mongodb
   ```

## Migration Steps

1. **Update Firebase Config**
   - Edit `migrate-to-firebase.js`
   - Replace placeholder values with your Firebase project details

2. **Run Migration**
   ```bash
   node migrate-to-firebase.js
   ```

3. **Verify Migration**
   - Check Firebase Console > Firestore Database
   - Verify all collections and documents

## Firebase Project Configuration

```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com", 
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Collections to Migrate

- ✅ orders
- ✅ customers  
- ✅ staff
- ✅ branches
- ✅ tasks
- ✅ users

## Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin access
    match /{document=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
    
    // Staff access to their tasks
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.assignedTo;
    }
    
    // Public read access to branches
    match /branches/{branchId} {
      allow read: if true;
    }
  }
}
```

## Next Steps After Migration

1. Update backend API endpoints to use Firebase
2. Update authentication to use Firebase Auth
3. Test all functionality with Firebase data
4. Update mobile app to use Firebase SDK
5. Set up Firebase hosting for admin panel