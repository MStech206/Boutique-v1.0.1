import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";


// 🔥 Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAJeYt7PVEp0J8Y4MpDJcsw8KIXlhx5vUM",
    authDomain: "boutique-staff-app.firebaseapp.com",
    projectId: "boutique-staff-app",
    appId: "1:265096534234:web:95b0f82875938b41482de3",
};

// ✅ Prevent double-initialization (VERY important in React)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 🔐 Firebase Auth instance
export const auth = getAuth(app);

/**
 * ✅ Get Firebase ID token (Super Admin only)
 * - Auto refresh if expired
 * - Used by Axios interceptor
 */
export const getFirebaseToken = async () => {
    const user = auth.currentUser;

    if (!user) {
        console.warn("No Firebase user logged in");
        return null;
    }

    // Force refresh ensures custom claims are included
    return await user.getIdToken(true);
};

export default app;
